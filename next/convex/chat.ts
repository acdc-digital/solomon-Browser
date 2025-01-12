// chat.ts
// /Users/matthewsimon/Documents/Github/solomon-electron/next/convex/chat.ts

import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from "openai";
import { Id } from "./_generated/dataModel";

import {
  ChatCompletionMessageToolCall,
  ChatCompletionTool,
} from "openai/resources/chat/completions";

// Define interfaces
interface SerializedChunk {
  _id: string;
  projectId: Id<"projects">;
  pageContent: string;
  metadata: Record<string, any>;
  embedding: number[] | null;
  chunkNumber: number | null;
}

interface HandleUserActionResponse {
  response: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure your API key is set in environment variables
});

// -----------------------------
// Helper: Summarize a chunk if it's too large
// -----------------------------
async function summarizeChunk(chunkText: string): Promise<string> {
  if (chunkText.length < 500) {
    return chunkText;
  }

  const systemPrompt = `
    You are a helpful assistant. Please provide a concise summary of the following text:
  `.trim();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: chunkText },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}

// -------------------------------------------------------------
// Combined Search Helper
// -------------------------------------------------------------
async function combinedSearchChunks(
  ctx: any,
  message: string,
  projectId: Id<"projects">,
  topK: number
): Promise<SerializedChunk[]> {
  const embeddingResults: SerializedChunk[] = await ctx.runAction(
    api.search.getSimilarChunks,
    { query: message, projectId, topK }
  );

  const textSearchResults = await ctx.db
    .query("chunks")
    .withSearchIndex("search_pageContent", (q: any) =>
      q.search("pageContent", message).eq("projectId", projectId)
    )
    .take(topK);

  const combined = [...embeddingResults, ...textSearchResults];
  return deduplicateChunksById(combined).slice(0, topK);
}

function deduplicateChunksById(docs: SerializedChunk[]): SerializedChunk[] {
  const seen = new Set<string>();
  const out: SerializedChunk[] = [];
  for (const d of docs) {
    if (!seen.has(d._id)) {
      out.push(d);
      seen.add(d._id);
    }
  }
  return out;
}

// -----------------------------
// Mutation to insert chat entries
// -----------------------------
export const insertEntry = mutation({
  args: {
    input: v.string(),
    response: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, { input, response, projectId }) => {
    await ctx.db.insert("chat", { input, response, projectId });
  },
});

// -----------------------------
// Query to get all chat entries for a project
// -----------------------------
export const getAllEntries = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const entries = await ctx.db
      .query("chat")
      .withIndex("by_project", (q: any) => q.eq("projectId", projectId))
      .collect();

    return entries.map(entry => ({
      _id: entry._id.toString(),
      input: entry.input,
      response: entry.response,
      projectId: entry.projectId as Id<"projects">,
    }));
  },
});

// -----------------------------
// Query to get last 'n' chat entries
// -----------------------------
export const getLastNChatMessages = query({
  args: { projectId: v.id("projects"), n: v.number() },
  handler: async (ctx, { projectId, n }) => {
    const messages = await ctx.db
      .query("chat")
      .withIndex("by_project", (q: any) => q.eq("projectId", projectId))
      .order("desc")
      .take(n);

    // Reverse so oldest is first
    return messages.reverse();
  },
});

// -----------------------------
// Action to handle user messages
// using the new "tools" approach
// -----------------------------
export const handleUserAction = action({
  args: { message: v.string(), projectId: v.id("projects") },
  handler: async (ctx, { message, projectId }): Promise<HandleUserActionResponse> => {
    try {
      // 1) Fetch doc content
      const { content: docContent } = await ctx.runQuery(api.projects.getDocumentContent, {
        documentId: projectId,
      });

      // 2) Retrieve chunk data
      const results: SerializedChunk[] = await ctx.runAction(api.search.combinedSearchChunks, {
        query: message,
        projectId,
        topK: 20,
      });

      // Summarize each chunk
      const contextPromises = results.map(async (chunk) => {
        const { pageNumber, keywords, entities } = chunk.metadata || {};
        const summary = await summarizeChunk(chunk.pageContent);
        return `
          [Chunk ID: ${chunk._id}]
          Page: ${pageNumber ?? "?"}
          Keywords: ${keywords?.length ? keywords.join(", ") : "None"}
          Entities: ${entities?.length ? entities.join(", ") : "None"}

          ${summary}
        `.trim();
      });
      const contextArray = await Promise.all(contextPromises);
      const chunkContextText = contextArray.join("\n\n");

      // 3) Fetch last N messages for short-term memory
      const recentMessages = await ctx.runQuery(api.chat.getLastNChatMessages, {
        projectId,
        n: 10,
      });

      // Convert them to an array for the Chat API
      type ChatCompletionMessageParam = {
        role: "system" | "user" | "assistant";
        content: string;
      };

      const conversationMessages: ChatCompletionMessageParam[] = [];
      for (const msg of recentMessages) {
        // user
        conversationMessages.push({
          role: "user",
          content: msg.input,
        });
        // assistant
        if (msg.response) {
          conversationMessages.push({
            role: "assistant",
            content: msg.response,
          });
        }
      }

      // 4) System prompt
      const systemPrompt =
      `
      You are a helpful assistant. Always respond in JSON:
      {
        "markdownResponse": "string with your final answer in markdown",
        "references": []
      }
      ---
      **User's Document Content**:
      ${docContent}

      **Chunk-Based Context**:
      ${chunkContextText}

      **Recent Chat History**:
      ${JSON.stringify(
      recentMessages.map(({ input, response }) => ({ user: input, assistant: response })),
      null,
      2
     )}

     ### Instructions for "markdownResponse":

      - Start with a heading (e.g. "## Overview" or "## Key Points").
      - Use bullet points for lists or short statements.
      - Use **bold** or _italics_ for emphasis, if relevant.
      - Include footnotes by placing [^1], [^2], etc. in the text. Then populate "references" array with the chunk ID, page, and footnote label.

      ### Example
      {
        "markdownResponse": "## The Author's Family\\n\\n**Key Observations:**\\n- The author is facing major health issues with their son [^1]\\n\\n[^1]: Page 237, Chunk ID: xxxxxx",
        "references": [
          { "chunkID": "xxxxxx", "page": 237, "footnote": "[^1]" }
        ]
      }

      (That's your format. Provide similar structure in your final output.)
      `
      .trim();

      // 5) Define the single tool in a type-safe manner
      const tools: ChatCompletionTool[] = [
        {
          type: "function",  // must be "function"
          function: {
            name: "formatResponse",  // The function's name
            description: "Return your final answer in valid Markdown with headings, bullet points, bold text, and footnotes for references. For headings, use `##` or `###`. For bullet lists, use `- item`. At the bottom, if needed, list footnotes.",
            parameters: {
              type: "object",
              properties: {
                markdownResponse: {
                  type: "string",
                  description: "Markdown string to display as the primary answer",
                },
                references: {
                  type: "array",
                  description: "List of footnote references used in the answer",
                  items: {
                    type: "object",
                    properties: {
                      chunkID: {
                        type: "string",
                        description: "Unique chunk ID from chunk-based context",
                      },
                      page: {
                        type: "number",
                        description: "Page number if available",
                      },
                      footnote: {
                        type: "string",
                        description: "The inline footnote marker used, e.g. [^1]",
                      },
                    },
                    required: ["chunkID", "page", "footnote"],
                  },
                },
              },
              required: ["markdownResponse", "references"],
            },
          },
        },
      ];

      // Build the message array
      const openAiMessages: ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...conversationMessages,
        { role: "user", content: message },
      ];

      // 6) Call OpenAI with the new "tools" array
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // or other OpenAI models
        messages: openAiMessages,
        tools, // typed as ChatCompletionTool[]
        temperature: 0.7,
      });

      // 7) If the model calls the function, we see it in the .tool_calls array
      const answer = completion.choices[0]?.message;
      if (!answer) {
        throw new Error("No response from model.");
      }

      if (answer.tool_calls && answer.tool_calls.length > 0) {
        // Typically only one call if parallel_tool_calls = false
        const call: ChatCompletionMessageToolCall = answer.tool_calls[0];
        if (call.function?.name === "formatResponse") {
          // parse JSON
          interface FormatResponseResult {
            markdownResponse: string;
            references: Array<{ chunkID: string; page: number; footnote: string }>;
          }

          const rawArgs = call.function.arguments || "{}";
          const parsed = JSON.parse(rawArgs) as FormatResponseResult;

          // Store final markdown in DB
          await ctx.runMutation(api.chat.insertEntry, {
            input: message,
            response: parsed.markdownResponse,
            projectId,
          });

          return { response: parsed.markdownResponse };
        } else {
          // Some other function was called
          const fallbackText = `Model called unexpected tool: ${call.function?.name}`;
          await ctx.runMutation(api.chat.insertEntry, {
            input: message,
            response: fallbackText,
            projectId,
          });
          return { response: fallbackText };
        }
      } else {
        // No tool calls => direct assistant message
        const fallbackText = answer.content ?? "No tool calls, direct answer unavailable.";
        await ctx.runMutation(api.chat.insertEntry, {
          input: message,
          response: fallbackText,
          projectId,
        });
        return { response: fallbackText };
      }

    } catch (error: any) {
      console.error("Error in handleUserAction:", error);
      throw new Error("Failed to handle user action.");
    }
  },
});

// End of file
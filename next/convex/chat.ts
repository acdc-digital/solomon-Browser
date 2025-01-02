// Chat.ts
// /Users/matthewsimon/Documents/Github/solomon-electron/next/convex/chat.ts

import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from "openai";
import { Id } from "./_generated/dataModel"; // Import Id type

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
  // If the chunk is short, just return it as-is.
  if (chunkText.length < 500) {
    return chunkText;
  }

  // Otherwise, call OpenAI to summarize it:
  const systemPrompt = `
    You are a helpful assistant. Please provide a concise summary of the following text:
  `.trim();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: chunkText },
    ],
    // You can experiment with temperature, maxTokens, etc.
  });

  const summary = completion.choices[0].message?.content ?? "";
  return summary;
}

// -------------------------------------------------------------
// Combined Search Helper
// -------------------------------------------------------------
/**
 * Merges results from:
 * 1) Vector-based search via `getSimilarChunks`
 * 2) Full-text search using Convex's search index
 */
async function combinedSearchChunks(
  ctx: any,
  message: string,
  projectId: Id<"projects">,
  topK: number
): Promise<SerializedChunk[]> {
  // 1) Vector-based results from existing getSimilarChunks
  const embeddingResults: SerializedChunk[] = await ctx.runAction(
    api.search.getSimilarChunks,
    { query: message, projectId, topK }
  );

  // 2) Full-text search results
  // Ensure your schema uses searchIndex("search_pageContent", { ... }) on the "chunks" table
  const textSearchResults = await ctx.db
    .query("chunks")
    .withSearchIndex("search_pageContent", (q: any) =>
      q.search("pageContent", message).eq("projectId", projectId)
    )
    .take(topK); // Take topK, results come in descending relevance order

  // 3) Merge and deduplicate by _id
  const combined = [...embeddingResults, ...textSearchResults];
  const uniqueResults = deduplicateChunksById(combined);

  // 4) Optional: Re-rank or slice if you want to limit to topK overall
  // For simplicity, we just slice:
  return uniqueResults.slice(0, topK);
}

/** Utility to remove duplicates by _id */
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
  handler: async (
    ctx,
    { input, response, projectId }: { input: string; response: string; projectId: Id<"projects"> }
  ) => {
    await ctx.db.insert("chat", {
      input,
      response,
      projectId,
    });
  },
});

// -----------------------------
// Query to get all chat entries for a project
// -----------------------------
export const getAllEntries = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (
    ctx,
    { projectId }: { projectId: Id<"projects"> }
  ): Promise<{ _id: string; input: string; response: string; projectId: Id<"projects"> }[]> => {
    const entries = await ctx.db
      .query("chat")
      .withIndex("by_project", (q: any) => q.eq("projectId", projectId))
      .collect();

    // Transform entries to match the expected return type
    return entries.map(entry => ({
      _id: entry._id.toString(), // Convert Id<"chat"> to string
      input: entry.input,
      response: entry.response,
      projectId: entry.projectId as Id<"projects">, // Ensure projectId is present and correctly typed
    }));
  },
});

// -----------------------------
// Action to handle user messages
// Enhanced Action with Summaries + Metadata + Combined Search
// -----------------------------
// chat.ts
export const handleUserAction = action({
  args: {
    message: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, { message, projectId }): Promise<HandleUserActionResponse> => {
    try {
      // Step 0: Fetch the "document content" from the DB
      const { content: docContent } = await ctx.runQuery(api.projects.getDocumentContent, {
        documentId: projectId,
      });

      // (Optional) Summarize or trim docContent if it's very large:
      // const docContentShort = docContent.length > 1000
      //   ? await summarizeChunk(docContent)
      //   : docContent;

      // Step 1: Retrieve chunks from both embeddings + text search
      const results: SerializedChunk[] = await ctx.runAction(api.search.combinedSearchChunks, {
        query: message,
        projectId,
        topK: 10,
      });

      console.log("Combined (embedding + text) Results:", results);

      // Step 2: Summarize and combine chunk content + metadata
      const contextPromises = results.map(async (chunk) => {
        const { pageNumber, docTitle, docAuthor, headings } = chunk.metadata || {};
        const possiblySummarized = await summarizeChunk(chunk.pageContent);

        return `
        [Chunk ID: ${chunk._id}]
        Page ${pageNumber || "?"} | Title: ${docTitle || "Untitled"} | Author: ${docAuthor || "Unknown"}
        Headings: ${headings?.join(", ") || "None"}
        ---
        ${possiblySummarized}
        `.trim();
      });

      const contextArray = await Promise.all(contextPromises);
      const chunkContextText = contextArray.join("\n\n");

      // Step 3: Construct the prompt for OpenAI with BOTH:
      //   1. The single-document content from getDocumentContent
      //   2. The chunk-based context
      const systemPrompt = `
      You are a helpful assistant. The user asked: "${message}"

      Here is additional context provided by the User:
      ${docContent}

      Below is chunk-based context from relevant documents (with headings/metadata):
      ${chunkContextText}

      Instructions:
      1) Provide an answer based on the context if relevant.
      2) If the context is insufficient, indicate that you lack enough info.
      3) Cite relevant chunk IDs or page numbers if referencing specific text.
      `.trim();

      console.log("System Prompt for OpenAI:", systemPrompt);

      // Step 4: Call OpenAI's Chat Completion API
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
      });

      // Step 5: Extract the response from OpenAI
      const response: string = completion.choices[0].message?.content ?? "";
      console.log("OpenAI Response:", response);

      // Step 6: Insert the chat entry into the database
      await ctx.runMutation(api.chat.insertEntry, {
        input: message,
        response,
        projectId,
      });

      // Step 7: Return only the OpenAI response
      return { response };
    } catch (error: any) {
      console.error("Error in handleUserAction:", error);
      throw new Error("Failed to handle user action.");
    }
  },
});

// End of file
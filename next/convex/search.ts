// /Users/matthewsimon/Documents/Github/solomon-electron/next/convex/search.ts
// Search.ts

// 	Embedding Generation: Uses OpenAI’s text-embedding-ada-002 model to generate an embedding for the user query.
//  Vector Search: Utilizes Convex’s vectorSearch method on the chunks table’s byEmbedding index to find the top K similar chunks.
//  Filtering: Ensures that only chunks related to the specified projectId are retrieved.

// convex/search.ts

import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import OpenAI from "openai";
import { api, internal } from "./_generated/api"; // Import both api and internal

// Define the SerializedChunk interface
interface SerializedChunk {
  _id: string;
  projectId: Id<"projects">;
  pageContent: string;
  metadata: Record<string, any>;
  embedding: number[] | null;
  chunkNumber: number | null;
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the internal query to fetch chunks by IDs
export const fetchChunks = internalQuery({
  args: { ids: v.array(v.id("chunks")) },
  handler: async (ctx, args) => {
    const { ids } = args;
    const results: SerializedChunk[] = [];

    for (const id of ids) {
      const chunk = await ctx.db.get(id);
      if (chunk) {
        results.push({
          _id: chunk._id.toString(),
          projectId: chunk.projectId as Id<"projects">,
          pageContent: chunk.pageContent,
          metadata: chunk.metadata || {},
          embedding: chunk.embedding || null,
          chunkNumber: chunk.chunkNumber || null,
        });
      }
    }

    return results;
  },
});

/**
 * Action to search for similar chunks based on a user query and generate a response.
 */
export const searchChunks = action({
  args: {
    query: v.string(),
    projectId: v.id("projects"),
    topK: v.optional(v.number()), // Number of top similar chunks to retrieve
  },
  handler: async (
    ctx,
    { query, projectId, topK = 5 }: { query: string; projectId: Id<"projects">; topK?: number }
  ): Promise<{ response: string }> => {
    try {
      // Step 1: Generate embedding for the query using OpenAI
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: query,
      });

      const queryEmbedding: number[] = embeddingResponse.data[0].embedding;

      // Step 2: Perform vector search using Convex's vector index
      const vectorSearchResults = await ctx.vectorSearch("chunks", "byEmbedding", {
        vector: queryEmbedding,
        limit: topK,
        filter: (q) => q.eq("projectId", projectId),
      });

      // Extract the chunk IDs from the vector search results
      const chunkIds = vectorSearchResults.map((result) => result._id);

      // Step 3: Fetch the actual chunks using the internal query
      const similarChunks: SerializedChunk[] = await ctx.runQuery(internal.search.fetchChunks, { ids: chunkIds });

      // Step 4: Construct the context from similar chunks
      const contextText = similarChunks.map((chunk) => chunk.pageContent).join("\n\n");

      // Step 5: Generate a response using OpenAI's Chat Completion API
      const chatCompletion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          {
            role: "user",
            content: `
              Here is some context from your documents:
              ${contextText}

              Based on the above context, answer the following question:
              "${query}"
            `,
          },
        ],
        model: "gpt-3.5-turbo", // You can use "gpt-4" if available and necessary
      });

      // Handle potential null values
      const response: string =
        chatCompletion.choices[0].message.content?.trim() ||
        "I'm sorry, I couldn't generate a response.";

      // Step 6: Optionally, store the chat interaction in the 'chat' table
      {/* await ctx.db.insert("chat", {
        input: query,
        response: response,
        projectId: projectId,
      }); */}

      return { response };
    } catch (error) {
      console.error("Error during searchChunks action:", error);
      throw new Error("An error occurred while processing your request.");
    }
  },
});

// Define the getSimilarChunks action
export const getSimilarChunks = action({
  args: {
    query: v.string(),
    projectId: v.id("projects"),
    topK: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { query, projectId, topK = 5 }: { query: string; projectId: Id<"projects">; topK?: number }
  ): Promise<SerializedChunk[]> => {
    try {
      // Step 1: Generate embedding for the query using OpenAI
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: query,
      });

      const queryEmbedding: number[] = embeddingResponse.data[0].embedding;

      // Step 2: Perform vector search using Convex's vector index
      const vectorSearchResults = await ctx.vectorSearch("chunks", "byEmbedding", {
        vector: queryEmbedding,
        limit: topK,
        filter: (q) => q.eq("projectId", projectId),
      });

      // Extract the chunk IDs from the vector search results
      const chunkIds = vectorSearchResults.map((result) => result._id);

      // Step 3: Fetch the actual chunks using the internal query
      const similarChunks: SerializedChunk[] = await ctx.runQuery(internal.search.fetchChunks, { ids: chunkIds });

      return similarChunks;
    } catch (error) {
      console.error("Error during getSimilarChunks action:", error);
      throw new Error("An error occurred while fetching similar chunks.");
    }
  },
});
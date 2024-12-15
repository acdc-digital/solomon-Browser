// /Users/matthewsimon/Documents/Github/solomon-electron/next/convex/search.ts
// Search.ts 

"use node";

import { ConvexVectorStore } from "@langchain/community/vectorstores/convex";
import { OpenAIEmbeddings } from "@langchain/openai";
import { v } from "convex/values";
import { action } from "./_generated/server.js";

// Define the interface for the search result
interface SerializedDocument {
  pageContent: string;
  metadata: Record<string, any>;
}

/**
 * Helper function to perform a vector similarity search for documents
 * related to the given query and projectId.
 *
 * @param ctx - The Convex server context
 * @param query - The user query string
 * @param projectId - The project ID to filter the documents by
 * @returns An array of `SerializedDocument` objects that match the query, or an empty array if none found
 */
async function performVectorSearch(
  ctx: any,
  query: string,
  projectId: string
): Promise<SerializedDocument[]> {
  const vectorStore = new ConvexVectorStore(new OpenAIEmbeddings(), {
    ctx,
    table: "projects",
    embeddingField: "documentEmbeddings",
    textField: "documentChunks",
  });

  const results = await vectorStore.similaritySearch(query, 3);
  return results.map((doc) => ({
    pageContent: doc.pageContent,
    metadata: doc.metadata || {},
  }));
}

export const search = action({
  args: {
    query: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (
    ctx,
    { query, projectId }: { query: string; projectId: string }
  ): Promise<SerializedDocument[]> => {
    const result = await performVectorSearch(ctx, query, projectId);
    // Always return an array of plain objects, never null
    return result;
  },
});
// /Users/matthewsimon/Documents/Github/solomon-electron/next/convex/search.ts
// search.ts

import { v } from "convex/values";
import { action, query, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import OpenAI from "openai";
import { api, internal } from "./_generated/api"; // Import both api and internal

// Define the SerializedChunk interface
interface SerializedChunk {
  _id: string;
  projectId: Id<"projects">;
  pageContent: string;
  metadata: Record<string, any>; // Must be a plain object, not undefined
  embedding: number[] | null;
  chunkNumber: number | null;
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --------------------------------------------------------------------------
// Internal Query: fetchChunks by ID (for vector search results)
// --------------------------------------------------------------------------
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
          metadata: chunk.metadata ?? {}, // ensure an object
          embedding: chunk.embedding ?? null,
          chunkNumber: chunk.chunkNumber ?? null,
        });
      }
    }
    return results;
  },
});

// --------------------------------------------------------------------------
// Query: textSearchChunks (full-text search on "pageContent")
// --------------------------------------------------------------------------
export const textSearchChunks = query({
  args: {
    query: v.string(),
    projectId: v.id("projects"),
    topK: v.number(),
  },
  handler: async (ctx, { query, projectId, topK }) => {
    // 1) Perform the full-text search using the searchPageContent index
    const rawDocs = await ctx.db
      .query("chunks")
      .withSearchIndex("search_pageContent", (q) =>
        q.search("pageContent", query).eq("projectId", projectId)
      )
      .take(topK);

    // 2) Convert each doc to our SerializedChunk shape
    const typedDocs: SerializedChunk[] = rawDocs.map((doc) => ({
      _id: doc._id.toString(),
      projectId: doc.projectId as Id<"projects">,
      pageContent: doc.pageContent,
      metadata: doc.metadata ?? {}, // fallback to an empty object
      embedding: doc.embedding ?? null,
      chunkNumber: doc.chunkNumber ?? null,
    }));

    return typedDocs;
  },
});

// A small helper to remove duplicates by _id
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

// --------------------------------------------------------------------------
// getSimilarChunks (Vector-based retrieval)
// --------------------------------------------------------------------------
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
      // 1) Generate embedding for the query using OpenAI
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: query,
      });
      const queryEmbedding: number[] = embeddingResponse.data[0].embedding;

      // 2) Perform vector search using Convex's vector index
      const vectorSearchResults = await ctx.vectorSearch("chunks", "byEmbedding", {
        vector: queryEmbedding,
        limit: topK,
        filter: (q) => q.eq("projectId", projectId),
      });

      // 3) Fetch actual chunks
      const chunkIds = vectorSearchResults.map((res) => res._id);
      const similarChunks = await ctx.runQuery(internal.search.fetchChunks, { ids: chunkIds });
      return similarChunks;
    } catch (error) {
      console.error("Error during getSimilarChunks action:", error);
      throw new Error("An error occurred while fetching similar chunks.");
    }
  },
});

// --------------------------------------------------------------------------
// combinedSearchChunks (Embedding + Full-text search approach)
// --------------------------------------------------------------------------
export const combinedSearchChunks = action({
  args: {
    query: v.string(),
    projectId: v.id("projects"),
    topK: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { query, projectId, topK = 8 }: { query: string; projectId: Id<"projects">; topK?: number }
  ): Promise<SerializedChunk[]> => {
    try {
      // 1) Vector-based results from getSimilarChunks
      const embeddingResults = await ctx.runAction(api.search.getSimilarChunks, {
        query,
        projectId,
        topK,
      });

      // 2) Text-based search results (call the textSearchChunks query)
      const textResults = await ctx.runQuery(api.search.textSearchChunks, {
        query,
        projectId,
        topK,
      });

      // 3) Merge them and deduplicate by _id
      const combined = [...embeddingResults, ...textResults];
      const uniqueResults = deduplicateById(combined);

      // 4) Return topK again if needed
      return uniqueResults.slice(0, topK);
    } catch (error) {
      console.error("Error in combinedSearchChunks:", error);
      throw new Error("An error occurred while combining search results.");
    }
  },
});

/** Utility to remove duplicates by _id **/
function deduplicateById(docs: SerializedChunk[]): SerializedChunk[] {
  const seen = new Set();
  const out: SerializedChunk[] = [];
  for (const d of docs) {
    if (!seen.has(d._id)) {
      out.push(d);
      seen.add(d._id);
    }
  }
  return out;
}
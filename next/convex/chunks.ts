// convex/chunks.ts
// /Users/matthewsimon/Documents/Github/solomon-electron/next/convex/chunks.ts

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { v4 as uuidv4 } from 'uuid'; 
import pLimit from 'p-limit'; // Import p-limit for concurrency control

// Define the interface matching the 'chunks' table schema
interface ChunkDoc {
  projectId: Id<"projects">;
  uniqueChunkId: string;
  pageContent: string;
  metadata?: {
    docAuthor?: string;
    docTitle?: string;
    headings?: string[];
    isHeading?: boolean;
    pageNumber?: number;
    numTokens?: number;
    snippet?: string;
    module?: string;
    keywords?: string[];
    entities?: string[];
    topics?: string[];
  };
  embedding?: number[];
  chunkNumber?: number;
}

interface EmbeddingChunk {
  id: string;
  pageContent: string;
  embedding: number[];
  metadata?: {
    snippet: string | null;
    module: string | null;
  };
}

/**
 * Query to fetch a limited number of chunks that have embeddings.
 * Supports pagination by accepting an optional `cursor`.
 */
export const getAllEmbeddings = query(async (
  ctx,
  { limit, cursor }: { limit: number; cursor?: string | null }
): Promise<{ chunks: EmbeddingChunk[]; nextCursor: string | null }> => {
  let q = ctx.db.query("chunks")
    .withIndex("by_uniqueChunkId")
    .order("asc");

  if (cursor) {
    q = q.filter(c => c.gt("uniqueChunkId", cursor));
  }
  // Only return chunks that actually have embeddings
  q = q.filter(c => c.neq("embedding", null));

  const chunks = await q.take(limit);
  const nextCursor = (chunks.length === limit)
    ? chunks[chunks.length - 1].uniqueChunkId
    : null;

  return {
    chunks: chunks.map((chunk: ChunkDoc) => ({
      id: chunk.uniqueChunkId,
      pageContent: chunk.pageContent,
      embedding: chunk.embedding as number[],

      // Return all the metadata fields you care about:
      metadata: {
        snippet: chunk.metadata?.snippet ?? "No snippet available",
        module: chunk.metadata?.module ?? null,

        // Add these lines so you actually receive them on the client:
        docAuthor: chunk.metadata?.docAuthor ?? "Unknown",
        docTitle: chunk.metadata?.docTitle ?? "Untitled",
        headings: chunk.metadata?.headings ?? [],
        isHeading: chunk.metadata?.isHeading ?? false,
        pageNumber: chunk.metadata?.pageNumber ?? 0,
        numTokens: chunk.metadata?.numTokens ?? 0,
        keywords: chunk.metadata?.keywords ?? [],
        entities: chunk.metadata?.entities ?? [],
        topics: chunk.metadata?.topics ?? [],
      },
    })),
    nextCursor,
  };
});

export const insertChunk = mutation({
  args: {
    parentProjectId: v.id("projects"),
    pageContent: v.string(),
    metadata: v.optional(v.object({})), // Freed to accept any shape
    chunkNumber: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { parentProjectId, pageContent, metadata, chunkNumber }: {
      parentProjectId: Id<"projects">;
      pageContent: string;
      metadata?: Record<string, any>;
      chunkNumber?: number;
    }
  ) => {
    const uniqueChunkId = uuidv4();

    await ctx.db.insert("chunks", {
      projectId: parentProjectId,
      uniqueChunkId,
      pageContent,
      metadata: metadata || {},
      chunkNumber: chunkNumber ?? undefined,
    });
  },
});

// Mutation to insert multiple chunks (Batch Insert)
export const insertChunks = mutation({
  args: {
    parentProjectId: v.id("projects"),
    chunks: v.array(
      v.object({
        uniqueChunkId: v.string(),
        pageContent: v.string(),
        metadata: v.optional(
          v.object({
            docAuthor: v.optional(v.string()),
            docTitle: v.optional(v.string()),
            headings: v.optional(v.array(v.string())),
            isHeading: v.optional(v.boolean()), // <-- ADDED here
            pageNumber: v.optional(v.number()),
            numTokens: v.optional(v.number()),
            snippet: v.optional(v.string()),
            module: v.optional(v.string()),
            keywords: v.optional(v.array(v.string())),
            entities: v.optional(v.array(v.string())),
            topics: v.optional(v.array(v.string())),
          })
        ),
        embedding: v.optional(v.array(v.float64())),
        chunkNumber: v.optional(v.number()),
      })
    ),
  },
  handler: async (
    ctx,
    { parentProjectId, chunks }: {
      parentProjectId: Id<"projects">;
      chunks: {
        uniqueChunkId: string;
        pageContent: string;
        metadata?: {
          docAuthor?: string;
          docTitle?: string;
          headings?: string[];
          isHeading?: boolean;
          pageNumber?: number;
          numTokens?: number;
          snippet?: string;
          module?: string;
          keywords?: string[];
          entities?: string[];
          topics?: string[];
        };
        embedding?: number[];
        chunkNumber?: number;
      }[];
    }
  ) => {
    const chunkDocs: ChunkDoc[] = chunks.map(chunk => ({
      projectId: parentProjectId,
      uniqueChunkId: chunk.uniqueChunkId,
      pageContent: chunk.pageContent,
      metadata: chunk.metadata || {},
      embedding: chunk.embedding ?? undefined,
      chunkNumber: chunk.chunkNumber ?? undefined,
    }));

    const limit = pLimit(5);

    const insertPromises = chunkDocs.map(chunkDoc =>
      limit(() => ctx.db.insert("chunks", chunkDoc))
    );

    await Promise.all(insertPromises);
  },
});

export const updateChunkEmbedding = mutation({
  args: {
    uniqueChunkId: v.string(),
    embedding: v.array(v.float64()),
  },
  handler: async (
    ctx,
    { uniqueChunkId, embedding }: {
      uniqueChunkId: string;
      embedding: number[];
    }
  ) => {
    const chunk = await ctx.db.query("chunks")
      .withIndex("by_uniqueChunkId", (q: any) =>
        q.eq("uniqueChunkId", uniqueChunkId)
      )
      .first();

    if (!chunk) {
      throw new Error(`Chunk with unique ID ${uniqueChunkId} not found.`);
    }

    await ctx.db.patch(chunk._id, {
      embedding,
    });
  },
});
// convex/chunks.ts
// /Users/matthewsimon/Documents/Github/solomon-electron/next/convex/chunks.ts

import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Mutation to insert a single chunk
export const insertChunk = mutation({
  args: {
    parentProjectId: v.id("projects"),
    pageContent: v.string(),
    metadata: v.optional(v.object({})), // Allow any object
    chunkNumber: v.optional(v.number()), // Optional if unique ID is used
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
    const uniqueChunkId = `${parentProjectId}-chunk-${chunkNumber}`;

    await ctx.db.insert("chunks", {
      projectId: parentProjectId,
      uniqueChunkId, // New unique identifier
      pageContent,
      metadata: metadata || {},
      chunkNumber: chunkNumber ?? undefined, // Optional
    });
  },
});

// Mutation to insert multiple chunks (Batch Insert)
export const insertChunks = mutation({
  args: {
    parentProjectId: v.id("projects"),
    chunks: v.array(
      v.object({
        pageContent: v.string(),
        metadata: v.optional(
          v.object({
            docAuthor: v.optional(v.string()),
            docTitle: v.optional(v.string()),
            headings: v.optional(v.array(v.string())),
            pageNumber: v.optional(v.number()),
            numTokens: v.optional(v.number()),
            snippet: v.optional(v.string()),
          })
        ),
        chunkNumber: v.optional(v.number()),
      })
    ),
  },
  handler: async (
    ctx,
    { parentProjectId, chunks }: { 
      parentProjectId: Id<"projects">; 
      chunks: {
        pageContent: string;
        metadata?: {
          docAuthor?: string;
          docTitle?: string;
          headings?: string[];
          pageNumber?: number;
        };
        chunkNumber?: number;
      }[];
    }
  ) => {
    const chunkDocs = chunks.map(chunk => ({
      projectId: parentProjectId,
      uniqueChunkId: `${parentProjectId}-chunk-${chunk.chunkNumber}`, // Generate unique ID
      pageContent: chunk.pageContent,
      metadata: chunk.metadata || {},
      chunkNumber: chunk.chunkNumber ?? undefined,
    }));

    await Promise.all(chunkDocs.map(doc => ctx.db.insert("chunks", doc)));
  },
});

// Mutation to update a chunk's embedding
export const updateChunkEmbedding = mutation({
  args: {
    parentProjectId: v.id("projects"),
    chunkNumber: v.number(),
    embedding: v.array(v.float64()),
  },
  handler: async (
    ctx,
    { parentProjectId, chunkNumber, embedding }: { 
      parentProjectId: Id<"projects">; 
      chunkNumber: number; 
      embedding: number[];
    }
  ) => {
    const uniqueChunkId = `${parentProjectId}-chunk-${chunkNumber}`;
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
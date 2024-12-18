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
    chunkNumber: v.optional(v.number()), // Use v.number() instead of v.int()
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
    await ctx.db.insert("chunks", {
      projectId: parentProjectId, // Assign to projectId field in the database
      pageContent,
      metadata: metadata || {},
      chunkNumber: chunkNumber ?? undefined, // Ensure undefined if not provided
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
        metadata: v.optional(v.object({})),
        chunkNumber: v.optional(v.number()),
      })
    ),
  },
  handler: async (
    ctx,
    { parentProjectId, chunks }: { 
      parentProjectId: Id<"projects">; 
      chunks: { pageContent: string; metadata?: Record<string, any>; chunkNumber?: number; }[];
    }
  ) => {
    const chunkDocs = chunks.map(chunk => ({
      projectId: parentProjectId, // Assign to projectId field in the database
      pageContent: chunk.pageContent,
      metadata: chunk.metadata || {},
      chunkNumber: chunk.chunkNumber ?? undefined, // Ensure undefined if not provided
    }));
    
    // Perform concurrent inserts
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
      const chunk = await ctx.db.query("chunks")
        .withIndex("by_project_and_chunkNumber", (q: any) => q
          .eq("projectId", parentProjectId)
          .eq("chunkNumber", chunkNumber)
        )
        .first();
  
      if (!chunk) {
        throw new Error(`Chunk number ${chunkNumber} for project ${parentProjectId} not found.`);
      }
  
      await ctx.db.patch(chunk._id, {
        embedding,
      });
    },
});
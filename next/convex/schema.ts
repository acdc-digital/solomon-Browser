// Schema 
// /Users/matthewsimon/Documents/GitHub/solomon-electron/solomon-electron/next/convex/schema.ts

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Default Schema for Projects 
  projects: defineTable({
    type: v.string(), // 'project' or 'document'
    // Projects Fields
    title: v.optional(v.string()),
    userId: v.string(),
    isArchived: v.boolean(),
    parentProject: v.optional(v.id("projects")),
    content: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
    noteEmbeddings: v.optional(v.array(v.float64())),

    // Document Fields
    documentTitle: v.optional(v.string()),
    fileId: v.optional(v.string()),
    documentText: v.optional(v.string()),
    documentEmbeddings: v.optional(v.array(v.float64())),
    documentChunks: v.optional(v.array(v.string())),
    isProcessed: v.boolean(),
    processedAt: v.optional(v.string()),
  })
  .index("by_user", ["userId"])
  .index("by_user_parent", ["userId", "parentProject"])
  .vectorIndex("byEmbedding", {
    vectorField: "documentEmbeddings",
    dimensions: 1536,
  }),
  
  // Schema for Chat
  chat: defineTable({
    input: v.string(),
    response: v.string(),
  }),
});
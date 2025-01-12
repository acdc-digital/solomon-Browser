// Database Schema
// /Users/matthewsimon/Documents/GitHub/solomon-electron/solomon-electron/next/convex/schema.ts

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Schema for Projects and Documents
  projects: defineTable({
    type: v.string(), // 'project' or 'document'
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
    isProcessed: v.optional(v.boolean()),
    processedAt: v.optional(v.string()),
    isProcessing: v.optional(v.boolean()),
    progress: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_parent", ["userId", "parentProject"]),

  // Schema for Chunks
  chunks: defineTable({
    projectId: v.id("projects"),
    pageContent: v.string(),
    metadata: v.optional(
      v.object({
        docAuthor: v.optional(v.string()),
        docTitle: v.optional(v.string()),
        headings: v.optional(v.array(v.string())),
        isHeading: v.optional(v.boolean()),  // <-- ADDED
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
    uniqueChunkId: v.string(),
  })
    .index("by_project", ["projectId"])
    .index("by_uniqueChunkId", ["uniqueChunkId"])
    .vectorIndex("byEmbedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["projectId"],
    })
    .searchIndex("search_pageContent", {
      searchField: "pageContent",
      filterFields: ["projectId"],
    }),

  // Schema for Chat
  chat: defineTable({
    input: v.string(),
    response: v.string(),
    projectId: v.optional(v.id("projects")),
    isGraphChat: v.optional(v.boolean()),
  })
  .index("by_project", ["projectId"]),

  // New Schema for Graph Elements (Nodes and Links in a single collection)
  graph: defineTable({
    // A discriminator to indicate whether this entry is a node or a link.
    elementType: v.string(), // Expected values: "node" or "link"

    // Fields for nodes:
    documentChunkId: v.optional(v.string()),
    label: v.optional(v.string()),
    group: v.optional(v.string()),
    significance: v.optional(v.number()),

    // Fields for links:
    source: v.optional(v.string()),
    target: v.optional(v.string()),
    similarity: v.optional(v.number()),
    relationship: v.optional(v.string()),
  })
  .searchIndex("search_label", { searchField: "label" })
  .searchIndex("search_group", { searchField: "group" })
});
// Schema 
// /Users/matthewsimon/Documents/GitHub/solomon-electron/solomon-electron/next/convex/schema.ts

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Default Schema for Projects 
  projects: defineTable({
    title: v.string(),
    userId: v.string(),
    isArchived: v.boolean(),
    parentProject: v.optional(v.id("projects")),
    content: v.optional(v.string()),
    icon: v.optional(v.string()),
    isPublished: v.boolean(),
    embeddings: v.optional(v.array(v.number())),
  })
  .index("by_user", ["userId"])
  .index("by_user_parent", ["userId", "parentProject"]),
  
  // Schema for Chat
  chat: defineTable({
    input: v.string(),
    response: v.string(),
  }),

  // Schema for Documents
  documents: defineTable({
    title: v.string(),
    content: v.optional(v.string()), // Optional content for the document
    userId: v.string(), // The user who created the document
    parentProject: v.optional(v.id("projects")), // Link to the parent project
  })
  .index("by_user", ["userId"]) // Index for querying documents by user
  .index("by_user_parent", ["userId", "parentProject"]), // Index for querying documents by parent project
});
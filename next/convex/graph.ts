// Graph Convex 
// /Users/matthewsimon/Documents/Github/solomon-desktop/solomon-Desktop/next/convex/graph.ts

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Mutation to save or update a graph node.
export const upsertGraphNode = mutation({
  args: {
    // Use the ID type for the "graph" table.
    id: v.optional(v.id("graph")),  
    documentChunkId: v.string(),
    label: v.string(),
    group: v.string(),
    significance: v.optional(v.number()),
  },
  handler: async (ctx, { id, documentChunkId, label, group, significance }) => {
    // Data for a node in the graph, including the discriminator.
    const data = {
      elementType: "node",
      documentChunkId,
      label,
      group,
      significance: significance ?? 0, // fallback to 0 if not provided
    };

    if (id) {
      // Update the existing graph node.
      return await ctx.db.patch(id, data);
    } else {
      // Insert a new graph node.
      return await ctx.db.insert("graph", data);
    }
  },
});

// Mutation to save or update a graph link.
export const upsertGraphLink = mutation({
  args: {
    // Use the ID type for the "graph" table.
    id: v.optional(v.id("graph")),
    source: v.string(),
    target: v.string(),
    similarity: v.number(),
    relationship: v.string(),
  },
  handler: async (ctx, { id, source, target, similarity, relationship }) => {
    // Data for a link, including the discriminator.
    const data = {
      elementType: "link",
      source,
      target,
      similarity,
      relationship,
    };

    if (id) {
      // Update existing graph link.
      return await ctx.db.patch(id, data);
    } else {
      // Insert a new graph link.
      return await ctx.db.insert("graph", data);
    }
  },
});

// Query to fetch the stored graph data, partitioning into nodes and links.
export const getGraphData = query({
  async handler(ctx) {
    // Retrieve all entries from the unified "graph" table.
    const allEntries = await ctx.db.query("graph").collect();

    // Partition the entries into nodes and links based on the elementType field.
    const nodes = allEntries.filter((entry) => entry.elementType === "node");
    const links = allEntries.filter((entry) => entry.elementType === "link");

    return { nodes, links };
  },
});

// Batch mutation to upsert multiple graph nodes.
export const batchUpsertGraphNodes = mutation({
  args: {
    nodes: v.array(
      v.object({
        documentChunkId: v.string(),
        label: v.string(),
        group: v.string(),
        significance: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, { nodes }) => {
    const results = [];
    for (const node of nodes) {
      const data = {
        elementType: "node",
        documentChunkId: node.documentChunkId,
        label: node.label,
        group: node.group,
        significance: node.significance ?? 0,
      };
      results.push(await ctx.db.insert("graph", data));
    }
    return results;
  },
});

// Batch mutation to upsert multiple graph links.
export const batchUpsertGraphLinks = mutation({
  args: {
    links: v.array(
      v.object({
        source: v.string(),
        target: v.string(),
        similarity: v.number(),
        relationship: v.string(),
      })
    ),
  },
  handler: async (ctx, { links }) => {
    const results = [];
    for (const link of links) {
      const data = {
        elementType: "link",
        source: link.source,
        target: link.target,
        similarity: link.similarity,
        relationship: link.relationship,
      };
      results.push(await ctx.db.insert("graph", data));
    }
    return results;
  },
});

// (Optional) Existing query to get all graph data remains.
{/* export const getGraphData = query({
  async handler(ctx) {
    const allEntries = await ctx.db.query("graph").collect();
    const nodes = allEntries.filter((entry) => entry.elementType === "node");
    const links = allEntries.filter((entry) => entry.elementType === "link");
    return { nodes, links };
  },
}); */} 
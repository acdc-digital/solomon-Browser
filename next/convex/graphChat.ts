// GraphChat
// /Users/matthewsimon/Documents/Github/solomon-desktop/solomon-Desktop/next/convex/graphChat.ts

import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from "openai";

// Define interfaces
interface ChatEntry {
  _id: string;
  input: string;
  response: string;
}

interface GraphNode {
  documentChunkId: string;
  label: string;
  group: string;
  similarity?: number;
  // Add other necessary fields
}

interface ChatCompletionMessageParam {
  role: "system" | "user" | "assistant";
  content: string;
}

// Mutation: Insert a new chat entry specific to graph chat.
export const insertGraphChatEntry = mutation({
  args: {
    input: v.string(),
    response: v.string(),
  },
  handler: async (ctx, { input, response }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User not authenticated.");
    }
    return await ctx.db.insert("chat", { input, response, isGraphChat: true });
  },
});

// Query: Get all graph chat entries.
export const getAllGraphChatEntries = query({
  args: {},
  handler: async (ctx): Promise<ChatEntry[]> => {
    const entries = await ctx.db
      .query("chat")
      .filter((q) => q.eq(q.field("isGraphChat"), true))
      .take(1000); // Use .take instead of .collect
    return entries.map((entry) => ({
      _id: entry._id.toString(),
      input: entry.input,
      response: entry.response,
    }));
  },
});

// Query: Get the last N graph chat messages.
export const getLastNGraphChatMessages = query({
  args: { n: v.number() },
  handler: async (ctx, { n }): Promise<ChatEntry[]> => {
    const messages = await ctx.db
      .query("chat")
      .filter((q) => q.eq(q.field("isGraphChat"), true))
      .order("desc")
      .take(n); // Use .take instead of .collect
    return messages.reverse();
  },
});

// Query: Search the graph table for nodes relevant to a query.
export const graphGraphSearch = query({
    args: { query: v.string(), topK: v.number() },
    handler: async (ctx, { query, topK }): Promise<{ nodes: GraphNode[]; links: any[] }> => {
      try {
        console.log("Searching graph table with query:", query, "topK:", topK);
  
        // Search for nodes using the defined search indexes
        const labelResults = await ctx.db
          .query("graph")
          .withSearchIndex("search_label", (q) => q.search("label", query))
          .take(topK);
  
        const groupResults = await ctx.db
          .query("graph")
          .withSearchIndex("search_group", (q) => q.search("group", query))
          .take(topK);
  
        // Combine and deduplicate results
        const combinedResults = [...labelResults, ...groupResults];
        const uniqueNodes = deduplicateById(combinedResults);
  
        // Fetch relationships (links) for these nodes
        const chunkIds = uniqueNodes.map((node) => node.documentChunkId).filter(Boolean);
        const links = await ctx.db
        .query("graph")
        .filter((q) => {
            const chunkIdConditions = chunkIds.map((id) =>
            q.or(
                q.eq(q.field("source"), id),
                q.eq(q.field("target"), id)
            )
            );
            return q.and(
            q.eq(q.field("elementType"), "link"),
            q.or(...chunkIdConditions)
            );
        })
        .take(100); // Limit to 100 relationships for performance
  
        // Map nodes to the GraphNode interface
        const mappedNodes = uniqueNodes.map((node) => ({
          documentChunkId: node.documentChunkId || "",
          label: node.label || "Unknown",
          group: node.group || "Misc",
          similarity: node.similarity,
        }));
  
        return { nodes: mappedNodes, links };
      } catch (error) {
        console.error("Error in graphGraphSearch:", error);
        throw new Error("Failed to search graph nodes.");
      }
    },
  });
  
  // Helper to deduplicate nodes by ID
  function deduplicateById(nodes: any[]): any[] {
    const seen = new Set();
    return nodes.filter((node) => {
      if (seen.has(node._id.toString())) return false;
      seen.add(node._id.toString());
      return true;
    });
  }

// Action: Handle a user message for graph chat.
export const handleGraphUserAction = action({
    args: { message: v.string() },
    handler: async (ctx, { message }): Promise<{ response: string }> => {
      try {
        // Ensure the user is authenticated
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          throw new Error("User not authenticated.");
        }
  
        // 1) Retrieve relevant nodes and links
        const { nodes, links } = await ctx.runQuery(api.graphChat.graphGraphSearch, {
          query: message,
          topK: 10,
        });
  
        // 2) Compose a context string from the retrieved nodes and links
        const nodeContextArray = nodes.map((node) => {
          return `[Chunk ID: ${node.documentChunkId}] ${node.label} (Group: ${node.group})` +
            (node.similarity ? ` Similarity: ${node.similarity.toFixed(2)}` : "");
        });
  
        const linkContextArray = links.map((link) => {
          return `Relationship: ${link.relationship || "Unknown"} - Source: [${link.source}] Target: [${link.target}]`;
        });
  
        const graphContextText = [
          "### Relevant Nodes:",
          ...nodeContextArray,
          "### Relationships:",
          ...linkContextArray,
        ].join("\n");
  
        // 3) Compose the system prompt
        const systemPrompt = `
          You are a helpful assistant skilled at understanding relationships between document chunks.
          Use the context below, derived from graph nodes and their relationships, to answer the following question:
  
          ${graphContextText}
  
          Question:
        `.trim();
  
        // 4) Construct messages for the OpenAI API
        const openAiMessages: ChatCompletionMessageParam[] = [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ];
  
        // 5) Call the OpenAI API
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
  
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: openAiMessages,
          temperature: 0.7,
        });
  
        const answer = completion.choices[0]?.message?.content || "No response.";
  
        // 6) Insert the graph chat entry
        await ctx.runMutation(api.graphChat.insertGraphChatEntry, {
          input: message,
          response: answer,
        });
  
        return { response: answer };
      } catch (error) {
        console.error("Error in handleGraphUserAction:", error);
        throw new Error("Failed to handle graph chat user action.");
      }
    },
  });
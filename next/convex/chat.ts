// Chat.ts
// /Users/matthewsimon/Documents/Github/solomon-electron/next/convex/chat.ts

// Retrieve Similar Chunks: Utilizes the newly created searchChunks API to fetch the top K similar chunks based on the user query.
// Construct Context: Combines the content of these chunks to provide context for the OpenAI model.
// Generate Response: Sends the prompt with context to OpenAI’s Chat Completion API to generate a response.
// Store Chat Entry: Inserts the user query and the generated response into the chat table for record-keeping.
// Return Response: Sends the generated response back to the user.

import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";
import { Id } from "./_generated/dataModel"; // Import Id type

// Define interfaces
interface SerializedChunk {
  _id: string;
  projectId: Id<"projects">;
  pageContent: string;
  metadata: Record<string, any>;
  embedding: number[] | null;
  chunkNumber: number | null;
}

interface HandleUserActionResponse {
  response: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure your API key is set in environment variables
});

// Mutation to insert chat entries
export const insertEntry = mutation({
  args: {
    input: v.string(),
    response: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (
    ctx,
    { input, response, projectId }: { input: string; response: string; projectId: Id<"projects"> }
  ) => {
    await ctx.db.insert("chat", {
      input,
      response,
      projectId,
    });
  },
});

// Query to get all chat entries for a project
export const getAllEntries = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (
    ctx,
    { projectId }: { projectId: Id<"projects"> }
  ): Promise<{ _id: string; input: string; response: string; projectId: Id<"projects"> }[]> => {
    const entries = await ctx.db
      .query("chat")
      .withIndex("by_project", (q: any) => q.eq("projectId", projectId))
      .collect();

    // Transform entries to match the expected return type
    return entries.map(entry => ({
      _id: entry._id.toString(), // Convert Id<"chat"> to string
      input: entry.input,
      response: entry.response,
      projectId: entry.projectId as Id<"projects">, // Ensure projectId is present and correctly typed
    }));
  },
});

// Action to handle user messages
// Enhanced Action to handle user messages with Agent Logic
export const handleUserAction = action({
  args: {
    message: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (
    ctx,
    { message, projectId }: { message: string; projectId: Id<"projects"> }
  ): Promise<HandleUserActionResponse> => {
    try {
      // Step 1: Retrieve similar chunks using the searchChunks API
      const results: SerializedChunk[] = await ctx.runAction(api.search.getSimilarChunks, {
        query: message,
        projectId,
        topK: 4, // Adjust based on desired number of similar chunks
      });

      // Log serialized results for debugging
      console.log("Serialized Results:", results);

      // Step 2: Combine the content of all chunks into a single context string
      const contextText: string = results.map((chunk) => chunk.pageContent).join("\n\n");

      // Step 3: Construct the prompt for OpenAI with context
      const prompt: string = `
        You are a helpful assistant. The user asked: "${message}"

        Here is some additional context from the relevant documents:
        ${contextText}

        Please answer the user’s question as accurately and helpfully as possible using the above context.
      `.trim();

      // Log the prompt for debugging
      console.log("Prompt for OpenAI:", prompt);

      // Step 4: Call OpenAI's Chat Completion API
      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: message },
        ],
        model: "gpt-3.5-turbo", // Consider using a more advanced model if needed
      });

      // Step 5: Extract the response from OpenAI
      const response: string = completion.choices[0].message.content ?? "";

      // Log the OpenAI response for debugging
      console.log("OpenAI Response:", response);

      // Step 6: Insert the chat entry into the database
      await ctx.runMutation(api.chat.insertEntry, {
        input: message,
        response,
        projectId,
      });

      // Step 7: Return only the OpenAI response
      return { response };
    } catch (error: any) {
      console.error("Error in handleUserAction:", error);
      throw new Error("Failed to handle user action.");
    }
  },
});
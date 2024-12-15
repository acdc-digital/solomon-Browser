// Chat 
// /Users/matthewsimon/Documents/github/solomon-electron/solomon-electron/next/convex/chat.ts

import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from './_generated/api';

import OpenAI from "openai";

const openai = new OpenAI();

export const handleUserAction = action({
    args: {
        message: v.string(),
        projectId: v.id("projects"),
    },
    handler: async (ctx, { message, projectId }) => {
        const completion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: message }],
            model: 'gpt-3.5-turbo',
          });

          const input = message;
          const response = completion.choices[0].message.content ?? '';

          await ctx.runMutation(api.chat.insertEntry, {
            input,
            response,
            projectId,
          });

        return completion;
    },
});

export const insertEntry = mutation({
    args: {
        input: v.string(),
        response: v.string(),
        projectId: v.id("projects"),
    },
    handler: async (ctx, { input, response, projectId }) => {
        await ctx.db.insert("chat", {
            input,
            response,
            projectId,
        });
    },
});

export const getAllEntries = query({
    args: {
      projectId: v.id("projects"), // or v.optional(v.id("projects")) if needed
    },
    handler: async (ctx, { projectId }) => {
      // Filter chat messages for the given projectId
      const entries = await ctx.db.query("chat")
        .withIndex("by_project", q => q.eq("projectId", projectId))
        .collect();
      return entries;
    },
  });
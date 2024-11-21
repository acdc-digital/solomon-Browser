import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

export const getDocuments = query({
    async handler(ctx) {
        return await ctx.db.query('documents').collect()
    },
})

export const createDocument = mutation({
    args: {
        title: v.string(),
        fileId: v.string(),
        parentProject: v.optional(v.id("projects")),
    },
    async handler(ctx, args) {
        // Retrieve the authenticated user's identity
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("User not authenticated.");
        }

        // Validate if parentProject exists
        if (args.parentProject) {
            const project = await ctx.db.get(args.parentProject);
            if (!project) {
                throw new Error("Associated parent project not found.");
            }
        }

        // Insert the document with userId and other required fields
        await ctx.db.insert('documents', {
            title: args.title,
            fileId: args.fileId,
            userId: identity.subject, // Use the authenticated user's ID
            parentProject: args.parentProject, // Include the optional parentProject
        });
    },
});
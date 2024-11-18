import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createDocument = mutation({
    args: {
        title: v.string(),
        projectId: v.optional(v.id("projects")),
    },
    async handler(ctx, args) {
        // Retrieve the authenticated user's identity
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("User not authenticated.");
        }

        // Validate if projectId exists
        if (args.projectId) {
            const project = await ctx.db.get(args.projectId);
            if (!project) {
                throw new Error("Associated project not found.");
            }
        }

        // Insert the document with userId and other required fields
        await ctx.db.insert('documents', {
            title: args.title,
            userId: identity.subject, // Use the authenticated user's ID
            projectId: args.projectId, // Include the optional projectId
        });
    },
});
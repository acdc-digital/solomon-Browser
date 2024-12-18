// Convex Projects 
// /Users/matthewsimon/Documents/GitHub/solomon-electron/solomon-electron/next/convex/projects.ts

import { v } from "convex/values";
import { mutation, MutationCtx, query, internalAction, ActionCtx, action } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { UnstructuredLoader } from "@langchain/community/document_loaders/fs/unstructured";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { CacheBackedEmbeddings } from "langchain/embeddings/cache_backed";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ConvexKVStore } from "@langchain/community/storage/convex";
import { ConvexVectorStore } from "@langchain/community/vectorstores/convex";
import fetch from "node-fetch";
// import pdfParse from 'pdf-parse';
// import OpenAI from "openai";

/**
 * Query to retrieve the parentProjectId for a given documentId.
 *
 * @param ctx - Convex server context
 * @param documentId - The ID of the document
 * @returns The parentProjectId if found, otherwise null
 */
export const getParentProjectId = query({
	args: {
	  documentId: v.id("projects"),
	},
	handler: async (
	  ctx,
	  { documentId }: { documentId: Id<"projects"> }
	): Promise<Id<"projects"> | null> => {
	  console.log(`Fetching document with ID: ${documentId}`);

	  // Fetch the document directly by its ID
	  const document = await ctx.db.get(documentId);

	  if (!document) {
		console.error(`Document with ID ${documentId} not found.`);
		return null;
	  }

	  if (document.type !== "document") {
		console.error(`Document with ID ${documentId} is not of type 'document'.`);
		return null;
	  }

	  if (!document.parentProject) {
		console.error(`Document with ID ${documentId} does not have a parentProject.`);
		return null;
	  }

	  console.log(`Parent Project ID: ${document.parentProject}`);
	  return document.parentProject as Id<"projects">;
	},
  });

{/* export const processDocument = action({
	args: {
	  documentId: v.id("projects"),
	},
	handler: async (ctx, { documentId }) => {
	  // Step 1: Retrieve the document via a query
	  const document = await ctx.runQuery(api.projects.getDocument, { documentId });
	  if (!document) {
		throw new Error("Document not found.");
	  }
	  if (!document.fileId) {
		throw new Error("No file associated with the document.");
	  }
	  console.log("Loading document...");

	  // Step 2: Generate a download URL for the file
	  const fileUrl = await ctx.storage.getUrl(document.fileId);
	  if (!fileUrl) {
		throw new Error("Failed to retrieve file URL from storage.");
	  }
	  console.log("Got fileUrl:", fileUrl);

	  // Step 3: Load the document using UnstructuredLoader
	  const loader = new UnstructuredLoader(fileUrl);
	  const docs = await loader.load();
	  if (!docs.length) {
		throw new Error("No content extracted from the document.");
	  }
	  console.log("Loaded docs:", docs.length);

	  // Step 4: Split the document into chunks
	  const textSplitter = new RecursiveCharacterTextSplitter({
		chunkSize: 1000,
		chunkOverlap: 200,
	  });
	  const splitDocs = await textSplitter.splitDocuments(docs);
	  const docChunks = splitDocs.map((doc) => doc.pageContent);

	  // Step 5: Initialize embeddings with caching, now `ctx` is ActionCtx
	  const embeddings = new CacheBackedEmbeddings({
		underlyingEmbeddings: new OpenAIEmbeddings(),
		documentEmbeddingStore: new ConvexKVStore({ ctx }), // Allowed in actions
	  });

	  // Step 6a: Generate embeddings for the chunks
	  const chunkEmbeddings = await embeddings.embedDocuments(docChunks);

	  // Optionally, average embeddings into one representative vector
	  const documentEmbedding = chunkEmbeddings[0].map((_, i) =>
		chunkEmbeddings.reduce((sum, vec) => sum + vec[i], 0) / chunkEmbeddings.length
	  );
	  console.log("Computed embeddings");

	  // Step 6b: Store embeddings in the vector index (optional)
	  await ConvexVectorStore.fromDocuments(splitDocs, embeddings, { ctx });

	  // Update the document embeddings and chunks via a mutation
	  await ctx.runMutation(api.projects.updateDocumentEmbeddings, {
		documentId,
		documentChunks: docChunks,
		documentEmbeddings: documentEmbedding,
	  });

	  // Step 7: Update the document entry to mark it as processed
	  await ctx.runMutation(api.projects.updateDocumentProcessed, {
		documentId,
		isProcessed: true,
	  });

	  return { success: true };
	},
  }); */}

// This mutation updates the document's chunks and embeddings
{/* export const updateDocumentEmbeddings = mutation({
	args: {
	  documentId: v.id("projects"),
	  documentEmbeddings: v.array(v.float64()),
	},
	handler: async (ctx, args) => {
	  await ctx.db.patch(args.documentId, {
		documentEmbeddings: args.documentEmbeddings,
	  });
	},
  }); */}

export const createDocument = mutation({
    args: {
        documentTitle: v.string(),
        fileId: v.optional(v.string()),
        documentContent: v.optional(v.string()),
        documentEmbeddings: v.optional(v.array(v.float64())),
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
        const documentId = await ctx.db.insert('projects', {
			  type: 'document', // Set the type to 'document'
              userId: identity.subject,
              isArchived: false,
              isPublished: false,
              parentProject: args.parentProject,

			  // Document Fields
			  documentTitle: args.documentTitle,
			  fileId: args.fileId,

			  // Project Fields (set to undefined)
			  title: undefined,
			  content: undefined,
			  noteEmbeddings: undefined,
			  isProcessed: false,
    });

	// Schedule the document processing as an internal action
    {/* await ctx.scheduler.runAfter(0, api.projects.processDocument, {
		documentId,
	  }); */}

    return { documentId };
			  // Schedule a job to process the document
			  // await ctx.scheduler.runAfter(0, api.projects.processDocument, {
				//  documentId,
			  // });
    },
});

// Get signed URL for a file
export const getFileUrl = mutation({
	args: { fileId: v.id("_storage") },
	handler: async (ctx, { fileId }) => {
	  const url = await ctx.storage.getUrl(fileId);
	  if (!url) {
		throw new Error("Failed to retrieve file URL from storage.");
	  }
	  return { url };
	},
  });

  // Update Document Content
  export const updateDocumentContent = mutation({
	args: {
	  documentId: v.id("projects"),
	  documentContent: v.string(),
	},
	handler: async (ctx, { documentId, documentContent }) => {
	  // Ensure user authentication or implement access controls if needed
	  await ctx.db.patch(documentId, {
		isProcessed: false, // reset or ensure it's false if needed
	  });
	},
  });

  // Update Document Chunks
  {/* export const updateDocumentChunks = mutation({
	args: {
	  documentId: v.id("projects"),
	  documentChunks: v.array(v.string()),
	},
	handler: async (ctx, { documentId, documentChunks }) => {
	  // Ensure user authentication or implement access controls if needed
	  await ctx.db.patch(documentId, {
		documentChunks: documentChunks,
		isProcessed: false, // reset or ensure it's false if needed
	  });
	},
  }); */}

// Additional helper functions you'll need to add to your Convex schema
export const getDocument = query({
	args: { documentId: v.id("projects") },
	handler: async (ctx, args) => {
	  return await ctx.db.get(args.documentId);
	},
  });

  export const updateDocumentProcessed = mutation({
	args: {
	  documentId: v.id("projects"),
	  isProcessed: v.boolean()
	},
	handler: async (ctx, args) => {
	  await ctx.db.patch(args.documentId, {
		isProcessed: args.isProcessed,
		processedAt: new Date().toISOString(),
	  });
	},
  });

// Mutation to update processing status
export const updateProcessingStatus = mutation({
	args: {
	  documentId: v.id("projects"),
	  isProcessed: v.boolean(),
	  processedAt: v.string(),
	},
	handler: async (
	  ctx,
	  { documentId, isProcessed, processedAt }: {
		documentId: Id<"projects">;
		isProcessed: boolean;
		processedAt: string;
	  }
	) => {
	  await ctx.db.patch(documentId, {
		isProcessed,
		processedAt,
	  });
	},
  });

export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

export const getDocuments = query({
    async handler(ctx) {
	return await ctx.db.query('projects').collect()
    },
})

export const getDocumentsByProjectId = query({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
	  const identity = await ctx.auth.getUserIdentity();
	  if (!identity) {
		throw new Error("User Not Authenticated.");
	  }
	  const userId = identity.subject;

	  const documents = await ctx.db
		.query("projects")
		.withIndex("by_user_parent", (q) =>
		  q.eq("userId", userId).eq("parentProject", args.projectId)
		)
		.filter((q) =>
		  q.and(
			q.eq(q.field("isArchived"), false),
			q.eq(q.field("type"), "document")
		  )
		)
		.collect();

	  return documents;
	},
  });

export const archive = mutation({
	args: { id: v.id("projects") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User Not Authenticated.");
		}

		const userId = identity.subject;
		const existingProject = await ctx.db.get(args.id);

		if (!existingProject) {
			throw new Error("No Existing Projects.");
		}

		if (existingProject.userId !== userId) {
			throw new Error("User not Authorized to Modify Projects.");
		}

		const recursiveArchive = async (projectId: Id<"projects">) => {
			const children = await ctx.db
			.query("projects")
			.withIndex("by_user_parent", (q) => (
				q
				.eq("userId", userId)
				.eq("parentProject", projectId)
			))
			.collect();

			for (const child of children) {
				await ctx.db.patch(child._id, {
					isArchived: true,
				});

				await recursiveArchive(child._id);
			}
		}

		const project = await ctx.db.patch(args.id, {
			isArchived: true,
		});

		recursiveArchive(args.id);

		return project;
	}
})

export const getSidebar = query({
	args: {
	  parentProject: v.optional(v.id("projects")),
	},
	handler: async (ctx, args) => {
	  const identity = await ctx.auth.getUserIdentity();

	  if (!identity) {
		throw new Error("User Not Authenticated.");
	  }

	  const userId = identity.subject;

	  const projects = await ctx.db
		.query("projects")
		.withIndex("by_user_parent", (q) =>
		  q.eq("userId", userId).eq("parentProject", args.parentProject)
		)
		.filter((q) =>
		  q.and(
			q.eq(q.field("isArchived"), false),
			q.eq(q.field("type"), "project") // Only fetch projects
		  )
		)
		.order("desc")
		.collect();

	  return projects;
	},
  });

export const create = mutation({
	args: {
		// Project Fields
		title: v.string(),
		parentProject: v.optional(v.id("projects")),
		content: v.optional(v.string()),
		isPublished: v.optional(v.boolean()),
		embeddings: v.optional(v.array(v.number())),

		// Document Fields
		documentTitle: v.optional(v.string()),
		fileId: v.optional(v.string()),
		documentContent: v.optional(v.string()),
		documentEmbeddings: v.optional(v.array(v.float64())),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User Not Authenticated.");
		}

		const userId = identity.subject;

		const project = await ctx.db.insert("projects", {
			type: 'project', // Set the type to 'project'
			// Project Fields
			title: args.title,
			parentProject: args.parentProject,
			userId,
			isArchived: false,
			isPublished: args.isPublished ?? false,
			content: args.content,
			noteEmbeddings: args.embeddings,

			// Document Fields
			documentTitle: args.documentTitle,
			fileId: args.fileId,
			isProcessed: false,
		});
	}
});

export const getTrash = query({
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User Not Authenticated.");
		}

		const userId = identity.subject;

		const projects = await ctx.db
		.query("projects")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.filter((q) =>
			q.eq(q.field("isArchived"), true),
			)
			.order("desc")
			.collect();

		return projects;
	}
});

export const restore = mutation({
	args: { id: v.id("projects") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User Not Authenticated.");
		}

		const userId = identity.subject;

		const existingProject = await ctx.db.get(args.id);

		if (!existingProject) {
			throw new Error("Project Not Found.");
		}

		if (existingProject.userId !== userId) {
			throw new Error("User not Authorized.")
		}

		const recursiveRestore = async (projectId: Id<"projects">) => {
			const children = await ctx.db
			.query("projects")
			.withIndex("by_user_parent", (q) => (
				q
				.eq("userId", userId)
				.eq("parentProject", projectId)
			))
			.collect();

			for (const child of children) {
			await ctx.db.patch(child._id, {
				isArchived: false,
			});

			await recursiveRestore(child._id);
			}
		}

		const options: Partial<Doc<"projects">> = {
			isArchived: false,
		};

		if (existingProject.parentProject) {
			const parent = await ctx.db.get(existingProject.parentProject);
			if (parent?.isArchived) {
				options.parentProject = undefined;
			}
		}

		const project = await ctx.db.patch(args.id, options);

		recursiveRestore(args.id);

		return project;
	}
});

export const remove = mutation({
	args: { id: v.id("projects") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User Not Authenticated.");
		}

		const userId = identity.subject;

		const existingProject = await ctx.db.get(args.id);

		if (!existingProject) {
			throw new Error("Not Found.");
		}

		if (existingProject.userId !== userId) {
			throw new Error("User not Authorized.");
		}

		const project = await ctx.db.delete(args.id);

		return project;
	}
});

export const getSearch = query({
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User Not Authenticated.");
		}

		const userId = identity.subject;

		const projects = await ctx.db
		.query("projects")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.filter((q) =>
		q.eq(q.field("isArchived"), false),
		)
		.order("desc")
		.collect()
		
		return projects;
	}
});

export const getById = query({
	args: { projectId: v.optional(v.id("projects")) },
	handler: async (ctx, args) => {
		if (!args.projectId) {
			return null;
		}
		
	  const identity = await ctx.auth.getUserIdentity();
  
	  const project = await ctx.db.get(args.projectId);
  
	  if (!project) {
		throw new Error("Not found");
	  }
  
	  if (project.isPublished && !project.isArchived) {
		return project;
	  }
  
	  if (!identity) {
		throw new Error("Not authenticated");
	  }
  
	  const userId = identity.subject;
  
	  if (project.userId !== userId) {
		throw new Error("Unauthorized");
	  }
  
	  return project;
	}
  });

  export const update = mutation({
	args: {
	  id: v.id("projects"),
	  title: v.optional(v.string()),
	  content: v.optional(v.string()),
	  icon: v.optional(v.string()),
	  isPublished: v.optional(v.boolean())
	},
	handler: async (ctx, args) => {
	  const identity = await ctx.auth.getUserIdentity();
  
	  if (!identity) {
		throw new Error("Unauthenticated");
	  }
  
	  const userId = identity.subject;
  
	  const { id, ...rest } = args;
  
	  const existingProject = await ctx.db.get(args.id);
  
	  if (!existingProject) {
		throw new Error("Not found");
	  }
  
	  if (existingProject.userId !== userId) {
		throw new Error("Unauthorized");
	  }
  
	  const project = await ctx.db.patch(args.id, {
		...rest,
	  });
  
	  return project;
	},
  });
// dbOps.ts
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/lib/pipe/dbOps.ts

import convexClient from "@/lib/convexClient";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Fetches a signed file URL from Convex storage for a given fileId.
 * Typically used to download the PDF prior to parsing.
 */
export async function getFileUrl(fileId: Id<"_storage">) {
  return await convexClient.mutation("projects:getFileUrl", { fileId });
}

/**
 * Updates the "processing status" fields on a given document in `projects`.
 * You can pass partial fields (e.g. just `progress` or just `isProcessing`) or all at once.
 */
export async function updateProcessingStatus(
  documentId: Id<"projects">,
  {
    progress,
    isProcessing,
    isProcessed,
    processedAt,
  }: {
    progress?: number;
    isProcessing?: boolean;
    isProcessed?: boolean;
    processedAt?: string;
  }
) {
  return await convexClient.mutation("projects:updateProcessingStatus", {
    documentId,
    progress,
    isProcessing,
    isProcessed,
    processedAt,
  });
}

/**
 * Retrieves the parentProjectId for a given document ID (if any).
 * Useful for linking newly created chunks to their parent project.
 */
export async function getParentProjectId(documentId: Id<"projects">) {
  return await convexClient.query("projects:getParentProjectId", {
    documentId,
  });
}

/**
 * Inserts multiple chunks (pageContent + metadata) into the "chunks" table
 * for a given parentProject. Typically used in a batch insertion loop.
 */
export async function insertChunks(
  parentProjectId: Id<"projects">,
  chunks: {
    pageContent: string;
    chunkNumber?: number;
    uniqueChunkId: string;
    metadata: {
      pageNumber?: number;
      docTitle?: string;
      docAuthor?: string;
      headings?: string[];
      numTokens?: number;
      snippet?: string;
    };
  }[]
) {
  return await convexClient.mutation("chunks:insertChunks", {
    parentProjectId,
    chunks,
  });
}

/**
 * Updates a single chunk's embedding vector in the "chunks" table,
 * located by its uniqueChunkId.
 */
export async function updateChunkEmbedding(
  uniqueChunkId: string,
  embedding: number[]
) {
  return await convexClient.mutation("chunks:updateChunkEmbedding", {
    uniqueChunkId,
    embedding,
  });
}
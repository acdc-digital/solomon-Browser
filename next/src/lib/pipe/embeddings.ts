// src/lib/pipe/embeddings.ts
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/lib/pipe/embeddings.ts

import { OpenAIEmbeddings } from "@langchain/openai";
import pLimit from "p-limit";

// Import your local utilities:
import { retryWithBackoff } from "./utils"; // ← Adjust path if needed
import convex from "@/lib/convexClient";    // ← Adjust path if needed

/**
 * Interface representing each chunk of text to be embedded.
 * Adjust or expand fields to match how your code tracks chunks.
 */
export interface DocChunk {
  pageContent: string;
  uniqueChunkId: string;
  // Add whatever other fields you need (e.g. snippet, metadata, etc.)
}

/**
 * Generate embeddings for an array of text chunks using OpenAI.
 * Retries with exponential backoff in case of rate limits or transient errors.
 *
 * @param docChunks  Array of chunk objects (must have `pageContent`).
 * @param openAIApiKey  Your OpenAI API key.
 * @param modelName  The OpenAI model name for embeddings (e.g., "text-embedding-ada-002").
 * @param retries  How many times to retry if an error occurs.
 * @param initialDelay  The initial backoff delay in ms (doubles each retry).
 * @returns An array of embeddings, each corresponding to docChunks[i].
 */
export async function generateEmbeddingsForChunks(
  docChunks: DocChunk[],
  openAIApiKey: string,
  modelName: string = "text-embedding-ada-002",
  retries: number = 5,
  initialDelay: number = 1000
): Promise<number[][]> {
  // Extract just the text from each chunk
  const texts = docChunks.map((c) => c.pageContent);

  // Initialize the embeddings class
  const openAIEmbeddings = new OpenAIEmbeddings({
    openAIApiKey,
    modelName,
  });

  // Wrap embedDocuments() with our retry logic
  const embeddings = await retryWithBackoff(
    () => openAIEmbeddings.embedDocuments(texts),
    retries,
    initialDelay
  );

  return embeddings;
}

/**
 * Update chunk embeddings in the database (Convex) in batches, with optional concurrency.
 * Each embedding is matched to the correct chunk via `uniqueChunkId`.
 *
 * @param docChunks  The same chunks you passed to generateEmbeddingsForChunks()
 * @param chunkEmbeddings  The array of embeddings from generateEmbeddingsForChunks()
 * @param concurrencyLimit  How many updates to run in parallel (default 1).
 * @param batchSize  How many embeddings to process per "batch" (default 250).
 * @param retries  Number of retry attempts for each item in case of transient DB errors.
 * @param initialDelay  Initial backoff delay in ms for each item’s retry sequence.
 */
export async function updateEmbeddingsInDB(
  docChunks: DocChunk[],
  chunkEmbeddings: number[][],
  concurrencyLimit: number = 1,
  batchSize: number = 250,
  retries: number = 5,
  initialDelay: number = 1000
): Promise<void> {
  // Basic validation
  if (docChunks.length !== chunkEmbeddings.length) {
    throw new Error(
      `Mismatch: docChunks has length ${docChunks.length}, but chunkEmbeddings has length ${chunkEmbeddings.length}`
    );
  }

  // Prepare batches
  const total = chunkEmbeddings.length;
  const embeddingBatches = [];
  for (let start = 0; start < total; start += batchSize) {
    const end = Math.min(start + batchSize, total);
    const batchEmbeddings = chunkEmbeddings.slice(start, end);
    const batchChunks = docChunks.slice(start, end);
    embeddingBatches.push({ batchEmbeddings, batchChunks });
  }

  console.log(`Total embedding batches: ${embeddingBatches.length}`);

  // Limit concurrency with p-limit
  const limit = pLimit(concurrencyLimit);

  // Function to update a single batch in the DB
  async function updateOneBatch(
    batchEmbeddings: number[][],
    batchChunks: DocChunk[]
  ) {
    // For each embedding-chunk pair, run a mutation with retry
    const updates = batchEmbeddings.map((embedding, idx) => {
      const { uniqueChunkId } = batchChunks[idx];
      return retryWithBackoff(
        () =>
          convex.mutation("chunks:updateChunkEmbedding", {
            uniqueChunkId,
            embedding,
          }),
        retries,
        initialDelay
      );
    });

    await Promise.all(updates);
    console.log(
      `Successfully updated a batch of ${batchEmbeddings.length} embeddings.`
    );
  }

  // Execute all batches with concurrency control
  await Promise.all(
    embeddingBatches.map(({ batchEmbeddings, batchChunks }, i) =>
      limit(() =>
        updateOneBatch(batchEmbeddings, batchChunks).catch((err) => {
          console.error(`Error updating embedding batch ${i + 1}:`, err);
          // (Optional) Decide whether to rethrow or keep going
        })
      )
    )
  );

  console.log("All chunk embeddings updated successfully.");
}
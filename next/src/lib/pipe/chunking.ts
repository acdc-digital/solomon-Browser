// src/lib/pipe/chunking.ts
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/lib/pipe/chunking.ts
// -------------------------------------------------------------------------------------

import { isHeading, splitTextByRegex } from "./utils";
// Import your existing metadata extraction helpers:
import { extractKeywords, extractEntities, assignTopics } from "./metadataExtractors";

/**
 * Represents chunk-level metadata you want to store, e.g. headings, keywords, etc.
 */
export interface ChunkMetadata {
  isHeading?: boolean;
  headings?: string[];      // Possibly store lines that look like headings
  keywords?: string[];      // e.g. extracted from chunk text
  entities?: string[];      // e.g. naive capitalized words
  topics?: string[];        // e.g. finance, AI, legal, etc.
}

/**
 * Each returned chunk now has both the text and an accompanying `metadata` object.
 */
export interface Chunk {
  pageContent: string;
  metadata: ChunkMetadata;
}

/**
 * Splits the provided text by any found markdown headings. Returns an array of
 * strings, where each is either a heading line or the content below it.
 */
export function splitByHeadings(text: string): string[] {
  if (!text) {
    console.warn("splitByHeadings: No text provided");
    return [];
  }
  try {
    const headingRegex = /^(#+\s.*)$/gm; // Regex to match markdown headings
    const parts = splitTextByRegex(text, headingRegex);
    return parts;
  } catch (e) {
    console.error("Error in splitByHeadings", e);
    return [];
  }
}

/**
 * Merges small parts to avoid creating many tiny chunks post-split. You can
 * adjust the `minSize` threshold as needed. If a part is smaller than `minSize`,
 * it is merged with the adjacent part.
 */
function mergeSmallParts(parts: string[], minSize: number): string[] {
  const merged: string[] = [];
  let buffer = "";

  for (const part of parts) {
    if (!buffer) {
      buffer = part;
    } else if ((buffer + part).length < minSize) {
      // Merge with previous buffer
      buffer += "\n" + part;
    } else {
      // Push the current buffer if it meets threshold
      merged.push(buffer);
      buffer = part;
    }
  }

  // Push any remaining content
  if (buffer) {
    merged.push(buffer);
  }

  return merged;
}

/**
 * Splits text into chunks of size `chunkSize`, each overlapping by `chunkOverlap`.
 * Overlap preserves context that might be cut at the boundary.
 */
function chunkBySizeWithOverlap(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const segment = text.slice(start, end);
    chunks.push(segment);

    // Move start by (chunkSize - overlap) to create overlap
    start += (chunkSize - chunkOverlap);
  }
  return chunks;
}

/**
 * Helper function to create a chunk object with extracted metadata.
 */
function createChunk(text: string, isHeadingChunk: boolean): Chunk {
  // Perform your metadata extraction on the chunk text
  const keywords = extractKeywords(text);
  const entities = extractEntities(text);
  const topics = assignTopics(text);

  return {
    pageContent: text,
    metadata: {
      isHeading: isHeadingChunk,
      // headings, // Optionally store sub-headings if you wish (see extractHeadingsFromText)
      keywords,
      entities,
      topics,
    },
  };
}

/**
 * Performs a more flexible, adaptive chunking strategy:
 * 1. Split by headings (if any).
 * 2. Merge very small heading sections so they don't become isolated tiny chunks.
 * 3. For each merged section, chunk it by size & overlap.
 * 4. (Optional) If a chunk is extremely large, split by sentence or tokens as a fallback.
 * 5. Extract metadata for each chunk.
 *
 * @param text         The text to chunk
 * @param chunkSize    Target size of chunks in characters (e.g., ~2000–3000)
 * @param chunkOverlap Overlap in characters (e.g., 200–300)
 */
export function hierarchicalSemanticSplit(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): Chunk[] {
  if (!text) {
    console.warn("hierarchicalSemanticSplit: No text provided");
    return [];
  }

  const chunks: Chunk[] = [];
  try {
    // 1) Split by headings
    const rawParts = splitByHeadings(text);

    // 2) Merge small sections (tweak 500 or any threshold you like)
    const mergedParts = mergeSmallParts(rawParts, 500);

    // 3) Chunk each merged section by size with overlap
    for (const part of mergedParts) {
      const trimmedPart = part.trim();

      // Decide if this entire part is a heading-like line
      // (Only do this if part is extremely short,
      //  or if you want headings as separate single-line chunks.)
      if (isHeading(trimmedPart)) {
        // If the heading line is all alone, chunk it separately
        chunks.push(createChunk(trimmedPart, true));
        continue;
      }

      // If the part is smaller than chunkSize, just create one chunk
      if (trimmedPart.length <= chunkSize) {
        chunks.push(createChunk(trimmedPart, false));
      } else {
        // 4) Optionally skip direct sentence-splitting for large text.
        //    Instead, chunk by size & overlap first:
        const largeChunks = chunkBySizeWithOverlap(trimmedPart, chunkSize, chunkOverlap);

        // (Optional) If you really want to ensure no single chunk is "too big" for
        // your LLM, you could do a further pass on each 'largeChunk' if it remains
        // extremely large (e.g., 10k+ chars). For now, we assume chunkSize is reasonable.
        for (const lc of largeChunks) {
          chunks.push(createChunk(lc, false));
        }
      }
    }
  } catch (e) {
    console.error("Error in hierarchicalSemanticSplit", e);
  }

  return chunks;
}

/**
 * Example function to detect headings in a chunk's text.
 * This is a naive approach to identifying lines in ALL CAPS
 * or lines matching a "Section ###" pattern.
 *
 * You can call this from createChunk() if you like.
 */
export function extractHeadingsFromText(text: string): string[] {
  if (!text) return [];
  const lines = text.split('\n');
  return lines.filter(line => {
    const trimmed = line.trim();
    // Example heuristic: lines in ALL CAPS or lines starting with "Section"
    return /^[A-Z\s]+$/.test(trimmed) || /^Section\s+\d+:/.test(trimmed);
  });
}

/**
 * Calculates adaptive chunking parameters based on the provided total characters
 * and some heuristic rules. Adjust the returned chunkSize and chunkOverlap
 * to suit your LLM context window. If you have a very large LLM context window
 * (e.g., 128,000 tokens), you can safely use bigger chunks (3000–6000 chars or more).
 */
export function getAdaptiveChunkParams(totalChars: number): {
  chunkSize: number;
  chunkOverlap: number;
} {
  // Example baseline:
  if (totalChars < 1000) {
    return { chunkSize: 700, chunkOverlap: 100 };
  } else if (totalChars < 5000) {
    return { chunkSize: 1500, chunkOverlap: 200 };
  } else if (totalChars < 10000) {
    return { chunkSize: 2500, chunkOverlap: 300 };
  } else if (totalChars < 50000) {
    return { chunkSize: 3000, chunkOverlap: 300 };
  } else {
    // For very large docs and large LLM context, you can push this even higher
    return { chunkSize: 4000, chunkOverlap: 400 };
  }
}
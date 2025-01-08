// src/lib/pipe/chunking.ts
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/lib/pipe/chunking.ts

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
 * Splits the provided text by any found headings. Returns an array of
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
 * Performs hierarchical semantic chunking, splitting the input text into
 * smaller chunks that maintain a semantic relationship with their surrounding
 * content. Then, for each chunk, we extract keywords, entities, and topics.
 *
 * @param text         The string of text to chunk
 * @param chunkSize    The max size of chunks in characters
 * @param chunkOverlap How many chars to overlap per chunk (not fully shown here)
 * @returns            An array of `Chunk` objects with pageContent + metadata
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

  try {
    // Step 1: Split into heading-based sections
    const parts = splitByHeadings(text); // e.g. [ "## Heading...", "Some text...", "## Next Heading...", "More text..." ]
    const chunks: Chunk[] = [];

    // Step 2: For each heading or content block returned by splitByHeadings
    for (const part of parts) {
      if (isHeading(part.trim())) {
        // This entire `part` is a heading-like line; treat as a single chunk
        chunks.push(createChunk(part, true));
      } else {
        // This is regular text; we now further split it into sub-chunks
        const sentenceRegex = /(?<=[.?!])\s+/; // Roughly split by end of sentence
        const subChunks = splitTextByRegex(part, sentenceRegex);

        for (const subChunk of subChunks) {
          if (subChunk.length < chunkSize) {
            chunks.push(createChunk(subChunk, false));
          } else {
            // If a subChunk is larger than chunkSize, split further by whitespace
            const wordRegex = /\s+/;
            const evenSmallerChunks = splitTextByRegex(subChunk, wordRegex);
            let currentChunk = "";
            for (const token of evenSmallerChunks) {
              // +1 for a space or token boundary
              if ((currentChunk + token).length < chunkSize) {
                currentChunk += token + " ";
              } else {
                chunks.push(createChunk(currentChunk, false));
                currentChunk = token + " ";
              }
            }
            if (currentChunk) {
              chunks.push(createChunk(currentChunk, false));
            }
          }
        }
      }
    }

    return chunks;
  } catch (e) {
    console.error("Error in hierarchicalSemanticSplit", e);
    return [];
  }
}

/**
 * Helper function to create a chunk object with extracted metadata.
 */
function createChunk(text: string, isHeadingChunk: boolean): Chunk {
  // Perform your metadata extraction on the chunk text
  const keywords = extractKeywords(text);
  const entities = extractEntities(text);
  const topics = assignTopics(text);

  // If you also want to detect headings inside the chunk text:
  // const headings = extractHeadingsFromText(text);

  return {
    pageContent: text,
    metadata: {
      isHeading: isHeadingChunk,
      // headings, // Uncomment if you want to store any headings found
      keywords,
      entities,
      topics,
    },
  };
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
 * and some heuristic rules. This function helps ensure that chunk sizes and overlaps
 * adapt appropriately to the total size of the input text, so it's not a fixed chunk size.
 */
export function getAdaptiveChunkParams(totalChars: number): {
  chunkSize: number;
  chunkOverlap: number;
} {
  if (totalChars < 1000) {
    return { chunkSize: 512, chunkOverlap: 50 };
  } else if (totalChars < 5000) {
    return { chunkSize: 1024, chunkOverlap: 100 };
  } else if (totalChars < 10000) {
    return { chunkSize: 1500, chunkOverlap: 200 };
  } else {
    return { chunkSize: 2048, chunkOverlap: 250 };
  }
}
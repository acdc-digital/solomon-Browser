// src/lib/pipe/chunking.ts
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/lib/pipe/chunking.ts

import { isHeading, splitTextByRegex } from "./utils";

/**
 * Splits the provided text by any found headings. Returns an array of
 * chunks, where each chunk is either a heading or the content beneath the
 * heading (up until the next heading).
 *
 * @param text The string of text to split up
 * @returns An array of sub-chunks.
 */
export function splitByHeadings(text: string): string[] {
    if (!text){
        console.warn("splitByHeadings: No text provided")
        return [];
    }
    try{
       // console.log("splitByHeadings: Text:", text.slice(0, 200) + "...");
        const headingRegex = /^(#+\s.*)$/gm; // Regex to match markdown headings
        const parts = splitTextByRegex(text, headingRegex);
        //console.log("splitByHeadings: Parts:", parts)
    return parts;
    } catch (e){
        console.error("Error in splitByHeadings", e)
        return []
    }

}

/**
 * Performs hierarchical semantic chunking, splitting the input text into
 * smaller chunks that maintain a semantic relationship with their surrounding
 * content. This is done in stages: splitting by headings first, then doing
 * a more refined chunking on each resulting section.
 *
 * @param text        The string of text to chunk
 * @param chunkSize   The max size of chunks
 * @param chunkOverlap How many chars to overlap per chunk
 * @returns           An array of sub-chunks
 */
export function hierarchicalSemanticSplit(
    text: string,
    chunkSize: number,
    chunkOverlap: number
): string[] {
    if (!text) {
        console.warn("hierarchicalSemanticSplit: No text provided")
        return [];
    }
    try{
        //console.log("hierarchicalSemanticSplit: Text:", text.slice(0, 200) + "...")
         const parts = splitByHeadings(text);
        //console.log("hierarchicalSemanticSplit: Parts:", parts)
        const chunks: string[] = [];

        for (let part of parts) {
            if (isHeading(part.trim())) {
                chunks.push(part);
                //console.log("hierarchicalSemanticSplit: Pushed Heading:", part)
            } else {
                // split the text by the regex and use that as your chunk.
                const regex = new RegExp(`(?<=[.?!])\\s+`)

               // split the part into smaller chunks that fit into the chunk size
                const subChunks = splitTextByRegex(part, regex)

                for(let subChunk of subChunks){
                   let subChunkLength = subChunk.length
                   if (subChunkLength < chunkSize){
                        chunks.push(subChunk);
                       // console.log("hierarchicalSemanticSplit: Pushed Subchunk:", subChunk)
                   }
                   else{
                    const regex = new RegExp(`\\s+`)
                    const evenSmallerChunks = splitTextByRegex(subChunk, regex)
                    let currentChunk = "";
                    for (const evenSmallerChunk of evenSmallerChunks){
                        if ((currentChunk + evenSmallerChunk).length < chunkSize){
                            currentChunk += evenSmallerChunk + " "
                        }
                        else{
                             chunks.push(currentChunk);
                           // console.log("hierarchicalSemanticSplit: Pushed Even Smaller Chunk:", currentChunk)
                             currentChunk = evenSmallerChunk + " ";
                        }
                   }
                   if(currentChunk){
                        chunks.push(currentChunk)
                        // console.log("hierarchicalSemanticSplit: Pushed Current Chunk:", currentChunk)
                   }
                }
               }

           }
        }
        //console.log("hierarchicalSemanticSplit: Chunks:", chunks)
        return chunks;
    } catch (e){
        console.error("Error in hierarchicalSemanticSplit", e)
        return [];
    }

}

/**
 * Example function to detect headings in a chunk.
 * This is a naive approach to identifying lines in ALL CAPS or matching a "Section ###" format.
 */
export function extractHeadingsFromText(text: string): string[] {
  if (!text){
    return []
  }
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
 * adapt appropriately to the total size of the input text, so there isn't one value that will not fit in the chunk size.
 *
 * @param totalChars The total character count of the input text
 * @returns        An object containing the `chunkSize` and `chunkOverlap`
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
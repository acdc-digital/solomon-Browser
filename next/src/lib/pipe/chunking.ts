// src/lib/pipe/chunking.ts
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/lib/pipe/chunking.ts

/**
 * Example function to detect headings in a chunk.
 * This is a naive approach to identifying lines in ALL CAPS or matching a "Section ###" format.
 */
export function extractHeadingsFromText(text: string): string[] {
    const lines = text.split('\n');
    return lines.filter(line => {
      const trimmed = line.trim();
      // Example heuristic: lines in ALL CAPS or lines starting with "Section"
      return /^[A-Z\s]+$/.test(trimmed) || /^Section\s+\d+:/.test(trimmed);
    });
  }
  
  /** A naive check to identify headings in text for 'hierarchical' chunking. */
  export function isLikelyHeading(line: string): boolean {
    return /^[A-Z\s]+$/.test(line.trim()) || /^Section\s+\d+:/.test(line.trim());
  }
  
  /**
   * We create a snippet from the text body, even if there's an official heading.
   * This means your chunk can have a "heading" (real or UNTITLED),
   * and also a "snippet" that is always auto-generated from the content.
   */
  export function generateSnippetFromContent(currentHeading: string, textBody: string): string {
    // 1) grab the first non-empty line
    const lines = textBody.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) {
      // If the textBody is empty, fallback
      return currentHeading === 'UNTITLED SECTION' ? 'No snippet available' : currentHeading;
    }
  
    // 2) Grab up to 50 chars from the first line
    let snippet = lines[0].slice(0, 50).trim();
    if (lines[0].length > 50) {
      snippet += '...';
    }
  
    // 3) Return the snippet
    return snippet;
  }
  
  /**
   * Example function to split a string into sections based on headings.
   * If no "official" heading is found, we auto-generate a heading
   * from the first line or snippet of the chunk’s content.
   *
   * Returns an array of { heading, snippet, body } objects.
   */
  export function splitByHeadings(text: string): { heading: string; snippet: string; body: string }[] {
    const lines = text.split('\n');
    const sections: { heading: string; snippet: string; body: string }[] = [];
    let currentHeading = 'UNTITLED SECTION';
    let currentBuffer = '';
  
    for (const line of lines) {
      if (isLikelyHeading(line)) {
        // If we have an existing buffer, push it with the current heading
        if (currentBuffer.trim().length > 0) {
          const heading = currentHeading;
          const snippet = generateSnippetFromContent(currentHeading, currentBuffer);
          sections.push({ heading, snippet, body: currentBuffer });
        }
        currentHeading = line.trim();
        currentBuffer = '';
      } else {
        currentBuffer += `${line}\n`;
      }
    }
  
    // Push the last buffer if it exists
    if (currentBuffer.trim().length > 0) {
      const heading = currentHeading;
      const snippet = generateSnippetFromContent(currentHeading, currentBuffer);
      sections.push({ heading, snippet, body: currentBuffer });
    }
  
    return sections;
  }
  
  /**
   * Split paragraphs within each heading section. Uses naive blank-line detection:
   * paragraphs are delimited by one or more blank lines.
   */
  export function splitByParagraphs(text: string): string[] {
    return text
      .split(/\n\s*\n/) // split by one+ blank lines
      .map(p => p.trim())
      .filter(Boolean);
  }
  
  /**
   * A simple character-based splitter with overlap. Use this if a paragraph or chunk is still too large.
   */
  export function charBasedSplit(
    text: string,
    chunkSize: number,
    chunkOverlap: number
  ): string[] {
    const chunks: string[] = [];
    let start = 0;
  
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start += (chunkSize - chunkOverlap);
    }
  
    return chunks;
  }
  
  /**
   * Semantic splitter that tries to split text by sentences (very naively),
   * then enforces max length constraints with overlap.
   * The 'maxTokens' and 'overlapTokens' are approximate; for real usage,
   * you’d convert to tokens or count more precisely.
   */
  export function semanticSplit(
    text: string,
    maxTokens: number,
    overlapTokens: number
  ): string[] {
    // Very naive sentence split (regex-based). In production, consider an NLP library.
    const sentences = text.split(/(?<=[.?!])\s+/);
    const chunks: string[] = [];
    let currentChunk = '';
  
    for (const sentence of sentences) {
      // If adding the new sentence would exceed maxTokens, push currentChunk
      if ((currentChunk + sentence).length > maxTokens) {
        chunks.push(currentChunk);
  
        // Add overlap from the end of currentChunk
        const overlap = currentChunk.slice(
          Math.max(0, currentChunk.length - overlapTokens)
        );
        // Start a fresh chunk with the overlap plus the new sentence
        currentChunk = overlap + ' ' + sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }
  
    if (currentChunk) {
      chunks.push(currentChunk);
    }
  
    return chunks;
  }
  
  /**
   * A "hierarchical + semantic" splitter. First we:
   * 1) Split by headings -> sections
   * 2) Split each section by paragraphs
   * 3) If a paragraph is still too large, do a semantic split
   * 4) If chunk is still large, fallback to char-based splitting
   */
  export function hierarchicalSemanticSplit(
    text: string,
    chunkSize: number,
    chunkOverlap: number
  ): string[] {
    const sections = splitByHeadings(text); // returns heading, snippet, body
    const finalChunks: string[] = [];
  
    for (const section of sections) {
      // We might store snippet or heading in the chunk text.
      const combinedHeading = `${section.heading}\nSnippet: ${section.snippet}`;
  
      // 1) Split into paragraphs
      const paragraphs = splitByParagraphs(section.body);
  
      for (const paragraph of paragraphs) {
        if (paragraph.length > chunkSize) {
          // 2) Attempt a semantic split first
          const semChunks = semanticSplit(paragraph, chunkSize, chunkOverlap);
  
          for (const semChunk of semChunks) {
            if (semChunk.length > chunkSize) {
              // 3) Fallback to char-based splitting
              const charChunks = charBasedSplit(semChunk, chunkSize, chunkOverlap);
              for (const cChunk of charChunks) {
                finalChunks.push(`${combinedHeading}\n${cChunk}`);
              }
            } else {
              finalChunks.push(`${combinedHeading}\n${semChunk}`);
            }
          }
        } else {
          finalChunks.push(`${combinedHeading}\n${paragraph}`);
        }
      }
    }
  
    return finalChunks;
  }
  
  /**
   * Demonstration of adaptive chunk sizing:
   * - Adjust chunkSize & chunkOverlap based on total number of characters in doc.
   * - This can help smaller docs produce smaller chunks with bigger overlap, or vice versa.
   */
  export function getAdaptiveChunkParams(totalChars: number) {
    if (totalChars < 5000) {
      // smaller doc -> smaller chunkSize but bigger overlap
      return { chunkSize: 500, chunkOverlap: 100 };
    } else if (totalChars < 50000) {
      // medium doc
      return { chunkSize: 1000, chunkOverlap: 200 };
    } else {
      // large doc
      return { chunkSize: 1500, chunkOverlap: 200 }; // or any logic you prefer
    }
  }
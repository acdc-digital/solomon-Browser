// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/app/api/parse-pdf/route.ts
// /src/app/api/parse-pdf/route.ts

import { NextResponse } from 'next/server';
import convex from '@/lib/convexClient';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
// We still import RecursiveCharacterTextSplitter for potential fallback or partial usage
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { get_encoding } from "tiktoken";

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch'; // Ensure node-fetch is installed

// Create a tokenizer:
const tokenizer = get_encoding("cl100k_base");

export const runtime = "nodejs";

/** Example function to detect headings in a chunk. */
function extractHeadingsFromText(text: string): string[] {
  const lines = text.split('\n');
  return lines.filter(line => {
    const trimmed = line.trim();
    // Example heuristic: lines in ALL CAPS or lines starting with "Section"
    return /^[A-Z\s]+$/.test(trimmed) || /^Section\s+\d+:/.test(trimmed);
  });
}

/** A naive check to identify headings in text for 'hierarchical' chunking. */
function isLikelyHeading(line: string): boolean {
  return /^[A-Z\s]+$/.test(line.trim()) || /^Section\s+\d+:/.test(line.trim());
}

/**
 * Example function to split a string into sections based on headings.
 * Returns array of { heading, body } objects.
 */
function splitByHeadings(text: string): { heading: string; body: string }[] {
  const lines = text.split('\n');
  const sections: { heading: string; body: string }[] = [];
  let currentHeading = 'UNTITLED SECTION';
  let currentBuffer = '';

  for (const line of lines) {
    if (isLikelyHeading(line)) {
      // Push the existing buffer to a section
      if (currentBuffer.trim().length > 0) {
        sections.push({ heading: currentHeading, body: currentBuffer });
      }
      currentHeading = line.trim();
      currentBuffer = '';
    } else {
      currentBuffer += `${line}\n`;
    }
  }

  // Push the last buffer if it exists
  if (currentBuffer.trim().length > 0) {
    sections.push({ heading: currentHeading, body: currentBuffer });
  }

  return sections;
}

/** Split paragraphs within each heading section. Uses naive blank line detection. */
function splitByParagraphs(text: string): string[] {
  // Paragraphs delimited by one or more blank lines
  return text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
}

/**
 * Additional fallback: a simple character-based splitter with overlap.
 * This helps if a paragraph is still too large.
 */
function charBasedSplit(
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
 * Semantic splitter that tries to split text by sentences.
 * For example, we split at each period, question mark, exclamation mark, etc.
 * Then enforce max length constraints with overlap.
 */
function semanticSplit(
  text: string,
  maxTokens: number,
  overlapTokens: number
): string[] {
  // Very naive sentence split (regex-based). In production, consider an NLP library.
  const sentences = text.split(/(?<=[.?!])\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxTokens) {
      // push the current chunk
      chunks.push(currentChunk);
      // add overlap from the end of currentChunk
      const overlap = currentChunk.slice(
        Math.max(0, currentChunk.length - overlapTokens)
      );
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
 * A combined hierarchical + semantic approach:
 * 1) Split by headings -> sections
 * 2) Within each section, split by paragraphs
 * 3) If paragraphs are too large, do a semantic or char-based split
 */
function hierarchicalSemanticSplit(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): string[] {
  const sections = splitByHeadings(text);
  const finalChunks: string[] = [];

  for (const section of sections) {
    // Break the section into paragraphs
    const paragraphs = splitByParagraphs(section.body);

    for (const paragraph of paragraphs) {
      // If paragraph is bigger than chunkSize, do further splits
      if (paragraph.length > chunkSize) {
        // Option A: semantic split
        const semChunks = semanticSplit(paragraph, chunkSize, chunkOverlap);

        // If any sem-split chunk is STILL bigger than chunkSize,
        // fallback to char-based
        for (const semChunk of semChunks) {
          if (semChunk.length > chunkSize) {
            // fallback
            const charChunks = charBasedSplit(semChunk, chunkSize, chunkOverlap);
            // Prepend the heading for context
            for (const cChunk of charChunks) {
              finalChunks.push(`${section.heading}\n${cChunk}`);
            }
          } else {
            finalChunks.push(`${section.heading}\n${semChunk}`);
          }
        }
      } else {
        // If paragraph is within chunk size, just store it with heading
        finalChunks.push(`${section.heading}\n${paragraph}`);
      }
    }
  }
  return finalChunks;
}

/**
 * Demonstration of adaptive chunk sizing:
 * - Adjust chunkSize & chunkOverlap based on total number of characters in doc.
 */
function getAdaptiveChunkParams(totalChars: number) {
  if (totalChars < 5000) {
    // smaller doc -> smaller chunkSize but bigger overlap
    return { chunkSize: 500, chunkOverlap: 100 };
  } else if (totalChars < 50000) {
    // medium doc
    return { chunkSize: 1000, chunkOverlap: 200 };
  } else {
    // large doc
    return { chunkSize: 2000, chunkOverlap: 200 };
  }
}

export async function POST(request: Request) {
  let tempFilePath = '';

  try {
    // -------------------------
    // Step 1: Parse the Incoming JSON Body
    // -------------------------
    const { documentId, fileId } = await request.json();
    console.log('Received POST request with:', { documentId, fileId });

    // Step 2: Validate Input
    if (!documentId || !fileId) {
      console.error('Validation failed: Missing documentId or fileId');
      return NextResponse.json(
        { error: 'documentId and fileId are required' },
        { status: 400 }
      );
    }

    // Step 3: Validate fileId
    if (typeof fileId !== 'string' || fileId.trim() === '') {
      console.error('Invalid fileId provided.');
      return NextResponse.json(
        { error: 'Invalid fileId provided.' },
        { status: 400 }
      );
    }

    // -------------------------
    // Step 4: Invoke Convex Mutation to Get the PDF URL
    // -------------------------
    console.log('Invoking Convex mutation: projects:getFileUrl');
    const response = await convex.mutation('projects:getFileUrl', { fileId });
    if (!response || !response.url) {
      console.error('No URL returned for PDF');
      return NextResponse.json(
        { error: 'No URL returned for PDF' },
        { status: 400 }
      );
    }

    console.log('PDF URL:', response.url);

    // -------------------------
    // Step 5: Fetch the PDF
    // -------------------------
    console.log('Fetching the PDF from the URL');
    const pdfResponse = await fetch(response.url);
    if (!pdfResponse.ok) {
      console.error('Failed to fetch PDF:', pdfResponse.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch PDF' },
        { status: 500 }
      );
    }

    // Update processing status (progress: 10)
    await convex.mutation('projects:updateProcessingStatus', {
      documentId,
      progress: 10,
      isProcessing: true, // Mark as processing if not yet set
    });

    // -------------------------
    // Step 6: Parse the PDF to Extract Text
    // -------------------------
    console.log('Parsing the PDF to extract text');

    // Download and save the PDF to a temporary file
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    tempFilePath = path.join(tempDir, `${fileId}.pdf`);

    const arrayBuffer = await pdfResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(tempFilePath, buffer);
    console.log('PDF saved to:', tempFilePath);

    // Create a loader that keeps per-page metadata
    const loader = new PDFLoader(tempFilePath, {
      splitPages: true, // Each page is a separate document
    });
    const docs = await loader.load();
    if (!docs.length) {
      throw new Error("No content extracted from the document.");
    }
    console.log("Total pages (docs) loaded:", docs.length);

    // Print sample metadata for debugging
    console.log("Sample metadata:", docs[0].metadata);

    // Combine extracted text (for debugging or raw usage)
    const extractedText = docs.map(doc => doc.pageContent).join('\n');
    console.log('Extracted Text:', extractedText.slice(0, 300) + '...');

    // Update progress to 30
    await convex.mutation('projects:updateProcessingStatus', {
      documentId,
      progress: 30,
    });

    // -------------------------
    // Step 7: Enhanced Split Each Page-Document into Sub-chunks
    // -------------------------
    console.log('Splitting the document into chunks');

    // 7a) Determine total length to pick adaptive chunk size
    const totalChars = docs.reduce((acc, doc) => acc + doc.pageContent.length, 0);
    const { chunkSize, chunkOverlap } = getAdaptiveChunkParams(totalChars);
    console.log(`Adaptive chunkSize=${chunkSize}, chunkOverlap=${chunkOverlap}`);

    const allChunks = [];
    for (let pageIndex = 0; pageIndex < docs.length; pageIndex++) {
      const pageDoc = docs[pageIndex];
      const pageNumber = pageDoc.metadata?.loc?.pageNumber ?? pageIndex + 1;
      const docTitle = pageDoc.metadata?.title || "Untitled";
      const docAuthor = pageDoc.metadata?.author || "Unknown";

      // Instead of using RecursiveCharacterTextSplitter directly,
      // we apply hierarchical + semantic chunking:
      const pageChunks = hierarchicalSemanticSplit(
        pageDoc.pageContent,
        chunkSize,
        chunkOverlap
      );

      // For each final chunk, gather the headings for that text
      for (const chunkText of pageChunks) {
        const headings = extractHeadingsFromText(chunkText);
        // Tokenize chunk
        const tokens = tokenizer.encode(chunkText);
        const numTokens = tokens.length;

        // **Log** the token count for debugging
        console.log(
          `[Tokenization] Page #${pageIndex + 1}, chunk length: ${chunkText.length}, tokens: ${numTokens}`
        );

        allChunks.push({
          pageContent: chunkText,
          metadata: {
            pageNumber,
            docTitle,
            docAuthor,
            headings: extractHeadingsFromText(chunkText),
            numTokens,
            // rawTokens: tokens, // if you want to store the tokens
          },
        });
      }
    }

    // Number them globally
    const docChunks = allChunks.map((item, index) => ({
      ...item,
      chunkNumber: index + 1,
    }));

    console.log('Total number of sub-chunks across all pages:', docChunks.length);

    // Update progress to 50
    await convex.mutation('projects:updateProcessingStatus', {
      documentId,
      progress: 50,
    });

    // -------------------------
    // Step 8: Retrieve parentProjectId from documentId
    // -------------------------
    console.log('Retrieving parentProjectId from documentId:', documentId);
    const parentProjectId = await convex.query('projects:getParentProjectId', { documentId });
    if (!parentProjectId) {
      console.error(`No parentProjectId found for documentId: ${documentId}`);
      return NextResponse.json(
        { error: 'Invalid documentId: parentProjectId not found.' },
        { status: 400 }
      );
    }
    console.log('Retrieved parentProjectId:', parentProjectId);

    // -------------------------
    // Step 9: Insert Chunks into the chunks Table
    // -------------------------
    console.log('Inserting chunks into the database');
    try {
      // Prepare chunk docs for batch insert
      const chunkDocs = docChunks.map((chunk) => ({
        pageContent: chunk.pageContent,
        chunkNumber: chunk.chunkNumber,
        metadata: {
          pageNumber: chunk.metadata.pageNumber,
          docTitle: chunk.metadata.docTitle,
          docAuthor: chunk.metadata.docAuthor,
          headings: chunk.metadata.headings,
          numTokens: chunk.metadata.numTokens,
        },
      }));

      await convex.mutation('chunks:insertChunks', {
        parentProjectId,
        chunks: chunkDocs,
      });

      console.log('All chunks inserted successfully.');

      // (Optional) Mark doc as processed
      await convex.mutation('projects:updateProcessingStatus', {
        documentId,
        isProcessing: false, // done inserting
        isProcessed: true,   // if you store this at the project level
        processedAt: new Date().toISOString(),
      });
    } catch (insertError: any) {
      console.error('Error inserting chunks:', insertError);
      return NextResponse.json(
        { error: 'Error inserting chunks' },
        { status: 500 }
      );
    }

    // Update progress to 70
    await convex.mutation('projects:updateProcessingStatus', {
      documentId,
      progress: 70,
    });

    // -------------------------
    // Step 10: Generate Embeddings for Chunks
    // -------------------------
    console.log('Generating embeddings for the chunks');
    const openAIEmbeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    // Get text from each chunk to embed
    const textsForEmbedding = docChunks.map((c) => c.pageContent);
    const chunkEmbeddings: number[][] = await openAIEmbeddings.embedDocuments(textsForEmbedding);
    console.log('Generated Embeddings:', chunkEmbeddings.length);

    // Update progress to 90
    await convex.mutation('projects:updateProcessingStatus', {
      documentId,
      progress: 90,
    });

    // -------------------------
    // Step 11: Update Each Chunk with Its Embedding
    // -------------------------
    console.log('Updating chunk embeddings in the database');
    try {
      await Promise.all(
        chunkEmbeddings.map((embedding, index) =>
          convex.mutation('chunks:updateChunkEmbedding', {
            parentProjectId,
            chunkNumber: docChunks[index].chunkNumber,
            embedding,
          })
        )
      );

      console.log('All chunk embeddings updated successfully.');

      // Mark final progress as 100
      await convex.mutation('projects:updateProcessingStatus', {
        documentId,
        isProcessing: false,
        progress: 100,
      });

      // Return final response
      return NextResponse.json(
        {
          pdfUrl: response.url,
          text: extractedText,
          chunks: docChunks,
          embeddingsGenerated: chunkEmbeddings.length
        },
        { status: 200 }
      );
    } catch (embeddingsError: any) {
      console.error('Error updating chunk embeddings:', embeddingsError);
      return NextResponse.json(
        { error: 'Error updating chunk embeddings' },
        { status: 500 }
      );
    }

    tokenizer.free();

  } catch (error: any) {
    console.error('Error handling POST request:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  } finally {
    // Cleanup
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log('Temporary file deleted.');
    }
  }
}
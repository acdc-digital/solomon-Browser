// RAG Pipeline
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/app/api/parse-pdf/route.ts

import { NextResponse } from 'next/server';
import convex from '@/lib/convexClient';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { get_encoding } from "tiktoken";

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch'; // Ensure node-fetch is installed
import pLimit from 'p-limit';    // For controlled concurrency

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
 * If no "official" heading is found, we auto-generate a heading
 * from the first line or snippet of the chunk’s content.
 *
 * Now we return both the 'heading' and 'snippet'.
 */
function splitByHeadings(text: string): { heading: string; snippet: string; body: string }[] {
  const lines = text.split('\n');
  const sections: { heading: string; snippet: string; body: string }[] = [];
  let currentHeading = 'UNTITLED SECTION';
  let currentBuffer = '';

  for (const line of lines) {
    if (isLikelyHeading(line)) {
      // If we have an existing buffer, push it with the current heading
      if (currentBuffer.trim().length > 0) {
        // We'll generate both official heading and snippet at once
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
 * We create a snippet from the text body, even if there's an official heading.
 * This means your chunk can have a "heading" (real or UNTITLED),
 * and also a "snippet" that is always auto-generated from content.
 */
function generateSnippetFromContent(currentHeading: string, textBody: string): string {
  // 1) grab the first non-empty line
  const lines = textBody.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) {
    // If the textBody is empty, fallback
    return currentHeading === 'UNTITLED SECTION' ? 'No snippet available' : currentHeading;
  }

  // 2) Grab up to 50 chars from the first line
  let snippet = lines[0].slice(0, 50).trim();
  if (lines[0].length > 50) snippet += '...';

  // 3) Return the snippet (without "Heading:" prefix, so it's purely content)
  return snippet;
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

function hierarchicalSemanticSplit(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): string[] {
  // Notice we are returning an array of strings below, so we must embed
  // both heading + snippet in our final chunk string if we want them in the text,
  // or we can store them in an object. Let’s keep it simple for now.

  const sections = splitByHeadings(text); // returns heading, snippet, body
  const finalChunks: string[] = [];

  for (const section of sections) {
    // Example: we might store the snippet in the text
    const combinedHeading = `${section.heading}\nSnippet: ${section.snippet}`;

    // Now do paragraphs, char-based fallback, etc.
    const paragraphs = splitByParagraphs(section.body);

    for (const paragraph of paragraphs) {
      if (paragraph.length > chunkSize) {
        const semChunks = semanticSplit(paragraph, chunkSize, chunkOverlap);

        for (const semChunk of semChunks) {
          if (semChunk.length > chunkSize) {
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

// ---------------------------
// OCR Helper Functions
// ---------------------------

/**
 * Convert a single page of a PDF to PNG using pdf2pic.
 * Returns the path to the output image file.
 */
async function convertPdfPageToImage(pdfPath: string, pageNumber: number): Promise<string> {
  const outputDir = path.join(path.dirname(pdfPath), "ocr_images");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const options = {
    density: 300,
    savePath: outputDir,
    saveFilename: `page_${pageNumber}`,
    format: "png",
    width: 1280,
    height: 720,
  };

  const storeAsImage = pdf2picFromPath(pdfPath, options);
  // pdf2pic pageNumber is 1-based
  const result = await storeAsImage(pageNumber);
  return result.path; // path to the saved PNG
}

/**
 * Perform OCR on a single page of the PDF using Tesseract.
 * 1) Convert PDF page -> image
 * 2) Run Tesseract on the image
 * 3) Return recognized text
 */
async function runOcrOnPage(pdfPath: string, pageIndex: number): Promise<string> {
  try {
    const pageNumber = pageIndex + 1;
    console.log(`Starting OCR for Page #${pageNumber}`);

    const imagePath = await convertPdfPageToImage(pdfPath, pageNumber);
    console.log(`Converted Page #${pageNumber} to Image: ${imagePath}`);

    // Tesseract OCR
    const result = await Tesseract.recognize(imagePath, "eng");
    const ocrText = result.data.text || "";
    console.log(`OCR Result for Page #${pageNumber}: ${ocrText.slice(0, 100)}...`); // Log first 100 chars

    // Clean up image file
    fs.unlinkSync(imagePath);
    console.log(`Cleaned up Image File: ${imagePath}`);

    return ocrText;
  } catch (err) {
    console.error(`Error running OCR on page ${pageIndex + 1}:`, err);
    return ""; // fallback
  }
}

/**
 * The main POST handler that:
 * 1) Fetches the PDF
 * 2) Loads text with PDFLoader
 * 3) If text is short for a page => do OCR fallback
 * 4) Splits into chunks + metadata
 * 5) Embeds + updates DB
 */
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

        const snippetMatch = chunkText.match(/Snippet:\s*(.*)\n/);
        const snippet = snippetMatch ? snippetMatch[1].trim() : "";

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
            snippet,
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
          snippet: chunk.metadata.snippet,
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
      modelName: "text-embedding-ada-002", // Corrected model name
    });

    // Get text from each chunk to embed
    const textsForEmbedding = docChunks.map((c) => c.pageContent);
    let chunkEmbeddings: number[][] = [];

    try {
      chunkEmbeddings = await openAIEmbeddings.embedDocuments(textsForEmbedding);
      console.log('Generated Embeddings:', chunkEmbeddings.length);
      console.log('Embedding Dimensions:', chunkEmbeddings[0].length); // Should be 1536
    } catch (embeddingError: any) {
      console.error('Error generating embeddings:', embeddingError);
      throw new Error('Failed to generate embeddings.');
    }

    // Update progress to 90
    await convex.mutation('projects:updateProcessingStatus', {
      documentId,
      progress: 90,
    });

    // -------------------------
    // Step 11: Update Each Chunk with Its Embedding
    // -------------------------
    console.log('Updating chunk embeddings in the database');

    // Define concurrency limit (e.g., 5 simultaneous mutations)
    const limit = pLimit(5);

    try {
      await Promise.all(
        chunkEmbeddings.map((embedding, index) => {
          const chunkNumber = docChunks[index].chunkNumber;
          console.log(`Updating embedding for Chunk #${chunkNumber}:`, {
            parentProjectId,
            chunkNumber,
            embeddingSnippet: embedding.slice(0, 5), // Log first 5 values
          });

          return limit(() =>
            convex.mutation('chunks:updateChunkEmbedding', {
              parentProjectId,
              chunkNumber: chunkNumber,
              embedding: embedding,
            }).then(() => {
              console.log(`Successfully updated embedding for Chunk #${chunkNumber}`);
            }).catch((error) => {
              console.error(`Failed to update embedding for Chunk #${chunkNumber}:`, error);
            })
          );
        })
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
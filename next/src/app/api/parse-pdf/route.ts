// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/app/api/parse-pdf/route.ts
// /src/app/api/parse-pdf/route.ts

import { NextResponse } from 'next/server';
import convex from '@/lib/convexClient';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch'; // Ensure node-fetch is installed

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
    // Step 7: Split Each Page-Document into Sub-chunks
    // -------------------------
    console.log('Splitting the document into chunks');
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", " ", ""],
    });

    const allChunks = [];
    for (let pageIndex = 0; pageIndex < docs.length; pageIndex++) {
      const pageDoc = docs[pageIndex];

      // If PDFLoader returns pageNumber in metadata
      const pageNumber = pageDoc.metadata?.loc?.pageNumber ?? pageIndex + 1;
      // Potential docTitle/author from PDF metadata
      const docTitle = pageDoc.metadata?.title || "Untitled";
      const docAuthor = pageDoc.metadata?.author || "Unknown";

      // Do a chunk split for this page
      const pageChunks = await textSplitter.splitDocuments([pageDoc]);

      // Create chunk objects that include metadata
      for (const chunkedDoc of pageChunks) {
        const headings = extractHeadingsFromText(chunkedDoc.pageContent);

        allChunks.push({
          pageContent: chunkedDoc.pageContent,
          metadata: {
            pageNumber,
            docTitle,
            docAuthor,
            headings,
          }
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
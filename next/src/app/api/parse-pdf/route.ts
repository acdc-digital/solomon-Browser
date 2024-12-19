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

export async function POST(request: Request) {
  let tempFilePath = '';

  try {
    // **Step 1: Parse the Incoming JSON Body**
    const { documentId, fileId } = await request.json();
    console.log('Received POST request with:', { documentId, fileId });

    // **Step 2: Validate Input**
    if (!documentId || !fileId) {
      console.error('Validation failed: Missing documentId or fileId');
      return NextResponse.json(
        { error: 'documentId and fileId are required' },
        { status: 400 }
      );
    }

    // **Step 3: Validate fileId**
    if (typeof fileId !== 'string' || fileId.trim() === '') {
      console.error('Invalid fileId provided.');
      return NextResponse.json(
        { error: 'Invalid fileId provided.' },
        { status: 400 }
      );
    }

    // **Step 4: Invoke the Convex Mutation to Get the PDF URL**
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

    // **Step 5: Fetch the PDF from the URL**
    console.log('Fetching the PDF from the URL');
    const pdfResponse = await fetch(response.url);

    if (!pdfResponse.ok) {
      console.error('Failed to fetch PDF:', pdfResponse.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch PDF' },
        { status: 500 }
      );
    }

    await convex.mutation('projects:updateProcessingStatus', {
      documentId,
      progress: 10, // Update progress after fetching
    });

    // **Step 6: Parse the PDF to Extract Text**
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

    // Parse the PDF using PDFLoader
    const loader = new PDFLoader(tempFilePath);
    const docs = await loader.load();

    if (!docs.length) {
      throw new Error("No content extracted from the document.");
    }
    console.log("Loaded docs:", docs.length);

    // Extract text from docs
    const extractedText = docs.map(doc => doc.pageContent).join('\n');
    console.log('Extracted Text:', extractedText);

    await convex.mutation('projects:updateProcessingStatus', {
      documentId,
      progress: 30, // Update progress after parsing
    });

    // **Step 7: Split the Document into Chunks**
    console.log('Splitting the document into chunks');

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,    // Adjust based on your needs
      chunkOverlap: 200,  // Adjust based on your needs
      separators: ["\n\n", "\n", " ", ""],
    });

    const splitDocs = await textSplitter.splitDocuments(docs);
    let docChunks = splitDocs.map((doc) => doc.pageContent);

    // Add numbering to each chunk
    docChunks = docChunks.map((chunk, index) => `Chunk ${index + 1}:\n${chunk}`);

    console.log('Number of Chunks:', docChunks.length);
    console.log('Preview of first chunk:', docChunks[0]);

    await convex.mutation('projects:updateProcessingStatus', {
      documentId,
      progress: 50, // Update progress after chunking
    });

    // **Step 8: Retrieve parentProjectId from documentId**
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

    // **Step 9: Insert Chunks into the `chunks` Table**
    console.log('Inserting chunks into the database');
    try {
      // Batch insert chunks for efficiency
      const chunkDocs = docChunks.map((chunk, index) => ({
        pageContent: chunk,
        chunkNumber: index + 1,
      }));

      await convex.mutation('chunks:insertChunks', {
        parentProjectId, // Updated: Use parentProjectId instead of projectId
        chunks: chunkDocs,
      });

      console.log('All chunks inserted successfully.');

      // Optionally, update the document's `isProcessed` and `processedAt` fields
      await convex.mutation('projects:updateProcessingStatus', {
        documentId,
        isProcessing: false, // Set to 'false' if processing is complete
        processedAt: new Date().toISOString(),
        progress: 100, // Assuming processing is complete
      });

    } catch (insertError: any) {
      console.error('Error inserting chunks:', insertError);
      return NextResponse.json(
        { error: 'Error inserting chunks' },
        { status: 500 }
      );
    }

    await convex.mutation('projects:updateProcessingStatus', {
      documentId,
      progress: 70, // Update progress after chunk insertion
    });

    // **Step 10: Generate and Store Embeddings for Chunks**
    console.log('Generating embeddings for the chunks');

    // Initialize OpenAIEmbeddings with your API key
    const openAIEmbeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY, // Ensure this is set in your environment variables
    });

    // Generate embeddings for the chunks
    const chunkEmbeddings: number[][] = await openAIEmbeddings.embedDocuments(docChunks);
    console.log('Generated Embeddings:', chunkEmbeddings.length);

    await convex.mutation('projects:updateProcessingStatus', {
      documentId,
      progress: 90, // Update progress after generating embeddings
    });

    // **Step 11: Update the Embeddings for Each Chunk in the Database**
    console.log('Updating chunk embeddings in the database');
    try {
      // Perform concurrent updates
      await Promise.all(chunkEmbeddings.map((embedding, index) =>
        convex.mutation('chunks:updateChunkEmbedding', {
          parentProjectId, // Updated: Use parentProjectId instead of projectId
          chunkNumber: index + 1,
          embedding,
        })
      ));

      console.log('All chunk embeddings updated successfully.');

      await convex.mutation('projects:updateProcessingStatus', {
        documentId,
        isProcessing: false, // Mark as not processing
        progress: 100, // Final progress update
      });

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
    // Clean up: Delete the temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log('Temporary file deleted.');
    }
  }
}
// /src/app/api/parse-pdf/route.ts

import { NextResponse } from 'next/server';
import convex from '@/lib/convexClient';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { CacheBackedEmbeddings } from "langchain/embeddings/cache_backed";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ConvexKVStore } from "@langchain/community/storage/convex";
import { ConvexVectorStore } from "@langchain/community/vectorstores/convex";
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch'; // Ensure node-fetch is installed

export const runtime = "nodejs";

export async function POST(request: Request) {
  let tempFilePath = '';

  try {
    // Parse the incoming JSON body
    const { documentId, fileId } = await request.json();
    console.log('Received POST request with:', { documentId, fileId });

    // Validate input
    if (!documentId || !fileId) {
      console.error('Validation failed: Missing documentId or fileId');
      return NextResponse.json(
        { error: 'documentId and fileId are required' },
        { status: 400 }
      );
    }

    // Validate fileId
    if (typeof fileId !== 'string' || fileId.trim() === '') {
      console.error('Invalid fileId provided.');
      return NextResponse.json(
        { error: 'Invalid fileId provided.' },
        { status: 400 }
      );
    }

    // Invoke the Convex mutation to get the PDF URL
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

    // **Step 2: Fetch the PDF from the URL**
    console.log('Fetching the PDF from the URL');
    const pdfResponse = await fetch(response.url);

    if (!pdfResponse.ok) {
      console.error('Failed to fetch PDF:', pdfResponse.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch PDF' },
        { status: 500 }
      );
    }

    // **Step 3: Parse the PDF to Extract Text**
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

    // **Step 4: Split the Document into Chunks**
    console.log('Splitting the document into chunks');

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,    // Adjust based on your needs
      chunkOverlap: 200,  // Adjust based on your needs
    });

    const splitDocs = await textSplitter.splitDocuments(docs);
    const docChunks = splitDocs.map((doc) => doc.pageContent);

    console.log('Number of Chunks:', docChunks.length);

    // **Step 5: Update the Document Content in the Database**
    console.log('Updating document content in the database');
    try {
      const updateResponse = await convex.mutation('projects:updateDocumentContent', {
        documentId,
        documentContent: extractedText,
        documentChunks: docChunks, // Include the chunks
      });

      console.log('Update Response:', updateResponse);
    } catch (updateError: any) {
      console.error('Error updating document content:', updateError);
      return NextResponse.json(
        { error: 'Error updating document content' },
        { status: 500 }
      );
    }

    // **Step 6: Generate and Store Embeddings**
    console.log('Generating embeddings for the chunks');

    // Initialize OpenAIEmbeddings with your API key
    const openAIEmbeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY, // Ensure this is set in your environment variables
    });

    // Generate embeddings for the chunks
    const chunkEmbeddings: number[][] = await openAIEmbeddings.embedDocuments(docChunks);
    console.log('Generated Embeddings:', chunkEmbeddings.length);

    // Average embeddings into one representative vector
    const documentEmbedding: number[] = chunkEmbeddings[0].map((_, i) =>
      chunkEmbeddings.reduce((sum, vec) => sum + vec[i], 0) / chunkEmbeddings.length
    );
    console.log("Averaged document embedding:", documentEmbedding);

    // **Step 7: Update the Document with Embeddings in the Database**
    console.log('Updating document embeddings in the database');
    try {
      const embeddingsUpdateResponse = await convex.mutation('projects:updateDocumentEmbeddings', {
        documentId,
        documentEmbeddings: documentEmbedding, // Correct: Passing number[] instead of number[][]
      });

      console.log('Embeddings Update Response:', embeddingsUpdateResponse);

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
      console.error('Error updating embeddings:', embeddingsError);
      return NextResponse.json(
        { error: 'Error updating embeddings' },
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
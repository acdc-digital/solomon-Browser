// /src/app/api/parse-pdf/route.ts

import { NextResponse } from 'next/server';
import convex from '@/lib/convexClient';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch'; // Ensure node-fetch is installed

export const runtime = "nodejs";

export async function POST(request: Request) {
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

    // Invoke the Convex mutation using the Client SDK
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
    const tempFilePath = path.join(tempDir, `${fileId}.pdf`);

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

    // Clean up: Delete the temporary file
    fs.unlinkSync(tempFilePath);
    console.log('Temporary file deleted.');

    // **Step 4: Update the Document Content in the Database**
    console.log('Updating document content in the database');
    try {
      const updateResponse = await convex.mutation('projects:updateDocumentContent', {
        documentId,
        documentContent: extractedText,
      });

      console.log('Update Response:', updateResponse);

      return NextResponse.json(
        { pdfUrl: response.url, text: extractedText },
        { status: 200 }
      );
    } catch (updateError: any) {
      console.error('Error updating document content:', updateError);
      return NextResponse.json(
        { error: 'Error updating document content' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error handling POST request:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
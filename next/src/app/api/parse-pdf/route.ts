// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/app/api/parse-pdf/route.ts
// /src/app/api/parse-pdf/route.ts

import { NextResponse } from 'next/server';
import convex from '@/lib/convexClient'; // Adjust the import path as necessary

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

    // TODO: Implement your PDF parsing logic here using response.url

    return NextResponse.json(
      { pdfUrl: response.url },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching PDF URL:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
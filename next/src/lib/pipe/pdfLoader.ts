// pdfLoader.ts
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/lib/pipe/pdfLoader.ts

import fs from "fs";
import path from "path";
import fetch from "node-fetch"; // If needed in Node
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { NextResponse } from "next/server"; // If you want to use NextResponse for errors
import convex from "@/lib/convexClient";
import { retryWithBackoff } from "./utils"; // If you place your backoff code in utils.ts

/**
 * Download the PDF from a Convex storage URL and save it to a temporary file.
 * 
 * @param fileId The Convex file ID
 * @returns The local path to the saved PDF file
 * 
 * Throws an error if the file cannot be retrieved or saved.
 */
export async function downloadPdfToTemp(fileId: string): Promise<string> {
  // 1. Get signed URL from Convex for the given fileId
  console.log("Invoking Convex mutation: projects:getFileUrl with fileId =", fileId);
  const response = await retryWithBackoff(
    () => convex.mutation("projects:getFileUrl", { fileId }),
    5,    // max retries
    1000  // initial delay in ms
  );

  if (!response || !response.url) {
    console.error("No URL returned for PDF");
    throw new Error("No URL returned for PDF");
  }

  const pdfUrl = response.url;
  console.log("PDF URL:", pdfUrl);

  // 2. Fetch the PDF bytes
  console.log("Fetching the PDF from the URL");
  const pdfResponse = await fetch(pdfUrl, { timeout: 120000 }); // 2-minute timeout
  if (!pdfResponse.ok) {
    console.error("Failed to fetch PDF:", pdfResponse.statusText);
    throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
  }

  // 3. Write PDF bytes to a temporary file
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const tempFilePath = path.join(tempDir, `${fileId}.pdf`);
  const arrayBuffer = await pdfResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(tempFilePath, buffer);

  console.log("PDF saved to:", tempFilePath);
  return tempFilePath;
}

/**
 * Load the saved PDF file into `docs` using `PDFLoader`.
 * Each page is returned as a separate "document" object from langchain.
 * 
 * @param tempFilePath Path to the saved PDF
 * @returns An array of documents (each page is a doc)
 */
export async function loadPdfPages(tempFilePath: string) {
  // You can pass options to PDFLoader, e.g. { splitPages: true }
  const loader = new PDFLoader(tempFilePath, {
    splitPages: true, // Each page is a separate document
  });

  const docs = await loader.load();
  if (!docs || docs.length === 0) {
    throw new Error("No content extracted from the document.");
  }

  console.log("Total pages (docs) loaded:", docs.length);
  console.log("Sample metadata from first page:", docs[0].metadata);

  return docs;
}
// pdfLoader.ts
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/lib/pipe/pdfLoader.ts

import fetch from "node-fetch";
import { LlamaParseReader, Document } from "llamaindex";
import { NextResponse } from "next/server";
import convex from "@/lib/convexClient";
import { retryWithBackoff } from "./utils";

/**
 * Download the PDF from a Convex storage URL and convert to a Buffer.
 *
 * @param fileId The Convex file ID
 * @returns Buffer of PDF Data
 *
 * Throws an error if the file cannot be retrieved.
 */
export async function downloadPdfToBuffer(fileId: string): Promise<Buffer> {
    // 1. Get signed URL from Convex for the given fileId
    console.log("Invoking Convex mutation: projects:getFileUrl with fileId =", fileId);
    const response = await retryWithBackoff(
        () => convex.mutation("projects:getFileUrl", { fileId }),
        5,
        1000
    );

    if (!response || !response.url) {
        console.error("No URL returned for PDF");
        throw new Error("No URL returned for PDF");
    }

    const pdfUrl = response.url;
    console.log("PDF URL:", pdfUrl);

    // 2. Fetch the PDF bytes
    console.log("Fetching the PDF from the URL");
    const pdfResponse = await fetch(pdfUrl, { timeout: 120000 });
    if (!pdfResponse.ok) {
        console.error("Failed to fetch PDF:", pdfResponse.statusText);
        throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
    }

    // 3. Convert to buffer
    const arrayBuffer = await pdfResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return buffer;
}

/**
 * Loads the PDF data directly from the Buffer using LlamaParseReader.
 *
 * @param pdfBuffer Buffer of the PDF data
 * @returns An array of Document objects from LlamaIndex
 */
export async function loadPdfWithLlamaParseReader(pdfBuffer: Buffer): Promise<Document[]> {
    try {
        const apiKey = process.env.LLAMA_CLOUD_API_KEY; // Access env variable
        const reader = new LlamaParseReader({
            apiKey,
            resultType: "json",
           verbose: false
        });
      
        // Convert buffer to Uint8Array for loadJson
        const uint8Array = new Uint8Array(pdfBuffer);
        const jsonResult = await reader.loadJson(uint8Array);

        const documents = jsonResult.map(result => {
            return new Document({
                text: JSON.stringify(result),
                metadata: {}
            });
        })
        console.log("PDF parsing completed");
        return documents;

    }
    catch (error) {
        console.error("Error during LlamaParse processing:", error);
        throw new Error(`Error during LlamaParse processing: ${error}`);
    }
}


/**
 * High-level function to download and load the PDF with LlamaParse
 *
 * @param fileId The Convex file ID
 * @returns An array of Document objects
 */
export async function downloadAndLoadPdf(fileId: string): Promise<Document[]> {
    try {
        const pdfBuffer = await downloadPdfToBuffer(fileId);
        const documents = await loadPdfWithLlamaParseReader(pdfBuffer);
        return documents;
    } catch (error) {
        console.error("Error in downloadAndLoadPdf:", error);
        throw error;
    }
}
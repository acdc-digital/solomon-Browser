// RAG API Route
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/app/api/parse-pdf/route.ts

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Tesseract from "tesseract.js";
import { get_encoding } from "tiktoken";
import { v4 as uuidv4 } from "uuid";
import pLimit from "p-limit";

import {
  downloadAndLoadPdf,
} from "@/lib/pipe/pdfLoader";
import {
  runOcrOnPage,
  convertPdfPageToImage,
} from "@/lib/pipe/ocr";
import {
  extractHeadingsFromText,
  hierarchicalSemanticSplit,
  getAdaptiveChunkParams,
} from "@/lib/pipe/chunking";
import {
  generateEmbeddingsForChunks,
  updateEmbeddingsInDB,
} from "@/lib/pipe/embeddings";
import {
  getFileUrl,
  updateProcessingStatus,
  getParentProjectId,
  insertChunks,
  updateChunkEmbedding,
} from "@/lib/pipe/dbOps";
import { retryWithBackoff } from "@/lib/pipe/utils";

// removed edge runtime
// export const runtime = "nodejs";

/**
 * Example POST route for "parse-pdf" that downloads a PDF from Convex,
 * does hierarchical chunking, optionally does OCR fallback, then
 * updates your DB with chunk embeddings.
 */
export async function POST(request: Request) {
  let tempFilePath: string | null = null;

  try {
    const tokenizer = get_encoding("cl100k_base");

    // ----------------------------------
    // 1) Parse Incoming JSON
    // ----------------------------------
    const { documentId, fileId } = await request.json();
    console.log("Received parse-pdf POST request:", { documentId, fileId });

    if (!documentId || !fileId) {
      return NextResponse.json(
        { error: "Missing documentId or fileId" },
        { status: 400 }
      );
    }

    // ----------------------------------
    // 2) Download PDF & Load with LlamaParse
    // ----------------------------------
    console.log("Downloading and parsing PDF with LlamaParse")
    const docs = await downloadAndLoadPdf(fileId);
    if (!docs.length) {
      throw new Error("No content extracted from the document (empty docs).");
    }
    console.log("PDF parsing complete")

      // Example of combined text for debugging/logging
      const extractedText = docs.map((d) => d.text).join("\n");
      console.log("Sample of extracted text:", extractedText.slice(0, 200), "...");

    // Mark progress ~30
    await updateProcessingStatus(documentId, {
      progress: 30,
    });

    // ----------------------------------
    // 5) Hierarchical + Semantic Chunking
    // ----------------------------------
    console.log("Splitting the document into sub-chunks...");
    const totalChars = docs.reduce((acc, doc) => acc + doc.text.length, 0);
    const { chunkSize, chunkOverlap } = getAdaptiveChunkParams(totalChars);
    console.log(
      `Adaptive chunking => chunkSize=${chunkSize}, chunkOverlap=${chunkOverlap}`
    );


    const allChunks: {
      pageContent: string;
      metadata: {
          pageNumber?: number;
          docTitle?: string;
          docAuthor?: string;
          headings?: string[];
          snippet?: string;
          numTokens?: number;
      };
    }[] = [];

      docs.forEach((doc, pageIndex) => {
          try{
            const docContent = JSON.parse(doc.text); // parse JSON string
              const pageNumber = docContent.metadata?.page_number ?? pageIndex + 1;
              const docTitle = docContent.metadata?.document_title || "Untitled";
              const docAuthor = docContent.metadata?.document_author || "Unknown";
              //console.log("route.ts: docContent.text before hierarchicalSemanticSplit", docContent.text)
              if (docContent?.pages){
                for (const page of docContent.pages) {
                 // console.log("route.ts: page.text before hierarchicalSemanticSplit", page.text)
                  const pageChunks = page?.text ? hierarchicalSemanticSplit(
                    page.text,
                      chunkSize,
                      chunkOverlap
                  ) : [];
                  //console.log("route.ts: pageChunks after hierarchicalSemanticSplit", pageChunks)
                  
                  pageChunks.forEach((chunkText) => {
                     // console.log("route.ts: chunkText before extractHeadingsFromText", chunkText)
                      const headings = extractHeadingsFromText(chunkText);
                      const snippetMatch = chunkText.match(/Snippet:\s*(.*)\n/);
                      const snippet = snippetMatch ? snippetMatch[1].trim() : "";

                      let tokens: number[] = [];
                      try {
                          const encodedTokens = tokenizer.encode(chunkText);
                          tokens = Array.from(encodedTokens);
                      } catch (err) {
                          console.error("Error tokenizing chunk:", err);
                      }

                      allChunks.push({
                          pageContent: chunkText,
                          metadata: {
                              pageNumber,
                              docTitle,
                              docAuthor,
                              headings,
                              snippet,
                              numTokens: tokens.length,
                          },
                      });
                   });
                }
            }
            else{
                console.warn("route.ts: no pages property found on docContent", docContent)
            }
          }
          catch (e){
              console.error("Error parsing document in route.ts", e)
          }
      });

    console.log("Total number of sub-chunks across all pages:", allChunks.length);

    // Mark progress ~50
    await updateProcessingStatus(documentId, {
      progress: 50,
    });

    // ----------------------------------
    // 6) Retrieve Parent Project ID
    // ----------------------------------
    console.log("Retrieving parentProjectId for document:", documentId);
    const parentProjectId = await getParentProjectId(documentId);
    if (!parentProjectId) {
      throw new Error(
        `No parentProjectId found for documentId ${documentId}`
      );
    }

    // ----------------------------------
    // 7) Insert Chunks (batch insert)
    // ----------------------------------
        // Prepare chunk docs
        const docChunks = allChunks.map((chunk, index) => ({
            pageContent: chunk.pageContent,
            uniqueChunkId: uuidv4(),
            chunkNumber: index + 1,
            metadata: {
                ...chunk.metadata,
            },
        }));

    // Batching example
    const BATCH_SIZE = 250;
    const limit = pLimit(1); // concurrency

    // Build an array of arrays
    const chunkBatches = [];
    for (let i = 0; i < docChunks.length; i += BATCH_SIZE) {
      chunkBatches.push(docChunks.slice(i, i + BATCH_SIZE));
    }

    console.log(`Total chunk insertion batches: ${chunkBatches.length}`);

    await Promise.all(
      chunkBatches.map((batch) =>
        limit(() =>
          insertChunks(parentProjectId, batch).catch((err) => {
            console.error("Error inserting chunk batch:", err);
          })
        )
      )
    );

    // Mark progress ~60
    await updateProcessingStatus(documentId, { progress: 60 });

    // ----------------------------------
    // 8) Generate Embeddings
    // ----------------------------------
    console.log("Generating embeddings for docChunks...");
    const openAIApiKey = process.env.OPENAI_API_KEY || "";
    const chunkEmbeddings = await generateEmbeddingsForChunks(
      docChunks,                 // must have `pageContent` & `uniqueChunkId`
      openAIApiKey,
      "text-embedding-3-small"  // or "text-embedding-ada-002"
    );

    console.log("Total embeddings generated:", chunkEmbeddings.length);

    // Mark progress ~90
    await updateProcessingStatus(documentId, {
      progress: 90,
    });

    // ----------------------------------
    // 9) Update Embeddings in DB
    // ----------------------------------
    // We already have docChunks + chunkEmbeddings => update in DB in batches
    await updateEmbeddingsInDB(
      docChunks,
      chunkEmbeddings,
      1,    // concurrencyLimit
      250,  // batchSize
      5,    // retries
      1000  // initialDelay
    );

    // Mark final progress ~100
    await updateProcessingStatus(documentId, {
      progress: 100,
      isProcessed: true,
      isProcessing: false,
      processedAt: new Date().toISOString(),
    });

    // Return success
    return NextResponse.json(
      {
        message: "PDF parsing complete",
        totalChunks: docChunks.length,
        totalEmbeddings: chunkEmbeddings.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error parsing PDF:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
// RAG API Route
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/app/api/parse-pdf/route.ts

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Tesseract from "tesseract.js";
import { get_encoding } from "tiktoken";
import { v4 as uuidv4 } from "uuid";
import pLimit from "p-limit";

import { downloadAndLoadPdf } from "@/lib/pipe/pdfLoader";
import { runOcrOnPage, convertPdfPageToImage } from "@/lib/pipe/ocr";

// Updated chunking import:
// hierarchicalSemanticSplit now returns an array of objects:
// { pageContent: string; metadata: { keywords, entities, topics, isHeading, ... } }
import {
  hierarchicalSemanticSplit,
  getAdaptiveChunkParams,
  extractHeadingsFromText,
} from "@/lib/pipe/chunking";

// Additional metadata extraction (already used by hierarchicalSemanticSplit, but we can still call them if needed here)
import {
  extractKeywords,
  extractEntities,
  assignTopics,
} from "@/lib/pipe/metadataExtractors";

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

// A small helper to fallback-parse the first page for lines like "Author:" or "Title:"
// (You can customize these regex checks if your PDFs have different formats.)
function detectAuthorAndTitleFromFirstPage(text: string): {
  detectedAuthor?: string;
  detectedTitle?: string;
} {
  let detectedAuthor: string | undefined;
  let detectedTitle: string | undefined;

  // Example: lines like "Author: John Smith"
  const authorMatch = text.match(/^Author:\s*(.+)$/im);
  if (authorMatch && authorMatch[1]) {
    detectedAuthor = authorMatch[1].trim();
  }

  // Example: lines like "Title: My Great Paper"
  const titleMatch = text.match(/^Title:\s*(.+)$/im);
  if (titleMatch && titleMatch[1]) {
    detectedTitle = titleMatch[1].trim();
  }

  return { detectedAuthor, detectedTitle };
}

export async function POST(request: Request) {
  let tempFilePath: string | null = null;

  try {
    // 1) Parse Incoming JSON
    const tokenizer = get_encoding("cl100k_base");
    const { documentId, fileId } = await request.json();
    console.log("Received parse-pdf POST request:", { documentId, fileId });

    if (!documentId || !fileId) {
      return NextResponse.json(
        { error: "Missing documentId or fileId" },
        { status: 400 }
      );
    }

    // 2) Download PDF & Load with LlamaParse
    console.log("Downloading and parsing PDF with LlamaParse");
    const docs = await downloadAndLoadPdf(fileId);
    if (!docs.length) {
      throw new Error("No content extracted from the document (empty docs).");
    }
    console.log("PDF parsing complete");

    // (Optional) Combined text for debugging/logging
    const extractedText = docs.map((d) => d.text).join("\n");
    console.log("Sample of extracted text:", extractedText.slice(0, 200), "...");

    // Mark progress ~30
    await updateProcessingStatus(documentId, { progress: 30 });

    // 3) Hierarchical + Semantic Chunking
    console.log("Splitting the document into sub-chunks...");
    const totalChars = docs.reduce((acc, doc) => acc + doc.text.length, 0);
    const { chunkSize, chunkOverlap } = getAdaptiveChunkParams(totalChars);
    console.log(
      `Adaptive chunking => chunkSize=${chunkSize}, chunkOverlap=${chunkOverlap}`
    );

    // We'll accumulate all chunk objects here (pageContent + metadata)
    const allChunks: {
      pageContent: string;
      metadata: {
        pageNumber?: number;
        docTitle?: string;
        docAuthor?: string;
        headings?: string[];
        snippet?: string;
        numTokens?: number;
        // Additional chunk-level metadata:
        keywords?: string[];
        entities?: string[];
        topics?: string[];
        isHeading?: boolean;
      };
    }[] = [];

    // For each doc returned by LlamaParse
    docs.forEach((doc, docIndex) => {
      try {
        // doc.text is presumably a JSON string from LlamaParse
        const docContent = JSON.parse(doc.text);

        // Attempt to read doc-level fields from LlamaParse's top-level metadata
        // If missing, fallback parse the first page.
        let docAuthor = docContent.metadata?.document_author ?? "Unknown";
        let docTitle = docContent.metadata?.document_title ?? "Untitled";

        // If both are "Unknown"/"Untitled", try fallback parse from first page text:
        if (
          (docAuthor === "Unknown" || docTitle === "Untitled") &&
          Array.isArray(docContent.pages) &&
          docContent.pages.length > 0
        ) {
          const firstPageText = docContent.pages[0].text || "";
          const { detectedAuthor, detectedTitle } =
            detectAuthorAndTitleFromFirstPage(firstPageText);

          if (detectedAuthor && docAuthor === "Unknown") {
            docAuthor = detectedAuthor;
          }
          if (detectedTitle && docTitle === "Untitled") {
            docTitle = detectedTitle;
          }
        }

        // If LlamaParse set docContent.metadata?.page_number, use it; else fallback to docIndex
        // Usually LlamaParse doesn't set doc-level page_number unless you're working with single-page docs
        // We'll do per-page detection below.
        const fallbackDocLevelPageNumber =
          docContent.metadata?.page_number ?? docIndex + 1;

        // If LlamaParse returns pages in docContent.pages, chunk each page
        if (docContent?.pages) {
          docContent.pages.forEach((page: any, pageIndex: number) => {
            const rawText = page?.text || "";

            // The actual page number from LlamaParse's "page" field,
            // falling back if not present:
            const realPageNumber =
              typeof page.page === "number" ? page.page : pageIndex + 1;

            // hierarchicalSemanticSplit: returns an array of chunk objects
            const pageChunks = hierarchicalSemanticSplit(
              rawText,
              chunkSize,
              chunkOverlap
            );

            // For each chunk returned from hierarchicalSemanticSplit
            pageChunks.forEach((chunkObj) => {
              const chunkText = chunkObj.pageContent;
              const chunkMeta = chunkObj.metadata || {};

              // If you want snippet detection per chunk
              const snippetMatch = chunkText.match(/Snippet:\s*(.*)\n/);
              const snippet = snippetMatch ? snippetMatch[1].trim() : "";

              // If you want headings from chunk text
              const headings = extractHeadingsFromText(chunkText);

              // Tokenize for numTokens
              let tokens: number[] = [];
              try {
                const encodedTokens = tokenizer.encode(chunkText);
                tokens = Array.from(encodedTokens);
              } catch (err) {
                console.error("Error tokenizing chunk:", err);
              }

              // Merge doc-level + page-level + chunk-level data
              allChunks.push({
                pageContent: chunkText,
                metadata: {
                  // doc-level fields
                  docAuthor,
                  docTitle,

                  // page-level
                  pageNumber: realPageNumber,

                  // snippet, headings, token count
                  snippet,
                  headings,
                  numTokens: tokens.length,

                  // chunk-level from hierarchicalSemanticSplit
                  ...chunkMeta,
                  // e.g. isHeading, keywords, entities, topics, etc.
                },
              });
            });
          });
        } else {
          console.warn(
            "route.ts: no pages property found on docContent",
            docContent
          );
        }
      } catch (e) {
        console.error("Error parsing document in route.ts", e);
      }
    });

    console.log("Total number of sub-chunks across all pages:", allChunks.length);

    // Mark progress ~50
    await updateProcessingStatus(documentId, { progress: 50 });

    // 4) Retrieve Parent Project ID
    console.log("Retrieving parentProjectId for document:", documentId);
    const parentProjectId = await getParentProjectId(documentId);
    if (!parentProjectId) {
      throw new Error(`No parentProjectId found for documentId ${documentId}`);
    }

    // 5) Insert Chunks in Batches
    const docChunks = allChunks.map((chunk, index) => ({
      pageContent: chunk.pageContent,
      uniqueChunkId: uuidv4(),
      chunkNumber: index + 1,
      metadata: {
        ...chunk.metadata,
      },
    }));

    const BATCH_SIZE = 250;
    const limit = pLimit(1); // concurrency
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

    // 6) Generate Embeddings
    console.log("Generating embeddings for docChunks...");
    const openAIApiKey = process.env.OPENAI_API_KEY || "";
    const chunkEmbeddings = await generateEmbeddingsForChunks(
      docChunks, // must have `pageContent` & `uniqueChunkId`
      openAIApiKey,
      "text-embedding-3-small" // or "text-embedding-ada-002"
    );

    console.log("Total embeddings generated:", chunkEmbeddings.length);

    // Mark progress ~90
    await updateProcessingStatus(documentId, { progress: 90 });

    // 7) Update Embeddings in DB
    await updateEmbeddingsInDB(
      docChunks,
      chunkEmbeddings,
      1, // concurrencyLimit
      250, // batchSize
      5, // retries
      1000 // initialDelay
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
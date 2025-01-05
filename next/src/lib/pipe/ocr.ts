// src/lib/pipe/ocr.ts
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/lib/pipe/ocr.ts

import Tesseract from "tesseract.js";
import { fromPath as pdf2picFromPath } from "pdf2pic";
import path from "path";
import fs from "fs";

/**
 * Convert a single page of a PDF to PNG using pdf2pic.
 * Returns the path to the output image file.
 *
 * @param pdfPath - The path to the local PDF file
 * @param pageNumber - The (1-based) page number to convert
 */
export async function convertPdfPageToImage(
  pdfPath: string,
  pageNumber: number
): Promise<string> {
  // We'll store images in an "ocr_images" subfolder alongside the PDF
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

  // pdf2pic uses a “storeAsImage(pageNumber)” function
  const storeAsImage = pdf2picFromPath(pdfPath, options);
  const result = await storeAsImage(pageNumber);
  return result.path; // path to the saved PNG
}

/**
 * Perform OCR on a single page of the PDF using Tesseract.
 * 1) Convert PDF page -> image
 * 2) Run Tesseract on the image
 * 3) Return recognized text
 *
 * @param pdfPath - The path to the local PDF file
 * @param pageIndex - The (0-based) index of the page
 */
export async function runOcrOnPage(
  pdfPath: string,
  pageIndex: number
): Promise<string> {
  try {
    const pageNumber = pageIndex + 1;
    console.log(`Starting OCR for Page #${pageNumber}`);

    // Convert the PDF page to an image (PNG)
    const imagePath = await convertPdfPageToImage(pdfPath, pageNumber);
    console.log(`Converted Page #${pageNumber} to Image: ${imagePath}`);

    // Run Tesseract OCR on the image
    const result = await Tesseract.recognize(imagePath, "eng");
    const ocrText = result.data.text || "";
    console.log(
      `OCR Result for Page #${pageNumber}: ${ocrText.slice(0, 100)}...`
    ); // Log the first 100 chars

    // Clean up (delete) the image file if you don’t need to keep it
    fs.unlinkSync(imagePath);
    console.log(`Cleaned up Image File: ${imagePath}`);

    return ocrText;
  } catch (err) {
    console.error(`Error running OCR on page ${pageIndex + 1}:`, err);
    return ""; // fallback if OCR fails
  }
}
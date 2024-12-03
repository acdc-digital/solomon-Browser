// types/pdf-parse.d.ts
// /Users/matthewsimon/Documents/Github/solomon-electron/next/convex/types/pdf-parse.d.ts

declare module 'pdf-parse' {
    import { Readable } from 'stream';
  
    interface PDFInfo {
      [key: string]: any;
    }
  
    interface PDFMetadata {
      [key: string]: any;
    }
  
    interface PDFParseOptions {
      max?: number;
      version?: string;
      pagerender?(pageData: any): Promise<string>;
      normalizeText?(text: string): string;
    }
  
    interface PDFParseResult {
      numpages: number;
      numrender: number;
      info: PDFInfo;
      metadata: PDFMetadata | null;
      text: string;
      version: string;
    }
  
    function pdfParse(
      dataBuffer: Buffer | Uint8Array | Readable,
      options?: PDFParseOptions
    ): Promise<PDFParseResult>;
  
    export default pdfParse;
  }
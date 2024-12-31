// PDF Setup
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/setupPDF.ts

import { pdfjs } from 'react-pdf';

// The version should match the installed pdfjs-dist version
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
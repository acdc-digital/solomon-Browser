// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/canvas/(Projects)/_components/FilePreview.tsx
// src/components/FilePreview.tsx

'use client';

import '../../../../setupPDF'; // Keep your PDF worker config here
import React, { useState, useEffect } from "react";
import { useEditorStore } from "@/lib/store/editorStore";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ZoomInIcon,
  ZoomOutIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RotateCwIcon,
} from "lucide-react"; // Example Lucide icons
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

const FilePreview: React.FC = () => {
  const selectedFile = useEditorStore((state) => state.selectedFile);
  const setActiveView = useEditorStore((state) => state.setActiveView);
  const setSelectedFile = useEditorStore((state) => state.setSelectedFile);

  const [isLoading, setIsLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // PDF states
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0); // Zoom scale

  const getFileUrlMutation = useMutation(api.projects.getFileUrl);

  useEffect(() => {
    if (!selectedFile) return;

    const fetchFileUrl = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getFileUrlMutation({ fileId: selectedFile.fileId });
        setFileUrl(response.url);
      } catch (err) {
        console.error("Error fetching file URL:", err);
        setError("Failed to load the PDF.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFileUrl();
  }, [selectedFile, getFileUrlMutation]);

  // Called when the PDF is loaded
  function onDocumentLoadSuccess(pdf: { numPages: number }) {
    setNumPages(pdf.numPages);
    setPageNumber(1); // Reset to page 1 whenever a new PDF loads
  }

  // Navigation Handlers
  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  // Zoom Handlers
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 5));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.2));
  const resetZoom = () => setScale(1.0);

  const handleBack = () => {
    setActiveView("files");
    setSelectedFile(null);
    setFileUrl(null);
    setIsLoading(true);
    setError(null);
    setPageNumber(1);
    setScale(1.0);
  };

  // Renders only the currently selected page
  const renderCurrentPage = () => {
    if (numPages === 0) return null;

    return (
      <Page
        key={`page_${pageNumber}`}
        pageNumber={pageNumber}
        width={800 * scale} // Adjust the base width and multiply by scale
        renderAnnotationLayer
        renderTextLayer
      />
    );
  };

  return (
    <div className="flex flex-col h-[calc(87vh-100px)] overflow-hidden">
      {/* Top Bar (Back Button) */}
      <div className="flex flex-row items-center space-x-2 mb-2">
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300"
        >
          &larr; Back to Files
        </button>
        <h2 className="text-1xl ml-2">
          {selectedFile ? selectedFile.documentTitle : "No file selected"}
        </h2>
      </div>

      {/* Toolbar */}
      <div className="flex flex-row items-center mb-2 space-x-4 bg-gray-100 p-2 rounded">
        {/* Page navigation */}
        <div className="flex flex-row items-center space-x-2">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="bg-gray-200 p-2 hover:bg-gray-300 rounded"
            aria-label="Previous Page"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <span className="text-sm">
            Page {pageNumber} of {numPages || 0}
          </span>
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="bg-gray-200 p-2 hover:bg-gray-300 rounded"
            aria-label="Next Page"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex flex-row items-center space-x-2">
          <button
            onClick={zoomOut}
            className="bg-gray-200 p-2 hover:bg-gray-300 rounded"
            aria-label="Zoom Out"
          >
            <ZoomOutIcon className="h-4 w-4" />
          </button>
          <span className="text-sm">{(scale * 100).toFixed(0)}%</span>
          <button
            onClick={zoomIn}
            className="bg-gray-200 p-2 hover:bg-gray-300 rounded"
            aria-label="Zoom In"
          >
            <ZoomInIcon className="h-4 w-4" />
          </button>
          <button
            onClick={resetZoom}
            className="bg-gray-200 p-2 hover:bg-gray-300 rounded"
            aria-label="Reset Zoom"
          >
            <RotateCwIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="overflow-auto">
        {isLoading && <p>Loading PDF...</p>}
        {error && <p>{error}</p>}
        {fileUrl && (
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={() => setError("Error loading PDF.")}
          >
            {renderCurrentPage()}
          </Document>
        )}
      </div>
    </div>
  );
};

export default FilePreview;
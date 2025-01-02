// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/canvas/(Projects)/_components/FilePreview.tsx
// src/components/FilePreview.tsx

"use client";

import "../../../../setupPDF"; // Keep your PDF worker config here
import React, { useState, useEffect } from "react";
import { useEditorStore } from "@/lib/store/editorStore";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Document, Page } from "react-pdf";
import {
  ZoomInIcon,
  ZoomOutIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RotateCwIcon,
} from "lucide-react"; // Example Lucide icons
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Button } from "@/components/ui/button";

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
        // The width of the page times your scale factor
        width={800 * scale} 
        renderAnnotationLayer
        renderTextLayer
      />
    );
  };

  return (
    <div className="flex flex-col h-[calc(87vh-100px)] overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-row items-center space-x-4 bg-gray-100 p-2 rounded">
      <Button
        variant="outline"
          onClick={handleBack}
        >
          &larr; Back to Files
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

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

          {/* <div className="w-px h-6 bg-gray-300 mx-2" />

          <button
            onClick={resetZoom}
            className="bg-gray-200 p-2 hover:bg-gray-300 rounded"
            aria-label="Reset Zoom"
          >
            <RotateCwIcon className="h-4 w-4" />
          </button> */}
        </div> 

        <div className="w-px h-6 bg-gray-300 mx-2" />

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
      </div>

      {/* Content Area */}
      {/* 
         1) Make this container flex with justify-center, items-start,
            and a darker background.
         2) We place the PDF inside a white box to simulate a "page."
      */}
      <div className="flex-1 flex overflow-auto justify-center items-start bg-gray-300 p-4">
        {isLoading && <p className="text-white">Loading PDF...</p>}
        {error && <p className="text-red-400">{error}</p>}

        {/* Only render the PDF if we have a fileUrl and not loading/error */}
        {fileUrl && !error && !isLoading && (
          <div
            className="bg-white shadow-md border border-gray-300"
            style={{ padding: "20px" }}
          >
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={() => setError("Error loading PDF.")}
            >
              {renderCurrentPage()}
            </Document>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePreview;
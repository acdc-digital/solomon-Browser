// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/canvas/(Projects)/_components/FilePreview.tsx
// src/components/FilePreview.tsx

'use client'

import '../../../../setupPDF';

import React, { useState, useEffect } from "react";
import { useEditorStore } from "@/lib/store/editorStore";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

const FilePreview: React.FC = () => {
  const selectedFile = useEditorStore((state) => state.selectedFile);
  const setActiveView = useEditorStore((state) => state.setActiveView);
  const setSelectedFile = useEditorStore((state) => state.setSelectedFile);

  const [isLoading, setIsLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);

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

  const handleBack = () => {
    setActiveView("files");
    setSelectedFile(null);
    setFileUrl(null);
    setIsLoading(true);
    setError(null);
  };

  function onDocumentLoadSuccess(pdf: { numPages: number }) {
    setNumPages(pdf.numPages);
  }

  const renderPages = () => {
    return Array.from({ length: numPages }, (_, i) => (
      <Page
        key={`page_${i + 1}`}
        pageNumber={i + 1}
        width={800} // Adjust to your layout
        renderAnnotationLayer
        renderTextLayer
      />
    ));
  };

  return (
    <div className="flex flex-col">
      <button
        onClick={handleBack}
        className="mb-1 px-4 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300"
      >
        &larr; Back to Files
      </button>

      <h2 className="text-1xl ml-2 mb-1">
        {selectedFile ? selectedFile.documentTitle : "No file selected"}
      </h2>

      <div className="overflow-auto">
        {isLoading && <p>Loading PDF...</p>}
        {error && <p>{error}</p>}
        {fileUrl && (
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(e) => setError("Error loading PDF.")}
          >
            {renderPages()}
          </Document>
        )}
      </div>
    </div>
  );
};

export default FilePreview;
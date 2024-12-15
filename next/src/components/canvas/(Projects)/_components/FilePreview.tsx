// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/canvas/(Projects)/_components/FilePreview.tsx
// src/components/FilePreview.tsx

// src/components/canvas/(Projects)/_components/FilePreview.tsx
import React, { useState, useEffect } from "react";
import { useEditorStore } from "@/lib/store/editorStore"; // Updated import path
import { DocumentData } from "@/types/DocumentData"; // Import DocumentData type
import { useMutation } from "convex/react"; // Import useMutation from Convex
import { api } from "../../../../../convex/_generated/api"; // Adjust the import path accordingly

const FilePreview: React.FC = () => {
  const selectedFile = useEditorStore((state) => state.selectedFile);
  const setActiveView = useEditorStore((state) => state.setActiveView);
  const setSelectedFile = useEditorStore((state) => state.setSelectedFile);

  const [isLoading, setIsLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getFileUrlMutation = useMutation(api.projects.getFileUrl); // Initialize mutation hook

  useEffect(() => {
    if (!selectedFile) {
      return;
    }

    const fetchFileUrl = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getFileUrlMutation({ fileId: selectedFile.fileId });
        setFileUrl(response.url);
      } catch (err) {
        console.error("Error fetching file URL:", err);
        setError("Failed to load the PDF. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFileUrl();
  }, [selectedFile, getFileUrlMutation]);

  if (!selectedFile) {
    return <p>No file selected.</p>;
  }

  const handleBack = () => {
    setActiveView("files");
    setSelectedFile(null);
    setFileUrl(null);
    setIsLoading(true); // Reset loading state when going back
    setError(null); // Reset error state when going back
  };

  const renderPreviewContent = () => {
    if (isLoading) {
      return <p>Loading PDF...</p>;
    }

    if (error || !fileUrl) {
      return <p>{error || "Error loading PDF."}</p>;
    }

    return (
      <iframe
        src={fileUrl}
        title={selectedFile.documentTitle}
        width="100%"
        height="550px"
        style={{ border: "none" }}
      />
    );
  };

  return (
    <div className="flex flex-col">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="mb-1 px-4 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300"
        aria-label="Back to Files"
      >
        &larr; Back to Files
      </button>

      {/* File Title */}
      <h2 className="text-1xl ml-2 mb-1">{selectedFile.documentTitle}</h2>

      {/* Preview Content */}
      <div className="overflow-auto">{renderPreviewContent()}</div>
    </div>
  );
};

export default FilePreview;
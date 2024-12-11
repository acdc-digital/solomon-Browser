// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/canvas/(Projects)/_components/FilePreview.tsx
// src/components/FilePreview.tsx

import React, { useState } from "react";
import { useEditorStore } from "@/lib/store/editorStore"; // Updated import path
import { DocumentData } from "@/types/DocumentData"; // Import DocumentData type

const FilePreview: React.FC = () => {
  const selectedFile = useEditorStore((state) => state.selectedFile);
  const setActiveView = useEditorStore((state) => state.setActiveView);
  const setSelectedFile = useEditorStore((state) => state.setSelectedFile);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!selectedFile) {
    return <p>No file selected.</p>;
  }

  const handleBack = () => {
    setActiveView("files");
    setSelectedFile(null);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const renderPreviewContent = () => {
    const fileType = selectedFile.fileType.toLowerCase();
    const fileUrl = `/files/${selectedFile.documentTitle}`; // Adjust the path accordingly

    switch (fileType) {
      case '.pdf':
        return (
          <>
            {isLoading && <p>Loading PDF...</p>}
            {hasError ? (
              <p>Error loading PDF.</p>
            ) : (
              <iframe
                src={fileUrl}
                title={selectedFile.documentTitle}
                width="100%"
                height="600px"
                onLoad={handleLoad}
                onError={handleError}
                style={{ display: isLoading ? 'none' : 'block' }}
              />
            )}
          </>
        );
      case '.jpg':
      case '.jpeg':
      case '.png':
        return (
          <>
            {isLoading && <p>Loading Image...</p>}
            {hasError ? (
              <p>Error loading image.</p>
            ) : (
              <img
                src={fileUrl}
                alt={selectedFile.documentTitle}
                style={{ maxWidth: '100%', maxHeight: '600px', display: isLoading ? 'none' : 'block' }}
                onLoad={handleLoad}
                onError={handleError}
              />
            )}
          </>
        );
      case '.mp4':
        return (
          <>
            {isLoading && <p>Loading Video...</p>}
            {hasError ? (
              <p>Error loading video.</p>
            ) : (
              <video
                controls
                width="100%"
                onCanPlay={handleLoad}
                onError={handleError}
                style={{ display: isLoading ? 'none' : 'block' }}
              >
                <source src={fileUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            )}
          </>
        );
      case '.mp3':
        return (
          <>
            {isLoading && <p>Loading Audio...</p>}
            {hasError ? (
              <p>Error loading audio.</p>
            ) : (
              <audio
                controls
                onCanPlay={handleLoad}
                onError={handleError}
                style={{ display: isLoading ? 'none' : 'block' }}
              >
                <source src={fileUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            )}
          </>
        );
      // Add more cases for different file types as needed
      default:
        return <p>Preview not available for this file type.</p>;
    }
  };

  return (
    <div className="flex flex-col">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="mb-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
      >
        &larr; Back to Files
      </button>

      {/* File Title */}
      <h2 className="text-2xl mb-4">{selectedFile.documentTitle}</h2>

      {/* Preview Content */}
      <div className="overflow-auto">{renderPreviewContent()}</div>
    </div>
  );
};

export default FilePreview;
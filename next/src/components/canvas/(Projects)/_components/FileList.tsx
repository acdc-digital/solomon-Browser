// FileList.tsx
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/canvas/(Projects)/_components/FileList.tsx

import React, { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton"; 
import { useEditorStore } from "@/lib/store/editorStore";
import { DocumentData } from "@/types/DocumentData";
import { Button } from "@/components/ui/button"; // Ensure Button is imported
import { Loader2 } from "lucide-react"; // Import Loader2 from Lucide Icons

interface FileListProps {
  projectId: string;
}

export const FileList: React.FC<FileListProps> = ({ projectId }) => {
  const documents = useQuery(api.projects.getDocumentsByProjectId, { projectId });
  const { setActiveView, setSelectedFile, pendingFiles, removePendingFile } = useEditorStore();
  
  useEffect(() => {
    if (documents) {
      // Extract fileIds from fetched documents
      const fetchedFileIds = documents.map((doc) => doc.fileId);
      // Remove any pending files that have been processed
      fetchedFileIds.forEach((fileId) => {
        removePendingFile(fileId);
      });
    }
  }, [documents, removePendingFile]);

  if (documents === undefined) {
    return <p>Loading documents...</p>;
  }

  const processedDocuments = documents.map((doc) => {
    const fileTypeMatch = doc.documentTitle.match(/\.(\w+)$/);
    const fileType = fileTypeMatch ? `.${fileTypeMatch[1]}` : "Unknown";
    const createdAt = new Date(doc.createdAt);
    const formattedCreatedAt = createdAt.toLocaleString();

    // Calculate if the document processing is stuck
    const processingDuration = Date.now() - new Date(doc.createdAt).getTime();
    const isStuck = doc.isProcessing && processingDuration > 10 * 60 * 1000; // 10 minutes

    return {
      ...doc,
      fileType,
      formattedCreatedAt,
      fileId: doc.fileId,
      isStuck,
    };
  });

  const handleRowClick = (doc: DocumentData) => {
    setSelectedFile(doc);
    setActiveView("preview");
  };

  // Helper function to handle retry logic
  const retryProcessing = async (fileId: string) => {
    try {
      // Implement your retry logic here, e.g., call an API endpoint
      const response = await fetch("/api/retry-processing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });

      if (!response.ok) {
        throw new Error("Retry processing failed");
      }

      // Optionally, you can refetch the documents or trigger a state update
      // For example, using Convex's refetch or mutate
      // Assuming useQuery from Convex automatically updates, otherwise trigger a refetch
    } catch (error) {
      console.error("Error retrying processing:", error);
      alert("Failed to retry processing. Please try again.");
    }
  };

  return (
    <div className="relative overflow-x-auto">
      {/* Scrollable Container */}
      <div className="max-h-[560px] overflow-y-auto"> {/* Adjust max-h as needed */}
        <Table className="table-fixed w-full min-w-full">
          <TableHeader className="border-t">
            <TableRow>
              <TableHead className="w-48 text-left font-semibold">Title</TableHead>
              <TableHead className="w-48 text-left font-semibold">Type</TableHead>
              <TableHead className="w-48 text-left font-semibold">Created At</TableHead>
              <TableHead className="w-56 text-left font-semibold">Progress</TableHead>
              <TableHead className="w-24 text-left font-semibold"></TableHead> {/* New Spinner Column */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Render Skeleton Rows for Pending Files */}
            {pendingFiles.map((file) => (
              <TableRow
                key={`pending-${file.fileId}`}
                className="cursor-pointer hover:bg-gray-100 bg-gray-50 animate-pulse"
              >
                <TableCell className="px-1 py-1 text-sm text-left">
                  <div className="pr-2">
                    <Skeleton className="h-4 w-[180px]" />
                  </div>
                </TableCell>
                <TableCell className="px-1 py-1 text-sm text-left">
                  <div className="pr-2">
                    <Skeleton className="h-4 w-[80px]" />
                  </div>
                </TableCell>
                <TableCell className="px-1 py-1 text-sm text-left">
                  <div className="pr-2">
                    <Skeleton className="h-4 w-[130px]" />
                  </div>
                </TableCell>
                <TableCell className="px-1 py-1 text-sm text-left">
                  <div className="pr-2">
                    <Skeleton className="h-4 w-[80px]" />
                  </div>
                </TableCell>
                {/* New TableCell for Spinner */}
                <TableCell className="px-1 py-1 text-sm text-left">
                  <div className="flex justify-center">
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {/* Render Actual Document Rows */}
            {processedDocuments.map((doc) => (
              <TableRow
                key={doc._id.toString()}
                onClick={() => handleRowClick(doc)}
                className={`cursor-pointer hover:bg-gray-100 ${
                  doc.isProcessing ? "bg-gray-50" : ""
                }`}
              >
                <TableCell className="px-4 py-2 text-sm text-left">
                  <div className="pr-2">
                    {doc.documentTitle}
                  </div>
                </TableCell>
                <TableCell className="px-1 py-2 text-sm text-left">
                  <div className="pr-2">
                    {doc.fileType}
                  </div>
                </TableCell>
                <TableCell className="px-1 py-2 text-sm text-left">
                  <div className="pr-2">
                    {doc.formattedCreatedAt}
                  </div>
                </TableCell>
                <TableCell className="flex items-center space-x-1 px-1 py-3 text-sm text-left">
                  {doc.isStuck ? (
                    <div className="flex items-center space-x-1">
                      <span className="text-red-500">Processing Stuck</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          retryProcessing(doc.fileId);
                        }}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : doc.isProcessing ? (
                    <>
                      <Progress value={doc.progress || 0} />
                    </>
                  ) : doc.isProcessed ? (
                    <Progress value={100} />
                  ) : (
                    <Progress value={100} />
                  )}
                </TableCell>
                {/* New TableCell for Spinner */}
                <TableCell className="px-1 py-3 text-sm text-left">
                  {doc.isProcessing && (
                    <Loader2 className="animate-spin h-4 w-4 text-gray-500" aria-label="Loading" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
// FileList.tsx
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/canvas/(Projects)/_components/FileList.tsx

import React, { useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
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
import { Button } from "@/components/ui/button";
import { Loader2, Check, XCircle } from "lucide-react";

interface FileListProps {
  projectId: string;
}

export const FileList: React.FC<FileListProps> = ({ projectId }) => {
  const documents = useQuery(api.projects.getDocumentsByProjectId, { projectId });
  const {
    setActiveView,
    setSelectedFile,
    pendingFiles,
    removePendingFile,
    sortOrder, // Access sortOrder from the store
  } = useEditorStore();

  // Always call hooks at the top level
  useEffect(() => {
    if (documents) {
      const fetchedFileIds = documents.map((doc) => doc.fileId);
      fetchedFileIds.forEach((fileId) => {
        removePendingFile(fileId);
      });
    }
  }, [documents, removePendingFile]);

  // useMemo is called unconditionally
  const processedDocuments = useMemo(() => {
    if (!documents) return [];

    const docs = documents.map((doc) => {
      const fileTypeMatch = doc.documentTitle?.match(/\.(\w+)$/i);
      const fileType = fileTypeMatch ? `.${fileTypeMatch[1].toLowerCase()}` : "FileType";
      const createdAt = new Date(doc._creationTime);
      const formattedCreatedAt = createdAt.toLocaleString();
      const processingDuration = Date.now() - createdAt.getTime();
      const isStuck = doc.isProcessing && processingDuration > 10 * 60 * 1000; // 10 minutes

      return {
        ...doc,
        fileType,
        formattedCreatedAt,
        fileId: doc.fileId,
        isStuck,
      };
    });

    // Sort documents based on sortOrder
    return docs.sort((a, b) => {
      const dateA = new Date(a._creationTime).getTime();
      const dateB = new Date(b._creationTime).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [documents, sortOrder]);

  const handleRowClick = (doc: DocumentData) => {
    setSelectedFile(doc);
    setActiveView("preview");
  };

  const retryProcessing = async (fileId: string) => {
    try {
      const response = await fetch("/api/retry-processing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });

      if (!response.ok) {
        throw new Error("Retry processing failed");
      }
    } catch (error) {
      console.error("Error retrying processing:", error);
      alert("Failed to retry processing. Please try again.");
    }
  };

  // Conditional rendering after hooks
  if (documents === undefined) {
    return <p>Loading documents...</p>;
  }

  return (
    <div className="relative overflow-x-auto">
      <div className="max-h-[560px] overflow-y-auto">
        <Table className="table-fixed w-full min-w-full">
          <TableHeader className="border-t">
            <TableRow className="cursor-default hover:bg-transparent">
              <TableHead className="w-8 text-left font-semibold"></TableHead> {/* Add File */}
              <TableHead className="w-36 text-left font-semibold">Title</TableHead>
              <TableHead className="w-24 text-left font-semibold">Type</TableHead>
              <TableHead className="w-48 text-left font-semibold">Created At</TableHead>
              <TableHead className="w-56 text-left font-semibold">Progress</TableHead>
              <TableHead className="w-12 text-left font-semibold"></TableHead> {/* Progress Spinner */}
              <TableHead className="w-12 text-left font-semibold"></TableHead> {/* Delete */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Render Skeleton Rows for Pending Files */}
            {pendingFiles.map((file) => (
              <TableRow
                key={`pending-${file.fileId}`}
                className="group cursor-pointer hover:bg-gray-100 bg-gray-50 animate-pulse"
              >
                {/* Plus Icon Column for Pending Files */}
                <TableCell className="px-4 py-2 text-sm text-left">
                  {/* Placeholder or icon if needed */}
                </TableCell>
                
                <TableCell className="px-1 py-1 text-sm text-left">
                  <div className="pr-2">
                    <Skeleton className="h-4 w-[180px]" />
                  </div>
                </TableCell>
                {/* ... other skeleton cells ... */}
                <TableCell className="px-1 py-2 text-sm text-left">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="px-1 py-2 text-sm text-left">
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell className="px-1 py-2 text-sm text-left">
                  <Skeleton className="h-4 w-56" />
                </TableCell>
                <TableCell className="px-1 py-2 text-sm text-left">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                {/* New CircleX Column for Pending Files */}
                <TableCell className="px-1 py-2 text-sm text-left">
                  <XCircle className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-5 w-5 text-red-500 cursor-pointer" />
                </TableCell>
              </TableRow>
            ))}

            {/* Render Actual Document Rows */}
            {processedDocuments.map((doc) => (
              <TableRow
                key={doc._id.toString()}
                onClick={() => handleRowClick(doc)}
                className={`group cursor-pointer hover:bg-gray-100 ${
                  doc.isProcessing ? "bg-gray-50" : ""
                }`}
              >
                {/* Plus Icon Column */}
                <TableCell className="px-4 py-2 text-sm text-left">
                  {/* Placeholder or icon if needed */}
                </TableCell>
                
                <TableCell className="px-4 py-2 text-sm text-left">
                  <div className="pr-2">
                    {doc.documentTitle}
                  </div>
                </TableCell>
                <TableCell className="px-1 text-sm text-left">
                  <div className="pr-2">
                    {doc.fileType}
                  </div>
                </TableCell>
                <TableCell className="px-1 text-sm text-left">
                  <div className="pr-2">
                    {doc.formattedCreatedAt}
                  </div>
                </TableCell>
                <TableCell className="flex items-center space-x-1 px-1 text-sm text-left">
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
                  ) : (
                    <>
                      <Progress 
                        className="mt-2"
                        value={doc.isProcessed ? 100 : doc.progress || 0} 
                      />
                    </>
                  )}
                </TableCell>
                <TableCell className="px-1 py-2 text-sm text-left">
                  {doc.isProcessing ? (
                    <Loader2 className="animate-spin h-4 w-4 text-gray-500" aria-label="Loading" />
                  ) : doc.isProcessed ? (
                    <Check className="h-4 w-4 text-green-500" aria-label="Completed" />
                  ) : null}
                </TableCell>
                {/* New CircleX Column */}
                <TableCell className="px-1 py-2 text-sm text-left">
                  <XCircle className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-5 w-5 text-red-500 cursor-pointer" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
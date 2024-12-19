// FileList.tsx
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/canvas/(Projects)/_components/FileList.tsx

import React from "react";
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
import { useEditorStore } from "@/lib/store/editorStore"; // Updated import path
import { DocumentData } from "@/types/DocumentData"; // Import DocumentData type

export const FileList: React.FC<{ projectId: string }> = ({ projectId }) => {
  const documents = useQuery(api.projects.getDocumentsByProjectId, { projectId });
  const { setActiveView, setSelectedFile } = useEditorStore();

  if (documents === undefined) {
    return <p>Loading documents...</p>;
  }

  const processedDocuments = documents.map((doc) => {
    const fileTypeMatch = doc.documentTitle.match(/\.(\w+)$/);
    const fileType = fileTypeMatch ? `.${fileTypeMatch[1]}` : "Unknown";
    const createdAt = new Date(doc.createdAt);
    const formattedCreatedAt = createdAt.toLocaleString();

    return {
      ...doc,
      fileType,
      formattedCreatedAt,
      fileId: doc.fileId, // Ensure this field exists
    };
  });

  const handleRowClick = (doc: DocumentData) => {
    setSelectedFile(doc);
    setActiveView("preview");
  };

  return (
    <div className="relative">
      <Table>
        <TableHeader className="border-t">
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {processedDocuments.map((doc) => (
            <TableRow
            key={doc._id.toString()}
            onClick={() => handleRowClick(doc)}
            className={`cursor-pointer hover:bg-gray-100 ${doc.isProcessing ? "bg-gray-50" : ""
              }`}
          >
            <TableCell>{doc.documentTitle}</TableCell>
            <TableCell>{doc.fileType}</TableCell>
            <TableCell>{doc.formattedCreatedAt}</TableCell>
            <TableCell>
              {doc.isProcessing && (
                <Progress value={doc.progress || 0} />
              )}
              {!doc.isProcessing && doc.isProcessed && (
                <Progress value={100} />
              )}
              {!doc.isProcessing && !doc.isProcessed && (
                <Progress value={100} />
              )}
            </TableCell>
          </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
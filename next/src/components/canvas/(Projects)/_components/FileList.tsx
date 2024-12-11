// FileList.tsx
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/canvas/(Projects)/_components/FileList.tsx

import React from "react";
import { useQuery } from "convex/react";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { DocumentData } from "@/types/DocumentData"; // Import DocumentData type
import { useEditorStore } from "@/lib/store/editorStore";
// import { useFilePreviewStore } from "@/lib/store/useFilePreviewStore";

import FilePreview from "./FilePreview";

export const FileList: React.FC<{ projectId: Id<"projects"> }> = ({ projectId }) => {
  const documents = useQuery(api.projects.getDocumentsByProjectId, { projectId });
  const activeView = useEditorStore((state) => state.activeView);
  const setActiveView = useEditorStore((state) => state.setActiveView);
  const setSelectedFile = useEditorStore((state) => state.setSelectedFile);

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
    };
  });

  const handleRowClick = (doc: DocumentData) => {
    setSelectedFile(doc);
    setActiveView("preview");
  };

  return (
    <div className="relative">
      {/* Optional: Add your 'Add File' button here */}
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
              className="cursor-pointer hover:bg-gray-100"
            >
              <TableCell>{doc.documentTitle}</TableCell>
              <TableCell>{doc.fileType}</TableCell>
              <TableCell>{doc.formattedCreatedAt}</TableCell>
              <TableCell>
                <Progress value={100} /> {/* Adjust based on actual progress if needed */}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
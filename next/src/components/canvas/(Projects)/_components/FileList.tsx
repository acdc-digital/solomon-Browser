// FileList.tsx
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/canvas/(Projects)/_components/FileList.tsx
// FileList.tsx
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/canvas/(Projects)/_components/FileList.tsx

import React from "react";
import { useQuery } from "convex/react";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";

// Import ShadCN UI components


interface DocumentData {
  _id: Id<"projects">;
  documentTitle: string;
  createdAt: Date;
  // Add other fields if necessary
}

export const FileList: React.FC<{ projectId: Id<"projects"> }> = ({ projectId }) => {
  const documents = useQuery(api.projects.getDocumentsByProjectId, { projectId });

  if (documents === undefined) {
    return <p>Loading documents...</p>;
  }

  // Process documents to extract file type and format creation time
  const processedDocuments = documents.map((doc) => {
    // Extract file extension as type
    const fileTypeMatch = doc.documentTitle.match(/\.(\w+)$/);
    const fileType = fileTypeMatch ? `.${fileTypeMatch[1]}` : "Unknown";

    // Format creation time
    const createdAt = new Date(doc.createdAt);
    const formattedCreatedAt = createdAt.toLocaleString();

    return {
      ...doc,
      fileType,
      formattedCreatedAt,
    };
  });

  return (
    <Table>
      <TableHeader className="border-t">
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Created At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {processedDocuments.map((doc) => (
          <TableRow key={doc._id.toString()}>
            <TableCell>{doc.documentTitle}</TableCell>
            <TableCell>{doc.fileType}</TableCell>
            <TableCell>{doc.formattedCreatedAt}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
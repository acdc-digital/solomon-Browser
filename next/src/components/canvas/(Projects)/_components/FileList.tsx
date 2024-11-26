// FileList.tsx
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/canvas/(Projects)/_components/FileList.tsx
import React from "react";
import { useQuery } from "convex/react";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";

export const FileList: React.FC<{ projectId: Id<"projects"> }> = ({ projectId }) => {
  const documents = useQuery(api.projects.getDocumentsByProjectId, { projectId });

  if (documents === undefined) {
    return <p>Loading documents...</p>;
  }

  return (
    <ul>
      {documents.map((doc) => (
        <li key={doc._id.toString()}>{doc.documentTitle}</li>
      ))}
    </ul>
  );
};
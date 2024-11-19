// FileTable.tsx
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/canvas/(Projects)/_components/FileTable.tsx

import React from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BoltIcon, FilePlus } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

export function FileTable({ caption, files }) {
  const columns = [
    { header: 'Filename', accessor: 'filename', className: 'w-1/3' },
    { header: 'Type', accessor: 'type', className: 'w-1/3' },
    { header: 'Date Added', accessor: 'dateAdded', className: 'w-1/3 text-right' },
  ];

  const documents = useQuery(api.documents.getDocuments)
  const createDocument = useMutation(api.documents.createDocument);

  return (
    <div className="flex-grow overflow-y-auto m-2">
      <Button onClick={() => { createDocument({ title: 'this is the second test'}) }}
              className="text-gray-600 border-b border-gray-500 mb-2"
              variant="outline"
              size="sm"
              >
              <FilePlus className="mr-2 h-4 w-4" />
          Add File
      </Button>

      <Table>
        <TableCaption>{caption}</TableCaption>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.accessor} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell key={column.accessor} className={column.cellClassName}>
                  {file[column.accessor]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
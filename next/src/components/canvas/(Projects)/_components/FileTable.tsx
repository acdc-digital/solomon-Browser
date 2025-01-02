// UploadDocumentButton.tsx
// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/components/canvas/(Projects)/_components/UploadDocumentButton.tsx

import React, { useState } from "react";
import UploadDocumentForm from "./UploadDocumentForm";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FilePlus, ArrowUpDown } from "lucide-react"; // Import ArrowUpDown
import { useEditorStore } from "@/lib/store/editorStore"; // Import the store

export function UploadDocumentButton({ projectId }) {
  const [isOpen, setIsOpen] = useState(false);
  const sortOrder = useEditorStore((state) => state.sortOrder);
  const toggleSortOrder = useEditorStore((state) => state.toggleSortOrder);

  return (
    <div className="flex-grow overflow-y-auto m-2">
      {/* Upload File Button and Sort Button */}
      <div className="flex flex-row justify-end mr-1">
        {/* Sort Button */}
        <Button
          onClick={toggleSortOrder}
          className="text-gray-600 border-b border-gray-500 ml-2 mt-0 mb-0 mr-2"
          variant="outline"
          size="sm"
        >
          <ArrowUpDown className="mr-2 h-4 w-4" />
          Sort: {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
        </Button>

        {/* Upload File Button and Dialog */}
        <Dialog onOpenChange={setIsOpen} open={isOpen}>
          <DialogTrigger asChild>
            <Button
              className="text-gray-600 border-b border-gray-500 ml-2 mt-0 mb-0 mr-4"
              variant="outline"
              size="sm"
            >
              <FilePlus className="mr-2 h-4 w-4" />
              Add File
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload New Document</DialogTitle>
              <DialogDescription>
                New documents will be indexed to your project for your assistant to search.
              </DialogDescription>
              <UploadDocumentForm
                onUpload={() => setIsOpen(false)}
                projectId={projectId}
              />
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
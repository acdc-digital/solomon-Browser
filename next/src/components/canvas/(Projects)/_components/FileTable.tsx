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
import { FilePlus } from "lucide-react";

export function UploadDocumentButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex-grow overflow-y-auto m-2">
      {/* Upload File Button and Dialog */}
      <div className="flex flex-row justify-end mr-1">
        <Dialog onOpenChange={setIsOpen} open={isOpen}>
          <DialogTrigger asChild>
            <Button
              className="text-gray-600 border-b border-gray-500 ml-2 mt-1 mb-1 mr-1"
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
              <UploadDocumentForm onUpload={() => setIsOpen(false)} />
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
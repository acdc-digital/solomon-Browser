// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/lib/store/editorStore.ts
// store/editorStore.ts

import { create } from 'zustand';
import { DocumentData } from '@/types/DocumentData';
import { Id } from '../../../convex/_generated/dataModel';

interface EditorState {
  activeView: "editor" | "files" | "preview";
  selectedFile: DocumentData | null;
  projectId: Id<"projects"> | null; // Add this line if you want a typed Convex ID
  pendingFiles: DocumentData[];
  setActiveView: (view: "editor" | "files" | "preview") => void;
  setSelectedFile: (file: DocumentData | null) => void;
  setProjectId: (id: Id<"projects"> | null) => void; // Add a setter for projectId
  addPendingFile: (file: DocumentData) => void;
  removePendingFile: (fileId: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeView: "editor", // Default view
  selectedFile: null,
  projectId: null, // Initialize projectId
  pendingFiles: [],
  setActiveView: (view) => set({ activeView: view }),
  setSelectedFile: (file) => set({ selectedFile: file }),
  setProjectId: (id) => set({ projectId: id }), // Implement the setter
  addPendingFile: (file) => set((state) => ({ pendingFiles: [...state.pendingFiles, file] })),
  removePendingFile: (fileId) => set((state) => ({
    pendingFiles: state.pendingFiles.filter((file) => file.fileId !== fileId),
  })),
}));
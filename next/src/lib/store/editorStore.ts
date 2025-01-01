// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/lib/store/editorStore.ts
// store/editorStore.ts

import { create } from 'zustand';
import { DocumentData } from '@/types/DocumentData';
import { Id } from '../../../convex/_generated/dataModel';

interface EditorState {
  activeView: "editor" | "files" | "preview" | "users"; // Added "users"
  activeComponent: "Admin" | "Files" | "Projects" | "Docs" | "Users"; // Added "Users" component
  selectedFile: DocumentData | null;
  projectId: Id<"projects"> | null;
  pendingFiles: DocumentData[];
  setActiveView: (view: "editor" | "files" | "preview" | "users") => void; // Updated type
  setActiveComponent: (component: "Admin" | "Files" | "Projects" | "Docs" | "Users") => void; // New setter
  setSelectedFile: (file: DocumentData | null) => void;
  setProjectId: (id: Id<"projects"> | null) => void;
  addPendingFile: (file: DocumentData) => void;
  removePendingFile: (fileId: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeView: "editor", // Default view
  activeComponent: "Admin", // Default activeComponent
  selectedFile: null,
  projectId: null,
  pendingFiles: [],
  setActiveView: (view) => set({ activeView: view }),
  setActiveComponent: (component) => set({ activeComponent: component }), // Implemented setter
  setSelectedFile: (file) => set({ selectedFile: file }),
  setProjectId: (id) => set({ projectId: id }),
  addPendingFile: (file) => set((state) => ({ pendingFiles: [...state.pendingFiles, file] })),
  removePendingFile: (fileId) => set((state) => ({
    pendingFiles: state.pendingFiles.filter((file) => file.fileId !== fileId),
  })),
}));
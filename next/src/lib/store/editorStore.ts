// /Users/matthewsimon/Documents/Github/solomon-electron/next/src/lib/store/editorStore.ts
// store/editorStore.ts

import { create } from 'zustand';
import { DocumentData } from '@/types/DocumentData'; // Adjust the import path accordingly

interface EditorState {
  activeView: "editor" | "files" | "preview";
  selectedFile: DocumentData | null;
  setActiveView: (view: "editor" | "files" | "preview") => void;
  setSelectedFile: (file: DocumentData | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeView: "editor", // Default view
  selectedFile: null,
  setActiveView: (view) => set({ activeView: view }),
  setSelectedFile: (file) => set({ selectedFile: file }),
}));
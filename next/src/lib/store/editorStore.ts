// store/editorStore.ts
import { create } from 'zustand'

interface EditorState {
  activeView: "editor" | "files";
  setActiveView: (view: "editor" | "files") => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeView: "editor", // Default view
  setActiveView: (view) => set({ activeView: view }),
}));
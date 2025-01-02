// Zustand Chat Store (State Manager)
// /Users/matthewsimon/Documents/github/solomon-electron/solomon-electron/next/src/lib/store/chatStore.ts

import { create } from 'zustand';

interface ChatState {
    isChatActive: boolean;
    toggleChat: () => void;
    activateChat: () => void;
    deactivateChat: () => void;
    chatWidth: number;
    setChatWidth: (width: number) => void;
}

const useChatStore = create<ChatState>((set) => ({
    isChatActive: false,
    toggleChat: () => set((state) => ({ isChatActive: !state.isChatActive })),
    activateChat: () => set({ isChatActive: true }),
    deactivateChat: () => set({ isChatActive: false }),
    chatWidth: typeof window !== 'undefined' ? parseInt(localStorage.getItem('chatWidth') || '300') : 300, // Initial width
    setChatWidth: (width: number) => {
        localStorage.setItem('chatWidth', width.toString());
        set({ chatWidth: width });
    },
}));

export default useChatStore;
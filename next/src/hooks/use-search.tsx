// Search Function 
// /Users/matthewsimon/Documents/github/solomon-electron/solomon-electron/next/src/hooks/use-search.tsx

import { create } from 'zustand';

type SearchStore = {
    isOpen: boolean;
    onOpen: () => void; 
    onClose: () => void; 
    toggle: () => void; 
};

export const useSearch = create<SearchStore>((set, get) => ({
    isOpen: false,
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
    toggle: () => set({ isOpen: !get().isOpen }),
}));




import { create } from "zustand";

interface SidebarStore {
    isMinimized: boolean;
    isSheetOpen: boolean;
    toggle: () => void;
    setIsOpen: (isOpen: boolean) => void;
}

export const useSidebar = create<SidebarStore>((set) => ({
    isMinimized: false,
    isSheetOpen: false,
    toggle: () => set((state) => ({ isMinimized: !state.isMinimized })),
    setIsOpen: (isOpen) => set({ isSheetOpen: isOpen }),
}));

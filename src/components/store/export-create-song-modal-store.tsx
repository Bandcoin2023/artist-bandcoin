import { create } from "zustand";

interface ExportCreateSongModalProps {
    isOpen: boolean;
    audioBlob?: Blob;
    setIsOpen: (isOpen: boolean) => void;
    setData: (audioBlob: Blob) => void;
}

export const useExportCreateSongModalStore = create<ExportCreateSongModalProps>((set) => ({
    isOpen: false,
    audioBlob: undefined,
    setData: (audioBlob) => set({ audioBlob }),
    setIsOpen: (isOpen) => set({ isOpen }),
}));

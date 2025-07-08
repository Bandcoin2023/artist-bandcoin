import { create } from "zustand";

interface CreateRoyalityModalProps {
    isOpen: boolean;
    albumId?: number;
    setIsOpen: (isOpen: boolean) => void;
    setData: (albumId: number) => void;
}

export const useCreateRoyalityModalStore = create<CreateRoyalityModalProps>((set) => ({
    isOpen: false,
    albumId: undefined,
    setData: (albumId) => set({ albumId }),
    setIsOpen: (isOpen) => set({ isOpen }),
}));

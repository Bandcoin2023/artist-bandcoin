import { create } from "zustand";
import { AssetType, AssetTypeWithStems } from "~/types/market/market-asset-type";

interface AssetInfoModalProps {
    isOpen: boolean;
    data?: AssetTypeWithStems;
    setIsOpen: (isOpen: boolean) => void;
    setData: (data: AssetTypeWithStems) => void;
}

export const useAssestInfoModalStore = create<AssetInfoModalProps>((set) => ({
    isOpen: false,
    data: undefined,
    setData: (data) => set({ data }),
    setIsOpen: (isOpen) => set({ isOpen }),
}));

import { create } from "zustand";
import { MarketAssetType } from "~/types/market/market-asset-type";
import { SongItemType } from "~/types/song/song-item-types";

interface WalletBalanceProps {
    isCreatorMode: boolean;
    setBalanceType: (type: "creator" | "user") => void;
    setCreatorStorageId: (id: string) => void;
    creatorStorageId: string;
}

export const useWalletBalanceStore = create<WalletBalanceProps>((set) => ({
    isCreatorMode: false,
    setBalanceType: (type) => set({ isCreatorMode: type === "creator" }),
    creatorStorageId: "",
    setCreatorStorageId: (id) => set({ creatorStorageId: id }),
}));

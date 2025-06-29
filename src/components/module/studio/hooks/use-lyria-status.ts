import { create } from "zustand";

interface LyriaStatus {
    lyriaStatus: string,
    setLyriaStatus: (status: string) => void,
}

export const useLyriaStatus = create<LyriaStatus>((set) => ({
    lyriaStatus: "Disconnected",
    setLyriaStatus: (status: string) => set({ lyriaStatus: status }),
}));
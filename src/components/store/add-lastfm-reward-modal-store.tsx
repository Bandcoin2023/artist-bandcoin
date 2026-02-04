import { create } from "zustand";
import { LastFmTrack } from "~/lib/lastfm/api";

interface AddLastFMRewardModalState {
    isOpen: boolean;
    trackData: LastFmTrack | null;
    setIsOpen: (isOpen: boolean) => void;
    setTrackData: (track: LastFmTrack | null) => void;
    openDialog: (track: LastFmTrack) => void;
}

export const useAddLastFMRewardModalStore = create<AddLastFMRewardModalState>((set) => ({
    isOpen: false,
    trackData: null,
    setIsOpen: (isOpen) => set({ isOpen }),
    setTrackData: (track) => set({ trackData: track }),
    openDialog: (track) => set({ isOpen: true, trackData: track }),
}));
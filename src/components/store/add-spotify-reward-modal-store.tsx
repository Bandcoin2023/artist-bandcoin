import { create } from "zustand";
import { SpotifyTrack } from "~/types/spotify";

interface AddRewardModalState {
    isOpen: boolean;
    trackData: SpotifyTrack | null;
    setIsOpen: (isOpen: boolean) => void;
    setTrackData: (track: SpotifyTrack | null) => void;
    openDialog: (track: SpotifyTrack) => void;
}

export const useAddRewardModalStore = create<AddRewardModalState>((set) => ({
    isOpen: false,
    trackData: null,
    setIsOpen: (isOpen) => set({ isOpen }),
    setTrackData: (track) => set({ trackData: track }),
    openDialog: (track) => set({ isOpen: true, trackData: track }),
}));
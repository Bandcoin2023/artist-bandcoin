import { create } from "zustand";
import { Track } from "../module/studio/types/audio";

interface AudioTrackTypes {
    audioBlob?: Blob
    TracksBlob?: Track[]
}

interface ExportCreateSongModalProps {
    isOpen: boolean;
    data: AudioTrackTypes
    setIsOpen: (isOpen: boolean) => void;
    setData: (data: AudioTrackTypes) => void;
}

export const useExportCreateSongModalStore = create<ExportCreateSongModalProps>((set) => ({
    isOpen: false,
    data: {
        audioBlob: undefined,
        TracksBlob: []
    },
    setData: (data: AudioTrackTypes) => set({
        data: {
            audioBlob: data.audioBlob,
            TracksBlob: data.TracksBlob
        }
    }),
    setIsOpen: (isOpen) => set({ isOpen }),
}));

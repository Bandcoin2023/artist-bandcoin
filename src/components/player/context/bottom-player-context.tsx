"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { StemTypeWithoutAssetId } from "~/types/song/song-item-types"

interface PlayerContextType {
    isPlayerVisible: boolean
    currentTracks: StemTypeWithoutAssetId[]
    currentSong: {
        title: string
        artist: string
        thumbnail?: string
        url?: string
    } | null
    showPlayer: (
        tracks: StemTypeWithoutAssetId[],
        songTitle: string,
        artistName: string,
        url?: string,
        thumbnail?: string,
    ) => void
    hidePlayer: () => void
}

const BottomPlayerContext = createContext<PlayerContextType | undefined>(undefined)

export function BottomPlayerProvider({ children }: { children: ReactNode }) {
    const [isPlayerVisible, setIsPlayerVisible] = useState(false)
    const [currentTracks, setCurrentTracks] = useState<StemTypeWithoutAssetId[]>([])
    const [currentSong, setCurrentSong] = useState<{
        title: string
        artist: string
        thumbnail?: string
        url?: string
    } | null>(null)

    const showPlayer = (
        tracks: StemTypeWithoutAssetId[],
        songTitle: string,
        artistName: string,
        url?: string,
        thumbnail?: string,
    ) => {
        setCurrentTracks(tracks)
        setCurrentSong({
            title: songTitle,
            artist: artistName,
            thumbnail: thumbnail,
            url: url,
        })
        setIsPlayerVisible(true)
    }

    const hidePlayer = () => {
        setIsPlayerVisible(false)
        setCurrentTracks([])
        setCurrentSong(null)
    }

    return (
        <BottomPlayerContext.Provider
            value={{
                isPlayerVisible,
                currentTracks,
                currentSong,
                showPlayer,
                hidePlayer,
            }}
        >
            {children}
        </BottomPlayerContext.Provider>
    )
}

export function useBottomPlayer() {
    const context = useContext(BottomPlayerContext)
    if (context === undefined) {
        throw new Error("useBottomPlayer must be used within a BottomPlayerProvider")
    }
    return context
}

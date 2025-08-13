"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "~/components/shadcn/ui/button"
import { Slider } from "~/components/shadcn/ui/slider"
import { Card } from "~/components/shadcn/ui/card"
import { Progress } from "~/components/shadcn/ui/progress"
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Headphones,
    X,
    ChevronUp,
    ChevronDown,
    Music,
    Loader2,
} from "lucide-react"
import { useBottomPlayer } from "./context/bottom-player-context"
import { StemTypeWithoutAssetId } from "~/types/song/song-item-types"
import { Waveform } from "../module/studio/components/Static-Waveform"

interface AudioState {
    loaded: boolean
    loading: boolean
    error: boolean
    canPlay: boolean
    duration: number
}

export function StemPlayer() {
    const { isPlayerVisible, currentTracks, currentSong, hidePlayer } = useBottomPlayer()
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [trackStates, setTrackStates] = useState<StemTypeWithoutAssetId[]>([])
    const [masterVolume, setMasterVolume] = useState(1)
    const [showTracks, setShowTracks] = useState(false)
    const [showVolumeSlider, setShowVolumeSlider] = useState(false)
    const [audioStates, setAudioStates] = useState<Record<string, AudioState>>({})
    const [isGlobalLoading, setIsGlobalLoading] = useState(false)
    const [autoplayEnabled, setAutoplayEnabled] = useState(true)
    // Main song mode state
    const [isMainSongMode, setIsMainSongMode] = useState(false)
    const mainAudioRef = useRef<HTMLAudioElement | null>(null)
    const [mainAudioLoaded, setMainAudioLoaded] = useState(false)

    // Stem mode refs
    const audioRefs = useRef<Record<string, HTMLAudioElement>>({})
    const intervalRef = useRef<NodeJS.Timeout>()
    const syncTimeoutRef = useRef<NodeJS.Timeout>()
    const isSeekingRef = useRef(false)
    const lastSyncTimeRef = useRef(0)

    // Generate colors for tracks
    const getTrackColor = (index: number) => {
        const colors = ["#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5A2B"]
        return colors[index % colors.length]
    }

    // Handle master volume changes for main song
    useEffect(() => {
        if (isMainSongMode && mainAudioRef.current) {
            mainAudioRef.current.volume = masterVolume
        }
    }, [masterVolume, isMainSongMode])

    // Initialize tracks or main song
    useEffect(() => {
        // Reset everything first
        setIsPlaying(false)
        setCurrentTime(0)

        // Clear intervals and timeouts
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current)
        }

        // Pause and cleanup all existing audio
        Object.values(audioRefs.current).forEach((audio) => {
            audio.pause()
            audio.currentTime = 0
        })
        if (mainAudioRef.current) {
            mainAudioRef.current.pause()
            mainAudioRef.current.currentTime = 0
        }

        isSeekingRef.current = false
        lastSyncTimeRef.current = 0

        // Check if we should use main song mode
        if (currentSong?.url && currentSong.url.trim() !== "") {
            console.log("Initializing main song mode")
            setIsMainSongMode(true)
            setIsGlobalLoading(true)

            // Initialize main audio
            const mainAudio = new Audio()
            mainAudio.crossOrigin = "anonymous"
            mainAudio.preload = "metadata"
            mainAudio.src = currentSong.url
            mainAudioRef.current = mainAudio

            const handleMainAudioReady = () => {
                console.log("Main audio loaded, duration:", mainAudio.duration)
                setDuration(mainAudio.duration || 180)
                setMainAudioLoaded(true)
                setIsGlobalLoading(false)
            }

            const handleMainAudioError = (e: Event) => {
                console.error("Error loading main audio:", e)
                setMainAudioLoaded(false)
                setIsGlobalLoading(false)
            }

            const handleMainAudioTimeUpdate = () => {
                if (!isSeekingRef.current) {
                    setCurrentTime(mainAudio.currentTime)
                }
            }

            const handleMainAudioEnded = () => {
                setIsPlaying(false)
                setCurrentTime(mainAudio.duration || 0)
            }

            mainAudio.addEventListener("canplaythrough", handleMainAudioReady)
            mainAudio.addEventListener("error", handleMainAudioError)
            mainAudio.addEventListener("timeupdate", handleMainAudioTimeUpdate)
            mainAudio.addEventListener("ended", handleMainAudioEnded)

            return () => {
                mainAudio.removeEventListener("canplaythrough", handleMainAudioReady)
                mainAudio.removeEventListener("error", handleMainAudioError)
                mainAudio.removeEventListener("timeupdate", handleMainAudioTimeUpdate)
                mainAudio.removeEventListener("ended", handleMainAudioEnded)
            }
        } else if (currentTracks.length > 0) {
            console.log("Initializing stem mode with", currentTracks.length, "tracks")
            setIsMainSongMode(false)
            setMainAudioLoaded(false)

            const tracksWithColors = currentTracks.map((track, index) => ({
                ...track,
                color: getTrackColor(index) ?? "#8B5CF6", // Default color if none is provided
            }))
            setTrackStates(tracksWithColors)
            const maxEndTime = Math.max(...currentTracks.map((track) => track.endTime))
            setDuration(maxEndTime)
            setIsGlobalLoading(true)
        }
    }, [currentTracks, currentSong])

    useEffect(() => {
        if (isPlayerVisible && autoplayEnabled && !isPlaying) {
            // Auto-play for main song mode
            if (isMainSongMode && mainAudioLoaded && mainAudioRef.current) {
                console.log("Auto-playing main song")
                togglePlayPause()
            }
            // Auto-play for stem mode when all tracks are loaded
            else if (!isMainSongMode && trackStates.length > 0 && !isGlobalLoading) {
                const allTracksLoaded = trackStates.every(track => {
                    const trackId = track.id.toString()
                    return audioStates[trackId]?.loaded
                })

                if (allTracksLoaded) {
                    console.log("Auto-playing stems")
                    togglePlayPause()
                }
            }
        }
    }, [isPlayerVisible, autoplayEnabled, isPlaying, isMainSongMode, mainAudioLoaded, trackStates, isGlobalLoading, audioStates])

    // Initialize stem audio elements
    useEffect(() => {
        if (trackStates.length === 0 || isMainSongMode) return

        let loadedCount = 0
        const totalTracks = trackStates.length

        trackStates.forEach((track) => {
            const trackId = track.id.toString()
            if (!audioRefs.current[trackId] && track.steamUrl) {
                setAudioStates((prev) => ({
                    ...prev,
                    [trackId]: {
                        loaded: false,
                        loading: true,
                        error: false,
                        canPlay: false,
                        duration: 0,
                    },
                }))

                const audio = new Audio()
                audio.crossOrigin = "anonymous"
                audio.preload = "metadata"
                audio.volume = 0
                audio.src = track.steamUrl

                audioRefs.current[trackId] = audio

                const handleCanPlay = () => {
                    loadedCount++
                    setAudioStates((prev) => ({
                        ...prev,
                        [trackId]: {
                            loaded: true,
                            loading: false,
                            error: false,
                            canPlay: true,
                            duration: audio.duration || track.endTime - track.startTime,
                        },
                    }))

                    if (loadedCount === totalTracks) {
                        console.log("All stems loaded successfully")
                        setIsGlobalLoading(false)
                    }
                }

                const handleError = () => {
                    loadedCount++
                    setAudioStates((prev) => ({
                        ...prev,
                        [trackId]: {
                            loaded: false,
                            loading: false,
                            error: true,
                            canPlay: false,
                            duration: 0,
                        },
                    }))

                    if (loadedCount === totalTracks) {
                        setIsGlobalLoading(false)
                    }
                }

                audio.addEventListener("canplaythrough", handleCanPlay)
                audio.addEventListener("error", handleError)

                // Fallback timeout
                setTimeout(() => {
                    if (!audioStates[trackId]?.loaded && !audioStates[trackId]?.error) {
                        handleCanPlay()
                    }
                }, 3000)
            }
        })

        return () => {
            Object.keys(audioRefs.current).forEach((trackId) => {
                if (!trackStates.find((t) => t.id.toString() === trackId)) {
                    const audio = audioRefs.current[trackId]
                    if (audio) {
                        audio.pause()
                        audio.src = ""
                        delete audioRefs.current[trackId]
                    }
                }
            })
        }
    }, [trackStates, isMainSongMode])

    // Stem synchronization system
    const syncStems = useCallback(() => {
        if (isMainSongMode || isGlobalLoading || isSeekingRef.current) return

        const now = currentTime
        const soloedTracks = trackStates.filter((t) => t.soloed)
        const hasSoloedTracks = soloedTracks.length > 0

        // Determine which tracks should be playing
        const shouldBePlaying = new Set<string>()

        trackStates.forEach((track) => {
            const trackId = track.id.toString()
            const audio = audioRefs.current[trackId]
            const audioState = audioStates[trackId]

            if (!audio || !audioState?.canPlay) return

            const isInTimeRange = now >= track.startTime && now < track.endTime
            let shouldPlay = false

            if (hasSoloedTracks) {
                shouldPlay = isInTimeRange && track.soloed && isPlaying
            } else {
                shouldPlay = isInTimeRange && !track.muted && isPlaying
            }

            if (shouldPlay) {
                shouldBePlaying.add(trackId)
            }
        })

        // Process each track
        trackStates.forEach((track) => {
            const trackId = track.id.toString()
            const audio = audioRefs.current[trackId]
            const audioState = audioStates[trackId]

            if (!audio || !audioState?.canPlay) return

            const shouldPlay = shouldBePlaying.has(trackId)
            const isCurrentlyPlaying = !audio.paused

            if (shouldPlay && !isCurrentlyPlaying) {
                // Start playing this track
                const trackTime = now - track.startTime + track.trimStart
                const audioDuration = audioState.duration
                let targetTime = trackTime

                if (audioDuration > 0) {
                    targetTime = targetTime % audioDuration
                    targetTime = Math.max(0, targetTime)
                } else {
                    targetTime = Math.max(0, Math.min(trackTime, track.trimEnd))
                }

                audio.currentTime = targetTime
                audio.volume = track.volume * masterVolume

                // Set looping if needed
                if (track.endTime - track.startTime > audioDuration) {
                    audio.loop = true
                } else {
                    audio.loop = false
                }

                audio.play().catch((error) => {
                    console.warn(`Could not start track ${track.name}:`, error)
                })
            } else if (!shouldPlay && isCurrentlyPlaying) {
                // Stop playing this track
                audio.pause()
            } else if (shouldPlay && isCurrentlyPlaying) {
                // Update volume for playing track
                audio.volume = track.volume * masterVolume

                // Check if we need to sync the position (only if significantly off)
                const trackTime = now - track.startTime + track.trimStart
                const audioDuration = audioState.duration
                let expectedTime = trackTime

                if (audioDuration > 0) {
                    expectedTime = expectedTime % audioDuration
                    expectedTime = Math.max(0, expectedTime)
                } else {
                    expectedTime = Math.max(0, Math.min(trackTime, track.trimEnd))
                }

                const timeDiff = Math.abs(audio.currentTime - expectedTime)
                if (timeDiff > 1.0) {
                    // Only sync if more than 1 second off
                    console.log(`Syncing ${track.name}: ${audio.currentTime.toFixed(2)} -> ${expectedTime.toFixed(2)}`)
                    audio.currentTime = expectedTime
                }
            }
        })
    }, [currentTime, isPlaying, trackStates, masterVolume, audioStates, isGlobalLoading, isMainSongMode])

    // Time progression for stem mode
    useEffect(() => {
        if (isMainSongMode) return // Main song handles its own time updates

        if (isPlaying && !isGlobalLoading && !isSeekingRef.current) {
            intervalRef.current = setInterval(() => {
                setCurrentTime((prevTime) => {
                    const newTime = prevTime + 0.1
                    if (newTime >= duration) {
                        setIsPlaying(false)
                        return duration
                    }
                    return newTime
                })
            }, 100)
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [isPlaying, duration, isGlobalLoading, isMainSongMode])

    // Sync stems when time changes
    useEffect(() => {
        if (!isMainSongMode) {
            syncStems()
        }
    }, [currentTime, syncStems, isMainSongMode])

    const togglePlayPause = () => {
        if (isGlobalLoading) return

        const newPlayingState = !isPlaying
        setIsPlaying(newPlayingState)

        if (isMainSongMode && mainAudioRef.current) {
            if (newPlayingState) {
                mainAudioRef.current.volume = masterVolume
                mainAudioRef.current.play().catch(console.error)
            } else {
                mainAudioRef.current.pause()
            }
        } else {
            // Stem mode - let the sync system handle play/pause
            if (!newPlayingState) {
                // Immediately pause all stems
                Object.values(audioRefs.current).forEach((audio) => {
                    audio.pause()
                })
            }
        }
    }

    const handleSeek = (time: number) => {
        const targetTime = Math.max(0, Math.min(time, duration))

        if (isMainSongMode && mainAudioRef.current) {
            isSeekingRef.current = true
            mainAudioRef.current.currentTime = targetTime
            setCurrentTime(targetTime)

            // Reset seeking flag after a short delay
            setTimeout(() => {
                isSeekingRef.current = false
            }, 100)
        } else {
            // Stem mode seeking
            isSeekingRef.current = true

            // Pause all stems immediately
            Object.values(audioRefs.current).forEach((audio) => {
                audio.pause()
            })

            setCurrentTime(targetTime)
            lastSyncTimeRef.current = targetTime

            // Reset seeking flag and trigger sync after a short delay
            setTimeout(() => {
                isSeekingRef.current = false
                syncStems()
            }, 50)
        }
    }

    const skipForward = () => {
        const soloedTracks = trackStates.filter((t) => t.soloed)
        if (soloedTracks.length > 0 && !isMainSongMode) {
            const currentSoloTrack = soloedTracks.find((t) => currentTime >= t.startTime && currentTime < t.endTime)
            if (currentSoloTrack) {
                handleSeek(Math.min(currentSoloTrack.endTime, duration))
            } else {
                const nextSoloTrack = soloedTracks.find((t) => t.startTime > currentTime)
                if (nextSoloTrack) {
                    handleSeek(nextSoloTrack.startTime)
                }
            }
        } else {
            handleSeek(Math.min(currentTime + 10, duration))
        }
    }

    const skipBackward = () => {
        const soloedTracks = trackStates.filter((t) => t.soloed)
        if (soloedTracks.length > 0 && !isMainSongMode) {
            const currentSoloTrack = soloedTracks.find((t) => currentTime >= t.startTime && currentTime < t.endTime)
            if (currentSoloTrack && currentTime > currentSoloTrack.startTime + 2) {
                handleSeek(currentSoloTrack.startTime)
            } else {
                const prevSoloTrack = soloedTracks
                    .filter((t) => t.endTime <= currentTime)
                    .sort((a, b) => b.endTime - a.endTime)[0]
                if (prevSoloTrack) {
                    handleSeek(prevSoloTrack.startTime)
                } else {
                    handleSeek(0)
                }
            }
        } else {
            handleSeek(Math.max(currentTime - 10, 0))
        }
    }

    const updateTrackState = (trackId: string, updates: Partial<StemTypeWithoutAssetId>) => {
        setTrackStates((prev) =>
            prev.map((track) => {
                if (track.id.toString() === trackId) {
                    return { ...track, ...updates }
                }
                return track
            }),
        )
    }

    const toggleMute = (trackId: string) => {
        const track = trackStates.find((t) => t.id.toString() === trackId)
        if (track) {
            updateTrackState(trackId, { muted: !track.muted })
        }
    }

    const toggleSolo = (trackId: string) => {
        const track = trackStates.find((t) => t.id.toString() === trackId)
        if (track) {
            const newSoloState = !track.soloed

            // Pause all stems immediately
            Object.values(audioRefs.current).forEach((audio) => {
                audio.pause()
            })

            setTrackStates((prev) => {
                return prev.map((t) => {
                    if (t.id.toString() === trackId) {
                        return { ...t, soloed: newSoloState }
                    }
                    if (newSoloState) {
                        return { ...t, soloed: false }
                    }
                    return t
                })
            })

            if (newSoloState) {
                setTimeout(() => {
                    handleSeek(track.startTime)
                }, 100)
            }
        }
    }

    const updateTrackVolume = (trackId: string, volume: number) => {
        const audio = audioRefs.current[trackId]
        if (audio) {
            audio.volume = volume * masterVolume
        }
        updateTrackState(trackId, { volume })
    }

    const handleClose = () => {
        setIsPlaying(false)

        // Clear all intervals and timeouts
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current)
        }

        // Clean up main audio
        if (mainAudioRef.current) {
            mainAudioRef.current.pause()
            mainAudioRef.current.src = ""
            mainAudioRef.current = null
        }

        // Clean up stem audio
        Object.values(audioRefs.current).forEach((audio) => {
            audio.pause()
            audio.src = ""
        })
        audioRefs.current = {}

        setIsMainSongMode(false)
        setMainAudioLoaded(false)
        hidePlayer()
    }

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60)
        const seconds = Math.floor(time % 60)
        return `${minutes}:${seconds.toString().padStart(2, "0")}`
    }

    const activeTracks = trackStates.filter((track) => {
        const soloedTracks = trackStates.filter((t) => t.soloed)
        const hasSoloedTracks = soloedTracks.length > 0
        const isInTimeRange = currentTime >= track.startTime && currentTime < track.endTime

        if (hasSoloedTracks) {
            return isInTimeRange && track.soloed
        } else {
            return isInTimeRange && !track.muted
        }
    })

    const activePlayingCount = Object.values(audioRefs.current).filter((audio) => !audio.paused).length

    if (!isPlayerVisible || !currentSong) {
        return null
    }

    return (
        <div className="fixed bottom-2 left-1/2 transform w-full md:w-1/3  -translate-x-1/2 z-50">
            <div className="flex flex-col items-center">
                {/* Loading Indicator */}
                {isGlobalLoading && (
                    <Card className="bg-background/95 backdrop-blur-md border shadow-2xl rounded-2xl overflow-hidden w-full mb-2">
                        <div className="p-4 text-center">
                            <div className="flex items-center justify-center space-x-2 mb-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm font-medium">{isMainSongMode ? "Loading song..." : "Loading tracks..."}</span>
                            </div>
                            {!isMainSongMode && (
                                <>
                                    <Progress
                                        value={(Object.values(audioStates).filter((s) => s.loaded).length / trackStates.length) * 100}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {Object.values(audioStates).filter((s) => s.loaded).length} of {trackStates.length} tracks loaded
                                    </p>
                                </>
                            )}
                        </div>
                    </Card>
                )}

                {/* Track Controls - Only show in stem mode */}
                <div
                    className={`transition-all duration-500 ease-in-out  overflow-hidden w-full  ${showTracks && !isGlobalLoading && !isMainSongMode
                        ? "max-h-96 opacity-100 transform translate-y-0"
                        : "max-h-0 opacity-0 transform -translate-y-4"
                        }`}
                >
                    <Card className=" border  rounded-2xl overflow-hidden  w-full   mb-2">
                        <div className="p-3 w-full">
                            <div className="space-y-2 max-h-40 overflow-y-auto overflow-x-hidden">
                                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Tracks ({trackStates.length}){trackStates.some((t) => t.soloed) && " • Solo Mode"}
                                </h4>
                                {trackStates.map((track, index) => {
                                    const trackId = track.id.toString()
                                    const audioState = audioStates[trackId]
                                    const audio = audioRefs.current[trackId]
                                    const isActive = currentTime >= track.startTime && currentTime < track.endTime
                                    const soloedTracks = trackStates.filter((t) => t.soloed)
                                    const hasSoloedTracks = soloedTracks.length > 0
                                    const shouldHighlight = isActive && (hasSoloedTracks ? track.soloed : !track.muted)
                                    const isCurrentlyPlaying = audio && !audio.paused

                                    return (
                                        <div
                                            key={track.id}
                                            className={`flex items-center space-x-2 p-2 rounded-lg transition-all duration-300 cursor-pointer transform hover:scale-[1.02] ${shouldHighlight
                                                ? "bg-primary/10 border border-primary/20 shadow-sm"
                                                : track.soloed
                                                    ? "bg-yellow-50 border border-yellow-200 shadow-sm"
                                                    : "bg-background/50 hover:bg-background/80"
                                                }`}
                                            onClick={() => handleSeek(track.startTime)}
                                            style={{
                                                animationDelay: `${index * 50}ms`,
                                                animation: showTracks ? "slideInUp 0.3s ease-out forwards" : "none",
                                            }}
                                        >
                                            <div
                                                className="w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300"
                                                style={{
                                                    backgroundColor: track.color,
                                                    boxShadow: isCurrentlyPlaying ? `0 0 8px ${track.color}` : "none",
                                                }}
                                            />

                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium truncate">
                                                    {track.name}
                                                    {track.soloed && <span className="ml-1 text-yellow-600 font-bold animate-pulse">SOLO</span>}
                                                    {audioState?.loading && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
                                                    {audioState?.error && <span className="ml-1 text-red-500">✕</span>}
                                                    {isCurrentlyPlaying && <span className="ml-1 text-green-500 animate-bounce">♪</span>}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatTime(track.startTime)}-{formatTime(track.endTime)}
                                                    {audioState?.duration && <span className="ml-1">({audioState.duration.toFixed(1)}s)</span>}
                                                </p>
                                            </div>

                                            <div className="flex items-center space-x-1">
                                                <Button
                                                    variant={track.soloed ? "default" : "ghost"}
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        toggleSolo(trackId)
                                                    }}
                                                    className={`h-6 w-6 p-0 transition-all duration-200 hover:scale-110 ${track.soloed ? "bg-yellow-500 hover:bg-yellow-600 shadow-lg" : ""
                                                        }`}
                                                    disabled={!audioState?.canPlay}
                                                    title={track.soloed ? "Unsolo track" : "Solo track"}
                                                >
                                                    <Headphones className="w-3 h-3" />
                                                </Button>

                                                <Button
                                                    variant={track.muted ? "destructive" : "ghost"}
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        toggleMute(trackId)
                                                    }}
                                                    className="h-6 w-6 p-0 transition-all duration-200 hover:scale-110"
                                                    disabled={!audioState?.canPlay}
                                                    title={track.muted ? "Unmute track" : "Mute track"}
                                                >
                                                    {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                                                </Button>

                                                <Slider
                                                    value={[track.volume]}
                                                    onValueChange={(value) => updateTrackVolume(trackId, value[0] ?? 0)}
                                                    max={1}
                                                    step={0.01}
                                                    className="w-12 transition-all duration-200"
                                                    disabled={!audioState?.canPlay}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Main Player */}
                <Card className="border shadow-2xl rounded-2xl overflow-hidden w-full">
                    <div className="p-4">
                        {/* Song Info & Close Button */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Music className="w-5 h-5 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-sm truncate">{currentSong.title}</h3>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {currentSong.artist}
                                        {isGlobalLoading && <span className="ml-2">• Loading...</span>}
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={handleClose} className="flex-shrink-0">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Waveform */}
                        <div className="mb-3">
                            <Waveform
                                duration={duration}
                                currentTime={currentTime}
                                height={32}
                                color="#8B5CF6"
                                backgroundColor="#E5E7EB"
                                progressColor="#10B981"
                                onSeek={handleSeek}
                                isPlaying={isPlaying && !isGlobalLoading}
                                className="rounded-md"
                            />
                        </div>

                        {/* Time Display */}
                        <div className="flex justify-between text-xs text-muted-foreground mb-3">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-between">
                            {/* Playback Controls */}
                            <div className="flex items-center space-x-1">
                                <Button variant="ghost" size="sm" onClick={skipBackward} disabled={isGlobalLoading}>
                                    <SkipBack className="w-4 h-4" />
                                </Button>
                                <Button
                                    onClick={togglePlayPause}
                                    size="sm"
                                    className="w-10 h-10 rounded-full"
                                    disabled={isGlobalLoading}
                                >
                                    {isGlobalLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : isPlaying ? (
                                        <Pause className="w-4 h-4" />
                                    ) : (
                                        <Play className="w-4 h-4" />
                                    )}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={skipForward} disabled={isGlobalLoading}>
                                    <SkipForward className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Active Tracks Indicator - Only in stem mode */}
                            <div className="flex items-center space-x-2">
                                {!isMainSongMode && activeTracks.length > 0 && !isGlobalLoading && (
                                    <div className="flex items-center space-x-1">
                                        <div className="flex space-x-1">
                                            {activeTracks.slice(0, 3).map((track) => (
                                                <div
                                                    key={track.id}
                                                    className="w-2 h-2 rounded-full animate-pulse"
                                                    style={{ backgroundColor: track.color }}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {activePlayingCount} playing
                                            {trackStates.some((t) => t.soloed) && " (solo)"}
                                        </span>
                                    </div>
                                )}
                                {/* {isMainSongMode && <span className="text-xs text-muted-foreground">Main Song</span>} */}
                            </div>

                            {/* Volume & Track Controls */}
                            <div className="flex items-center space-x-1">
                                <div className="relative">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onMouseEnter={() => setShowVolumeSlider(true)}
                                        onMouseLeave={() => {
                                            setTimeout(() => setShowVolumeSlider(false), 150)
                                        }}
                                    >
                                        <Volume2 className="w-4 h-4" />
                                    </Button>
                                    <div
                                        className={`absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg p-2 shadow-lg w-24 transition-all duration-200 ${showVolumeSlider
                                            ? "opacity-100 translate-y-0 pointer-events-auto"
                                            : "opacity-0 translate-y-2 pointer-events-none"
                                            }`}
                                        onMouseEnter={() => setShowVolumeSlider(true)}
                                        onMouseLeave={() => setShowVolumeSlider(false)}
                                    >
                                        <Slider
                                            value={[masterVolume]}
                                            onValueChange={(value) => setMasterVolume(value[0] ?? 1)}
                                            max={1}
                                            step={0.01}
                                            className="w-full"
                                        />
                                        <div className="text-xs text-center mt-1 text-muted-foreground">
                                            {Math.round(masterVolume * 100)}%
                                        </div>
                                    </div>
                                </div>

                                {!isMainSongMode && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowTracks(!showTracks)}
                                        disabled={isGlobalLoading}
                                        className="transition-transform duration-200 hover:scale-105"
                                    >
                                        <div className={`transition-transform duration-300 ${showTracks ? "rotate-180" : ""}`}>
                                            <ChevronUp className="w-4 h-4" />
                                        </div>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}

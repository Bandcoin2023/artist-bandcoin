"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import {
    ChevronLeft,
    ChevronRight,
    Play,
    Pause,
    Volume2,
    VolumeX,
    Maximize,
    Minimize,
    Music,
    Film,
    ImageIcon,
    X,
    FastForward,
    Rewind,
    Minimize2,
} from "lucide-react"
import { cn } from "~/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import type { MediaType } from "@prisma/client"
import { MiniPlayerProvider, useMiniPlayer } from "~/components/player/mini-player-provider"

interface MediaItem {
    id: number
    url: string
    type: MediaType
    title?: string | null
    artist?: string | null
    thumbnail?: string | null
}

interface MediaGalleryProps {
    media: MediaItem[]
    initialIndex?: number
    autoPlay?: boolean
    onClose?: () => void
    /** When true, the gallery fills its parent container height instead of using a fixed height */
    fillHeight?: boolean
}

export default function MediaGallery(props: MediaGalleryProps) {
    return (
        <MiniPlayerProvider>
            <MediaGalleryContent {...props} />
        </MiniPlayerProvider>
    )
}

function MediaGalleryContent({ media, initialIndex = 0, autoPlay = false, onClose, fillHeight = false }: MediaGalleryProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [isMuted, setIsMuted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [showControls, setShowControls] = useState(false)
    const [volume, setVolume] = useState(1)
    const [isHovering, setIsHovering] = useState(false)
    const [showKeyboardHint, setShowKeyboardHint] = useState(false)

    const { showMiniPlayer, isMiniPlayerActive } = useMiniPlayer()

    const playerRef = useRef<HTMLDivElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const audioRef = useRef<HTMLAudioElement>(null)
    const progressBarRef = useRef<HTMLDivElement>(null)
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const keyboardHintTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const currentMedia = media[currentIndex]

    // ── Reset on track change ─────────────────────────────────────────────────
    const resetPlayback = useCallback(() => {
        setIsPlaying(false)
        setProgress(0)
        setDuration(0)
    }, [])

    useEffect(() => { resetPlayback() }, [currentIndex, resetPlayback])

    // ── autoPlay ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!autoPlay || !currentMedia) return
        let mounted = true
        const el = currentMedia.type === "MUSIC" ? audioRef.current : videoRef.current
        if (!el) return
        void el.play().then(() => { if (mounted) setIsPlaying(true) }).catch(() => { if (mounted) setIsPlaying(false) })
        return () => { mounted = false }
    }, [autoPlay, currentIndex, currentMedia])

    // ── Controls visibility ───────────────────────────────────────────────────
    useEffect(() => {
        if (currentMedia?.type === "IMAGE") { setShowControls(false); return }
        setShowControls(true)
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
        if (isPlaying && !isHovering && !isFullscreen) {
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2500)
        }
        return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current) }
    }, [isHovering, isPlaying, currentMedia?.type, isFullscreen])

    // Always show controls in fullscreen
    useEffect(() => { if (isFullscreen) setShowControls(true) }, [isFullscreen])

    // ── Fullscreen listener ───────────────────────────────────────────────────
    useEffect(() => {
        const onChange = () => {
            const inFS = !!document.fullscreenElement
            setIsFullscreen(inFS)
            setShowControls(true)
            if (inFS) {
                setShowKeyboardHint(true)
                keyboardHintTimeoutRef.current = setTimeout(() => setShowKeyboardHint(false), 3500)
            }
        }
        document.addEventListener("fullscreenchange", onChange)
        return () => {
            document.removeEventListener("fullscreenchange", onChange)
            if (keyboardHintTimeoutRef.current) clearTimeout(keyboardHintTimeoutRef.current)
        }
    }, [])

    // ── Mouse move in fullscreen ──────────────────────────────────────────────
    const handleMouseMove = () => {
        if (!isFullscreen) return
        setShowControls(true)
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
        }
    }

    // ── Actions ───────────────────────────────────────────────────────────────
    const togglePlay = useCallback(() => {
        if (!currentMedia) return
        const next = !isPlaying
        setIsPlaying(next)
        const el = currentMedia.type === "MUSIC" ? audioRef.current : videoRef.current
        if (!el) return
        if (next) void el.play().catch(() => setIsPlaying(false))
        else el.pause()
    }, [currentMedia, isPlaying])

    const toggleMute = useCallback(() => {
        const next = !isMuted
        setIsMuted(next)
        if (audioRef.current) audioRef.current.muted = next
        if (videoRef.current) videoRef.current.muted = next
    }, [isMuted])

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = parseFloat(e.target.value)
        setVolume(v)
        setIsMuted(v === 0)
        if (audioRef.current) audioRef.current.volume = v
        if (videoRef.current) videoRef.current.volume = v
    }

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            playerRef.current?.requestFullscreen().catch(console.error)
        } else {
            document.exitFullscreen().catch(console.error)
        }
    }, [])

    const toggleMiniPlayer = () => {
        if (isFullscreen) document.exitFullscreen().catch(console.error)
        if (currentMedia && (currentMedia.type === "VIDEO" || currentMedia.type === "MUSIC")) {
            showMiniPlayer(currentMedia)
        }
    }

    const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
        const el = e.currentTarget
        if (el.duration) setProgress((el.currentTime / el.duration) * 100)
    }

    const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
        setDuration(e.currentTarget.duration)
    }

    const handleMediaEnded = () => {
        setIsPlaying(false)
        if (media.length > 1) setCurrentIndex(i => (i + 1) % media.length)
    }

    const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressBarRef.current) return
        const rect = progressBarRef.current.getBoundingClientRect()
        const newTime = ((e.clientX - rect.left) / rect.width) * duration
        if (currentMedia?.type === "MUSIC" && audioRef.current) audioRef.current.currentTime = newTime
        if (currentMedia?.type === "VIDEO" && videoRef.current) videoRef.current.currentTime = newTime
    }

    const seek = (delta: number) => {
        const el = currentMedia?.type === "MUSIC" ? audioRef.current : videoRef.current
        if (el) el.currentTime = Math.max(0, Math.min(el.currentTime + delta, el.duration))
    }

    const navigate = useCallback((dir: 1 | -1) => {
        if (media.length <= 1) return
        const el = currentMedia?.type === "MUSIC" ? audioRef.current : videoRef.current
        el?.pause()
        setCurrentIndex(i => (i + dir + media.length) % media.length)
    }, [currentMedia, media.length])

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!isFullscreen) return
            switch (e.key) {
                case "ArrowLeft": navigate(-1); break
                case "ArrowRight": navigate(1); break
                case " ": e.preventDefault(); togglePlay(); break
                case "Escape": document.exitFullscreen().catch(console.error); break
                case "f": toggleFullscreen(); break
                case "m": toggleMute(); break
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [isFullscreen, navigate, togglePlay, toggleFullscreen, toggleMute])

    // ── Helpers ───────────────────────────────────────────────────────────────
    const formatTime = (s: number) => {
        const m = Math.floor(s / 60)
        const sec = Math.floor(s % 60)
        return `${m}:${sec < 10 ? "0" : ""}${sec}`
    }

    const getMediaTypeIcon = (type: MediaType) => {
        switch (type) {
            case "IMAGE": return <ImageIcon className="h-3.5 w-3.5" />
            case "VIDEO": return <Film className="h-3.5 w-3.5" />
            case "MUSIC": return <Music className="h-3.5 w-3.5" />
            default: return <ImageIcon className="h-3.5 w-3.5" />
        }
    }

    const getThumb = (item: MediaItem) =>
        item.type === "IMAGE" ? item.url : item.thumbnail ?? null

    // ── Guards ────────────────────────────────────────────────────────────────
    if (!media || media.length === 0) return null
    if (isMiniPlayerActive) return null

    const isMediaPlayable = currentMedia?.type === "VIDEO" || currentMedia?.type === "MUSIC"
    const hasThumbnails = media.length > 1

    return (
        <div
            ref={playerRef}
            className={cn(
                "relative w-full  overflow-hidden rounded-xl  group select-none flex flex-col",
                fillHeight && "h-full rounded-none",
                isFullscreen && "fixed inset-0 z-50 rounded-none"
            )}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onMouseMove={handleMouseMove}
        >
            {/* ── Media viewport ───────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
                {currentMedia && (
                    <motion.div
                        key={currentMedia.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className={cn(
                            "relative w-full flex items-center justify-center overflow-hidden",
                            isFullscreen ? "flex-1 h-full"
                                : fillHeight ? "flex-1 min-h-0"
                                    : "h-[340px]",
                            isMediaPlayable && "cursor-pointer"
                        )}
                        onClick={() => { if (isMediaPlayable) togglePlay() }}
                    >
                        {/* IMAGE */}
                        {currentMedia.type === "IMAGE" && (
                            <img
                                src={currentMedia.url ?? "/images/action/logo.png"}
                                alt={currentMedia.title ?? "Image"}
                                className="w-full h-full object-contain"
                            />
                        )}

                        {/* VIDEO */}
                        {currentMedia.type === "VIDEO" && (
                            <video
                                ref={videoRef}
                                src={currentMedia.url}
                                className="w-full h-full object-contain"
                                playsInline
                                muted={isMuted}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onEnded={handleMediaEnded}
                            />
                        )}

                        {/* MUSIC */}
                        {currentMedia.type === "MUSIC" && (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-6">
                                <motion.div
                                    animate={{ rotate: isPlaying ? 360 : 0 }}
                                    transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                                    className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-white/10 shadow-2xl flex-shrink-0"
                                >
                                    <img
                                        src={currentMedia.thumbnail ?? "/images/logo.png"}
                                        alt={currentMedia.title ?? "Album Art"}
                                        className="w-full h-full object-cover"
                                    />
                                </motion.div>
                                <div className="text-center">
                                    <p className="text-white font-semibold text-sm">{currentMedia.title ?? "Unknown Track"}</p>
                                    <p className="text-gray-400 text-xs mt-0.5">{currentMedia.artist ?? "Unknown Artist"}</p>
                                </div>
                                <audio
                                    ref={audioRef}
                                    src={currentMedia.url}
                                    muted={isMuted}
                                    onTimeUpdate={handleTimeUpdate}
                                    onLoadedMetadata={handleLoadedMetadata}
                                    onEnded={handleMediaEnded}
                                    className="hidden"
                                />
                            </div>
                        )}

                        {/* ── Nav arrows ── */}
                        {media.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(-1) }}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(1) }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </>
                        )}

                        {/* ── Type badge (top-left) ── */}
                        <div className="absolute top-2.5 left-2.5 z-10">
                            <span className="flex items-center gap-1 text-white/80 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 text-[11px]">
                                {getMediaTypeIcon(currentMedia.type)}
                                <span>{currentMedia.type.charAt(0) + currentMedia.type.slice(1).toLowerCase()}</span>
                            </span>
                        </div>

                        {/* ── Counter (top-right) ── */}
                        {media.length > 1 && (
                            <div className="absolute top-2.5 right-2.5 z-10">
                                <span className="text-white/80 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 text-[11px] tabular-nums">
                                    {currentIndex + 1} / {media.length}
                                </span>
                            </div>
                        )}

                        {/* ── Dot indicators (bottom of viewport, above controls) ── */}
                        {media.length > 1 && (
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                                {media.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(i) }}
                                        className={cn(
                                            "rounded-full transition-all duration-200",
                                            i === currentIndex
                                                ? "w-4 h-1.5 bg-white"
                                                : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"
                                        )}
                                    />
                                ))}
                            </div>
                        )}

                        {/* ── Fullscreen close button ── */}
                        {isFullscreen && onClose && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onClose() }}
                                className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}

                        {/* ── Keyboard hint (fullscreen only) ── */}
                        {isFullscreen && showKeyboardHint && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/55 text-white/90 text-xs px-3 py-1.5 rounded-full pointer-events-none backdrop-blur-sm whitespace-nowrap"
                            >
                                ← → navigate &nbsp;·&nbsp; Space play/pause &nbsp;·&nbsp; F fullscreen &nbsp;·&nbsp; M mute
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Big play button overlay (paused video/audio) ──────────────── */}
            {isMediaPlayable && !isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center shadow-xl">
                        <Play className="h-5 w-5 text-white ml-0.5" />
                    </div>
                </div>
            )}

            {/* ── Playback controls bar ─────────────────────────────────────── */}
            {isMediaPlayable && (
                <AnimatePresence>
                    {(showControls || !isPlaying) && (
                        <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.15 }}
                            className={cn(
                                "absolute left-0 right-0 z-20 px-3 pb-2 pt-6 bg-gradient-to-t from-black/85 to-transparent",
                                !isFullscreen && hasThumbnails ? "bottom-14" : "bottom-0"
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Progress bar */}
                            <div
                                ref={progressBarRef}
                                className="w-full h-1 bg-white/20 rounded-full mb-2.5 cursor-pointer group/prog"
                                onClick={handleProgressBarClick}
                            >
                                <div
                                    className="h-full bg-white rounded-full relative group-hover/prog:bg-red-400 transition-colors duration-150"
                                    style={{ width: `${progress}%` }}
                                >
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow opacity-0 group-hover/prog:opacity-100 transition-opacity translate-x-1/2" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                {/* Left: play · rewind · forward · time */}
                                <div className="flex items-center gap-1">
                                    <button onClick={togglePlay} className="w-7 h-7 flex items-center justify-center text-white hover:text-gray-200 transition-colors">
                                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    </button>
                                    <button onClick={() => seek(-10)} title="Rewind 10s" className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                                        <Rewind className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => seek(10)} title="Forward 10s" className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                                        <FastForward className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="text-white/60 text-[11px] tabular-nums ml-1">
                                        {formatTime((progress / 100) * duration)}
                                        <span className="mx-1 text-white/25">/</span>
                                        {formatTime(duration)}
                                    </span>
                                </div>

                                {/* Right: volume · mini · fullscreen */}
                                <div className="flex items-center gap-1">
                                    {/* Volume: icon always visible, slider expands on hover */}
                                    <div className="flex items-center gap-1 group/vol">
                                        <button onClick={toggleMute} className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                                            {isMuted || volume === 0
                                                ? <VolumeX className="h-3.5 w-3.5" />
                                                : <Volume2 className="h-3.5 w-3.5" />
                                            }
                                        </button>
                                        <div className="w-0 overflow-hidden group-hover/vol:w-16 transition-all duration-200">
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.01"
                                                value={isMuted ? 0 : volume}
                                                onChange={handleVolumeChange}
                                                className="w-16 accent-white cursor-pointer"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>

                                    <button onClick={toggleMiniPlayer} title="Mini Player" className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                                        <Minimize2 className="h-3.5 w-3.5" />
                                    </button>

                                    <button onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"} className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                                        {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {/* ── Thumbnail strip (non-fullscreen, 2+ items) ───────────────── */}
            {!isFullscreen && hasThumbnails && (
                <div className="flex overflow-x-auto bg-gray-950 h-14 items-center gap-1.5 px-2 flex-shrink-0 scrollbar-none">
                    {media.map((item, index) => {
                        const thumb = getThumb(item)
                        return (
                            <button
                                key={item.id}
                                onClick={() => setCurrentIndex(index)}
                                className={cn(
                                    "flex-shrink-0 w-[52px] h-10 rounded-md overflow-hidden border-2 transition-all duration-150 flex items-center justify-center bg-gray-800",
                                    index === currentIndex
                                        ? "border-white scale-105 shadow-lg"
                                        : "border-transparent opacity-50 hover:opacity-80 hover:border-white/40"
                                )}
                            >
                                {thumb ? (
                                    <img
                                        src={thumb}
                                        alt={item.title ?? `Media ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="text-gray-400 flex items-center justify-center">
                                        {getMediaTypeIcon(item.type)}
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
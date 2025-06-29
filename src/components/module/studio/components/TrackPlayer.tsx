"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "~/components/shadcn/ui/button"
import { Slider } from "~/components/shadcn/ui/slider"
import { Play, Pause, Square, Volume2, VolumeX } from "lucide-react"
import { AudioPlayer } from "../lib/audio-player"

interface TrackPlayerProps {
  audioBlob?: Blob
  audioChunks?: ArrayBuffer[]
  title: string
  className?: string
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function TrackPlayer({ audioBlob, audioChunks, title, className = "" }: TrackPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const playerRef = useRef<AudioPlayer | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const initializePlayer = async () => {
      if (!audioBlob && (!audioChunks || audioChunks.length === 0)) return

      setIsLoading(true)
      try {
        const player = new AudioPlayer()

        if (audioBlob) {
          await player.loadFromBlob(audioBlob)
        } else if (audioChunks) {
          await player.loadFromArrayBuffers(audioChunks)
        }

        playerRef.current = player
        setDuration(player.getDuration())
        player.setVolume(isMuted ? 0 : volume)
      } catch (error) {
        console.error("Failed to initialize audio player:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initializePlayer()

    return () => {
      if (playerRef.current) {
        playerRef.current.stop()
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [audioBlob, audioChunks])

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setVolume(isMuted ? 0 : volume)
    }
  }, [volume, isMuted])

  const startTimeUpdate = () => {
    intervalRef.current = setInterval(() => {
      if (playerRef.current) {
        setCurrentTime(playerRef.current.getCurrentTime())

        // Auto-stop when finished
        if (!playerRef.current.playing && !playerRef.current.paused && isPlaying) {
          setIsPlaying(false)
          setIsPaused(false)
          setCurrentTime(0)
        }
      }
    }, 100)
  }

  const stopTimeUpdate = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const handlePlay = () => {
    if (!playerRef.current || isLoading) return

    playerRef.current.play()
    setIsPlaying(true)
    setIsPaused(false)
    startTimeUpdate()
  }

  const handlePause = () => {
    if (!playerRef.current) return

    playerRef.current.pause()
    setIsPlaying(false)
    setIsPaused(true)
    stopTimeUpdate()
  }

  const handleStop = () => {
    if (!playerRef.current) return

    playerRef.current.stop()
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentTime(0)
    stopTimeUpdate()
  }

  const handleSeek = (newTime: number[]) => {
    if (!playerRef.current) return

    const targetTime = newTime[0] ?? 0
    playerRef.current.seekTo(targetTime)
    setCurrentTime(targetTime)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-gray-400">Loading audio...</span>
      </div>
    )
  }

  if (!audioBlob && (!audioChunks || audioChunks.length === 0)) {
    return <div className={`text-sm text-gray-500 ${className}`}>No audio data available</div>
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Controls */}
      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={isPlaying ? handlePause : handlePlay}
          className="hover:bg-gray-700"
          disabled={duration === 0}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleStop}
          className="hover:bg-gray-700"
          disabled={!isPlaying && !isPaused}
        >
          <Square className="w-4 h-4" />
        </Button>

        <div className="flex items-center space-x-2 flex-1">
          <span className="text-xs text-gray-400 w-10">{formatTime(currentTime)}</span>
          <Slider
            value={[currentTime]}
            onValueChange={handleSeek}
            max={duration}
            min={0}
            step={0.1}
            className="flex-1"
            disabled={duration === 0}
          />
          <span className="text-xs text-gray-400 w-10">{formatTime(duration)}</span>
        </div>

        <Button size="sm" variant="ghost" onClick={toggleMute} className="hover:bg-gray-700">
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>

        <div className="w-20">
          <Slider
            value={[isMuted ? 0 : volume]}
            onValueChange={([newVolume]) => {
              if (typeof newVolume === "number") {
                setVolume(newVolume)
                if (newVolume > 0) setIsMuted(false)
              }
            }}
            max={1}
            min={0}
            step={0.1}
            className="w-full"
          />
        </div>
      </div>

      {/* Progress indicator */}
      {isPlaying && (
        <div className="text-xs text-emerald-400 flex items-center space-x-1">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          <span>Playing: {title}</span>
        </div>
      )}
    </div>
  )
}

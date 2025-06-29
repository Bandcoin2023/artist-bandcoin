"use client"

import type React from "react"
import { Play, Pause, Square, Volume2, ZoomIn, ZoomOut, Grid3X3, Download, Moon, Sun, Repeat, Save } from "lucide-react"
import type { PlaybackState } from "../types/audio"
import { useLyriaStatus } from "../hooks/use-lyria-status"
import { Button } from "~/components/shadcn/ui/button"

interface ControlsProps {
  playbackState: PlaybackState
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onSeek: (time: number) => void
  onToggleLoop: () => void
  masterVolume: number
  onMasterVolumeChange: (volume: number) => void
  pixelsPerSecond: number
  onZoomChange: (zoom: number) => void
  snapToGrid: boolean
  onSnapToggle: () => void
  onExport: () => void
  isDark: boolean
  onToggleDarkMode: () => void
}

export const Controls: React.FC<ControlsProps> = ({
  playbackState,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onToggleLoop,
  masterVolume,
  onMasterVolumeChange,
  pixelsPerSecond,
  onZoomChange,
  snapToGrid,
  onSnapToggle,
  onExport,
  isDark,
  onToggleDarkMode,
}) => {
  const { lyriaStatus } = useLyriaStatus()
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`
  }

  const handleSave = () => {
    // Placeholder for save functionality
    const projectData = {
      timestamp: new Date().toISOString(),
      tracks: [], // Would include actual track data
    }
    localStorage.setItem("music-studio-project", JSON.stringify(projectData))
    alert("Project saved locally!")
  }

  return (
    <div
      className={`h-20 px-6 flex items-center justify-between border-t ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        } shadow-lg`}
    >
      {/* Left: Transport Controls */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <Button
            variant="destructive"
            onClick={onStop}
            disabled={lyriaStatus === "Playing"}

            title="Stop"
          >
            <Square className="w-5 h-5" />
          </Button>

          <Button
            disabled={lyriaStatus === "Playing"}
            onClick={playbackState.isPlaying ? onPause : onPlay}
            title={playbackState.isPlaying ? "Pause" : "Play"}
          >
            {playbackState.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </Button>

          <Button
            onClick={onToggleLoop}
            disabled={lyriaStatus === "Playing"}
            variant="accent"

            title={playbackState.loop ? "Disable loop" : "Enable loop"}
          >
            <Repeat className="w-5 h-5" />
          </Button>
        </div>

        <div
          className={`text-sm font-mono px-3 py-2 rounded-lg ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
            }`}
        >
          <div className="flex items-center space-x-2">
            <span className="text-green-400">{formatTime(playbackState.currentTime)}</span>
            <span className={isDark ? "text-gray-500" : "text-gray-400"}>/</span>
            <span>{formatTime(playbackState.duration)}</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className={isDark ? "text-gray-400" : "text-gray-500"}>
              -{formatTime(playbackState.duration - playbackState.currentTime)}
            </span>
            <span className={isDark ? "text-gray-400" : "text-gray-500"}>{playbackState.bpm} BPM</span>
          </div>
        </div>
      </div>

      {/* Center: Timeline Scrubber */}
      <div className="flex-1 mx-8">
        <div className="relative">
          <input
            type="range"
            min="0"
            max={playbackState.duration || 100}
            step="0.01"
            value={playbackState.currentTime}
            onChange={(e) => onSeek(Number.parseFloat(e.target.value))}
            className="w-full  bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div
            className="absolute top-1 left-0 h-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg pointer-events-none"
            style={{
              width: `${(playbackState.currentTime / (playbackState.duration || 1)) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center space-x-4">
        {/* Master Volume */}
        <div className="flex items-center space-x-2">
          <Volume2 className={`w-4 h-4 ${isDark ? "text-gray-300" : "text-gray-600"}`} />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={masterVolume}
            onChange={(e) => onMasterVolumeChange(Number.parseFloat(e.target.value))}
            className="w-20 h-2"
            title={`Master Volume: ${Math.round(masterVolume * 100)}%`}
          />
          <span className={`text-xs w-8 text-right ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {Math.round(masterVolume * 100)}
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => onZoomChange(Math.max(10, pixelsPerSecond - 10))}
            className={`p-2 rounded-md transition-colors ${isDark
              ? "text-gray-300 hover:text-white hover:bg-gray-600"
              : "text-gray-600 hover:text-gray-900 hover:bg-white"
              }`}
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span
            className={`text-xs px-3 py-1 rounded ${isDark ? "bg-gray-600 text-gray-300" : "bg-white text-gray-600"}`}
          >
            {pixelsPerSecond}px/s
          </span>

          <button
            onClick={() => onZoomChange(Math.min(200, pixelsPerSecond + 10))}
            className={`p-2 rounded-md transition-colors ${isDark
              ? "text-gray-300 hover:text-white hover:bg-gray-600"
              : "text-gray-600 hover:text-gray-900 hover:bg-white"
              }`}
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Snap to Grid */}

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSave}
            className={`p-2 rounded-lg transition-colors ${isDark
              ? "text-gray-300 hover:text-white hover:bg-gray-700"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            title="Save project"
          >
            <Save className="w-4 h-4" />
          </button>

          <button
            onClick={onExport}
            className={`p-2 rounded-lg transition-colors ${isDark
              ? "text-gray-300 hover:text-white hover:bg-gray-700"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            title="Export audio"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded-lg transition-colors ${isDark
              ? "text-gray-300 hover:text-white hover:bg-gray-700"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div >
  )
}

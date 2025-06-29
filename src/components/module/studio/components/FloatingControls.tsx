"use client"

import type React from "react"
import {
  Play,
  Pause,
  Square,
  Volume2,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Download,
  Moon,
  Sun,
  Repeat,
  Save,
  SkipBack,
  SkipForward,
} from "lucide-react"
import type { PlaybackState } from "../types/audio"

interface FloatingControlsProps {
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
  layout: "standard" | "compact" | "focus"
}

export const FloatingControls: React.FC<FloatingControlsProps> = ({
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
  layout,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`
  }

  const handleSave = () => {
    const projectData = {
      timestamp: new Date().toISOString(),
      tracks: [],
    }
    localStorage.setItem("music-studio-project", JSON.stringify(projectData))
    alert("Project saved locally!")
  }

  if (layout === "focus") {
    return (
      <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50`}>
        <div
          className={`flex items-center space-x-3 px-6 py-3 rounded-2xl backdrop-blur-xl border shadow-2xl ${isDark ? "bg-gray-900/90 border-gray-700" : "bg-white/90 border-gray-200"
            }`}
        >
          <button
            onClick={onStop}
            className={`p-2 rounded-xl transition-colors ${isDark
                ? "text-gray-300 hover:text-white hover:bg-gray-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
          >
            <Square className="w-5 h-5" />
          </button>

          <button
            onClick={playbackState.isPlaying ? onPause : onPlay}
            className="p-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {playbackState.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>

          <button
            onClick={onToggleLoop}
            className={`p-2 rounded-xl transition-colors ${playbackState.loop
                ? "bg-violet-500 text-white shadow-md"
                : isDark
                  ? "text-gray-300 hover:text-white hover:bg-gray-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
          >
            <Repeat className="w-5 h-5" />
          </button>

          <div
            className={`text-sm font-mono px-3 py-2 rounded-xl ${isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"}`}
          >
            {formatTime(playbackState.currentTime)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`h-20 px-6 flex items-center justify-between border-t backdrop-blur-xl ${isDark ? "bg-gray-900/80 border-gray-800" : "bg-white/80 border-gray-200"
        } shadow-lg`}
    >
      {/* Left: Transport Controls */}
      <div className="flex items-center space-x-4">
        <div className={`flex items-center space-x-1 rounded-2xl p-1 ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
          <button
            onClick={() => onSeek(0)}
            className={`p-2 rounded-xl transition-colors ${isDark
                ? "text-gray-300 hover:text-white hover:bg-gray-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-white"
              }`}
            title="Go to start"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={onStop}
            className={`p-2 rounded-xl transition-colors ${isDark
                ? "text-gray-300 hover:text-white hover:bg-gray-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-white"
              }`}
            title="Stop"
          >
            <Square className="w-5 h-5" />
          </button>

          <button
            onClick={playbackState.isPlaying ? onPause : onPlay}
            className="p-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            title={playbackState.isPlaying ? "Pause" : "Play"}
          >
            {playbackState.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>

          <button
            onClick={() => onSeek(playbackState.duration)}
            className={`p-2 rounded-xl transition-colors ${isDark
                ? "text-gray-300 hover:text-white hover:bg-gray-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-white"
              }`}
            title="Go to end"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            onClick={onToggleLoop}
            className={`p-2 rounded-xl transition-colors ${playbackState.loop
                ? "bg-violet-500 text-white shadow-md"
                : isDark
                  ? "text-gray-300 hover:text-white hover:bg-gray-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white"
              }`}
            title={playbackState.loop ? "Disable loop" : "Enable loop"}
          >
            <Repeat className="w-5 h-5" />
          </button>
        </div>

        <div
          className={`text-sm font-mono px-4 py-3 rounded-2xl ${isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"}`}
        >
          <div className="flex items-center space-x-3">
            <span className="text-violet-400 font-semibold">{formatTime(playbackState.currentTime)}</span>
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
            className={`w-full h-3 rounded-full appearance-none cursor-pointer ${isDark ? "bg-gray-700" : "bg-gray-200"
              }`}
          />
          <div
            className="absolute top-1 left-0 h-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full pointer-events-none"
            style={{
              width: `${(playbackState.currentTime / (playbackState.duration || 1)) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center space-x-4">
        {/* Master Volume */}
        <div className="flex items-center space-x-3">
          <Volume2 className={`w-5 h-5 ${isDark ? "text-gray-300" : "text-gray-600"}`} />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={masterVolume}
            onChange={(e) => onMasterVolumeChange(Number.parseFloat(e.target.value))}
            className="w-24 h-2"
            title={`Master Volume: ${Math.round(masterVolume * 100)}%`}
          />
          <span className={`text-xs w-10 text-right ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {Math.round(masterVolume * 100)}%
          </span>
        </div>

        {/* Zoom Controls */}
        <div className={`flex items-center space-x-1 rounded-2xl p-1 ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
          <button
            onClick={() => onZoomChange(Math.max(10, pixelsPerSecond - 10))}
            className={`p-2 rounded-xl transition-colors ${isDark
                ? "text-gray-300 hover:text-white hover:bg-gray-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-white"
              }`}
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span
            className={`text-xs px-3 py-1 rounded-xl ${isDark ? "bg-gray-700 text-gray-300" : "bg-white text-gray-600"}`}
          >
            {pixelsPerSecond}px/s
          </span>

          <button
            onClick={() => onZoomChange(Math.min(200, pixelsPerSecond + 10))}
            className={`p-2 rounded-xl transition-colors ${isDark
                ? "text-gray-300 hover:text-white hover:bg-gray-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-white"
              }`}
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Snap to Grid */}
        <button
          onClick={onSnapToggle}
          className={`p-2 rounded-2xl transition-all duration-200 ${snapToGrid
              ? "bg-violet-500 text-white shadow-md"
              : isDark
                ? "text-gray-300 hover:text-white hover:bg-gray-800"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          title={snapToGrid ? "Disable snap to grid" : "Enable snap to grid"}
        >
          <Grid3X3 className="w-4 h-4" />
        </button>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSave}
            className={`p-2 rounded-2xl transition-colors ${isDark
                ? "text-gray-300 hover:text-white hover:bg-gray-800"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            title="Save project"
          >
            <Save className="w-4 h-4" />
          </button>

          <button
            onClick={onExport}
            className={`p-2 rounded-2xl transition-colors ${isDark
                ? "text-gray-300 hover:text-white hover:bg-gray-800"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            title="Export audio"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded-2xl transition-colors ${isDark
                ? "text-gray-300 hover:text-white hover:bg-gray-800"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

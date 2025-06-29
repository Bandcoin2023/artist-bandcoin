"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import { Copy, Scissors, Trash2, Move } from "lucide-react"
import type { Track as TrackType, AudioFile } from "../types/audio"
import { Waveform } from "./Waveform"

interface TrackProps {
  track: TrackType
  audioFile: AudioFile
  pixelsPerSecond: number
  onUpdate: (updates: Partial<TrackType>) => void
  onDelete: () => void
  onDuplicate: () => void
  onSplit: (time: number) => void
  onSelect: (selected: boolean) => void
  snapToGrid: boolean
  isDark: boolean
  isSelected: boolean
  splitMode: boolean
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export const Track: React.FC<TrackProps> = ({
  track,
  audioFile,
  pixelsPerSecond,
  onUpdate,
  onDelete,
  onDuplicate,
  onSplit,
  onSelect,
  snapToGrid,
  isDark,
  isSelected,
  splitMode,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  const trackWidth = (track.endTime - track.startTime) * pixelsPerSecond
  const trackLeft = track.startTime * pixelsPerSecond

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, action: "drag" | "resize-start" | "resize-end") => {
      e.preventDefault()
      e.stopPropagation()

      if (!isSelected) {
        onSelect(true)
      }

      const startMouseX = e.clientX
      const startMouseY = e.clientY
      const startTime = track.startTime
      const startTrackIndex = track.trackIndex
      const duration = track.endTime - track.startTime

      if (action === "drag") {
        setIsDragging(true)
      }

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startMouseX
        const deltaY = e.clientY - startMouseY

        if (action === "drag") {
          // Calculate new time
          const deltaTime = deltaX / pixelsPerSecond
          let newStartTime = Math.max(0, startTime + deltaTime)

          if (snapToGrid) {
            newStartTime = Math.round(newStartTime * 4) / 4
          }

          // Calculate new lane
          const laneHeight = 100
          let newTrackIndex = startTrackIndex
          if (Math.abs(deltaY) > 50) {
            // 50px threshold
            const laneChange = Math.round(deltaY / laneHeight)
            newTrackIndex = Math.max(0, startTrackIndex + laneChange)
          }

          // Update track position directly
          onUpdate({
            startTime: newStartTime,
            endTime: newStartTime + duration,
            trackIndex: newTrackIndex,
          })
        } else if (action === "resize-start") {
          const deltaTime = deltaX / pixelsPerSecond
          let newStartTime = Math.max(0, startTime + deltaTime)
          const maxStartTime = track.endTime - 0.1
          newStartTime = Math.min(newStartTime, maxStartTime)

          if (snapToGrid) {
            newStartTime = Math.round(newStartTime * 4) / 4
          }

          const startTimeDelta = newStartTime - track.startTime
          if (newStartTime >= 0 && newStartTime < track.endTime - 0.1) {
            onUpdate({
              startTime: newStartTime,
              trimStart: Math.max(0, track.trimStart + startTimeDelta),
            })
          }
        } else if (action === "resize-end") {
          const deltaTime = deltaX / pixelsPerSecond
          let newEndTime = Math.max(track.startTime + 0.1, track.endTime + deltaTime)

          if (snapToGrid) {
            newEndTime = Math.round(newEndTime * 4) / 4
          }

          const maxPossibleEndTime = track.startTime + (audioFile.duration - track.trimStart)
          newEndTime = Math.min(newEndTime, maxPossibleEndTime)

          if (newEndTime > track.startTime + 0.1) {
            onUpdate({
              endTime: newEndTime,
              trimEnd: track.trimStart + (newEndTime - track.startTime),
            })
          }
        }
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [track, pixelsPerSecond, snapToGrid, onUpdate, audioFile.duration, isSelected, onSelect],
  )

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()

      if (splitMode && trackRef.current) {
        const rect = trackRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const relativeTime = x / pixelsPerSecond
        const absoluteTime = track.startTime + relativeTime

        if (absoluteTime > track.startTime + 0.1 && absoluteTime < track.endTime - 0.1) {
          onSplit(absoluteTime)
        }
      } else {
        onSelect(!isSelected)
      }
    },
    [splitMode, pixelsPerSecond, track.startTime, track.endTime, onSplit, onSelect, isSelected],
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onDelete()
    },
    [onDelete],
  )

  const handleDuplicate = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onDuplicate()
    },
    [onDuplicate],
  )

  const handleSplitClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const rect = trackRef.current!.getBoundingClientRect()
      const x = rect.width / 2
      const relativeTime = x / pixelsPerSecond
      const absoluteTime = track.startTime + relativeTime
      onSplit(absoluteTime)
    },
    [track.startTime, pixelsPerSecond, onSplit],
  )

  const showControls = isSelected || isHovered

  return (
    <div
      ref={trackRef}
      className={`absolute h-20 mt-2 rounded-lg border-2 select-none ${isSelected
        ? "border-purple-500 shadow-lg shadow-purple-500/20 z-10"
        : isDark
          ? "border-gray-600 hover:border-gray-500"
          : "border-gray-300 hover:border-gray-400"
        } ${isDragging ? "cursor-grabbing z-30 shadow-2xl" : splitMode ? "cursor-crosshair" : "cursor-grab hover:shadow-md"
        } overflow-hidden group transition-shadow duration-150`}
      style={{
        left: `${trackLeft}px`,
        width: `${trackWidth}px`,
        top: "2px",
        background: track.color ? `linear-gradient(135deg, ${track.color}20, ${track.color}10)` : undefined,
        borderColor: isSelected ? "#8B5CF6" : track.color,
      }}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement
        if (!target.closest("button") && !target.closest(".resize-handle")) {
          handleMouseDown(e, "drag")
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleTrackClick}
    >
      {/* Waveform */}
      <div className="w-full h-full pointer-events-none">
        <Waveform
          audioFile={audioFile}
          width={trackWidth}
          height={76}
          startTime={track.trimStart}
          endTime={track.trimEnd}
          color={track.color}
          isDark={isDark}
        />
      </div>

      {/* Track Info */}
      <div className="absolute top-1 left-2 right-2 flex justify-between items-start pointer-events-none">
        <div
          className={`text-xs font-medium px-2 py-1 rounded max-w-[60%] truncate ${isDark ? "bg-black/50 text-white" : "bg-white/80 text-gray-900"
            } backdrop-blur-sm`}
        >
          {track.name}
        </div>

        {(track.muted || track.soloed) && (
          <div className="flex space-x-1">
            {track.muted && <div className="bg-red-500 text-white text-xs px-1 py-0.5 rounded">M</div>}
            {track.soloed && <div className="bg-yellow-500 text-white text-xs px-1 py-0.5 rounded">S</div>}
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && !isDragging && (
        <div className="absolute bottom-1 right-1 flex space-x-1 pointer-events-auto z-40">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleDuplicate}
            className={`p-1.5 rounded text-xs transition-all duration-200 ${isDark
              ? "bg-gray-800/90 text-gray-300 hover:bg-gray-700/90"
              : "bg-white/90 text-gray-600 hover:bg-gray-100/90"
              } backdrop-blur-sm shadow-sm hover:scale-110`}
            title="Duplicate"
          >
            <Copy className="w-3 h-3" />
          </button>

          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleSplitClick}
            className={`p-1.5 rounded text-xs transition-all duration-200 ${isDark
              ? "bg-gray-800/90 text-gray-300 hover:bg-gray-700/90"
              : "bg-white/90 text-gray-600 hover:bg-gray-100/90"
              } backdrop-blur-sm shadow-sm hover:scale-110`}
            title="Split"
          >
            <Scissors className="w-3 h-3" />
          </button>

          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleDelete}
            className="p-1.5 rounded text-xs bg-red-500/90 text-white hover:bg-red-600/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:scale-110"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Small track controls */}
      {showControls && !isDragging && trackWidth < 120 && (
        <div
          className={`absolute -top-8 right-0 flex space-x-1 pointer-events-auto z-50 rounded px-2 py-1 ${isDark ? "bg-gray-900/95" : "bg-white/95"
            } backdrop-blur-sm shadow-lg border ${isDark ? "border-gray-700" : "border-gray-200"}`}
        >
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleDuplicate}
            className="p-1 rounded text-xs"
            title="Duplicate"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleSplitClick}
            className="p-1 rounded text-xs"
            title="Split"
          >
            <Scissors className="w-3 h-3" />
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleDelete}
            className="p-1 rounded text-xs text-red-500"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Drag indicator */}
      {isDragging && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 pointer-events-none z-50">
          <div className="bg-purple-600/95 text-white px-3 py-2 rounded-lg shadow-xl text-xs font-medium">
            <div className="flex items-center space-x-2">
              <Move className="w-3 h-3" />
              <span>Lane {track.trackIndex + 1}</span>
            </div>
            <div className="text-xs opacity-75 mt-0.5">{formatTime(track.startTime)}</div>
          </div>
        </div>
      )}

      {/* Resize handles */}
      {!isDragging && (
        <>
          <div
            className="resize-handle absolute left-0 top-0 w-2 h-full cursor-ew-resize bg-transparent hover:bg-purple-500/30 transition-colors z-30"
            onMouseDown={(e) => handleMouseDown(e, "resize-start")}
            title="Trim start"
          />
          <div
            className="resize-handle absolute right-0 top-0 w-2 h-full cursor-ew-resize bg-transparent hover:bg-purple-500/30 transition-colors z-30"
            onMouseDown={(e) => handleMouseDown(e, "resize-end")}
            title="Trim end"
          />
        </>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-purple-500 rounded-lg pointer-events-none">
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-purple-500 rounded-full" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-purple-500 rounded-full" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-purple-500 rounded-full" />
        </div>
      )}
    </div>
  )
}

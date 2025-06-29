"use client"

import type React from "react"
import { useRef, useEffect, useState, useCallback } from "react"
import { Track as TrackComponent } from "./Track"
import type { Track, AudioFile } from "../types/audio"
import { Plus, Grid3X3, Volume2, VolumeX, Radio } from "lucide-react"
import { Button } from "~/components/shadcn/ui/button"

interface FlexibleTimelineProps {
  tracks: Track[]
  audioFiles: AudioFile[]
  currentTime: number
  duration: number
  onTrackUpdate: (trackId: string, updates: Partial<Track>) => void
  onTrackDelete: (trackId: string) => void
  onTrackDuplicate: (trackId: string) => void
  onTrackSplit: (trackId: string, time: number) => void
  onAddTrack: (audioFile: AudioFile, startTime: number) => void
  onSeek: (time: number) => void
  pixelsPerSecond: number
  snapToGrid: boolean
  isDark: boolean
  layout: "standard" | "compact" | "focus"
}

export const FlexibleTimeline: React.FC<FlexibleTimelineProps> = ({
  tracks,
  audioFiles,
  currentTime,
  duration,
  onTrackUpdate,
  onTrackDelete,
  onTrackDuplicate,
  onTrackSplit,
  onAddTrack,
  onSeek,
  pixelsPerSecond,
  snapToGrid,
  isDark,
  layout,
}) => {
  const tracksContainerRef = useRef<HTMLDivElement>(null)
  const timelineHeaderRef = useRef<HTMLDivElement>(null)
  const horizontalScrollRef = useRef<HTMLDivElement>(null)
  const verticalScrollRef = useRef<HTMLDivElement>(null)
  const [splitMode, setSplitMode] = useState(false)
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set())
  const [dragOverPosition, setDragOverPosition] = useState<{ x: number; y: number } | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`
  }, [])

  // Auto-scroll timeline to follow playhead
  useEffect(() => {
    if (!autoScroll || !horizontalScrollRef.current || isUserScrolling) return

    const container = horizontalScrollRef.current
    const playheadPosition = currentTime * pixelsPerSecond
    const containerWidth = container.clientWidth
    const scrollLeft = container.scrollLeft
    const scrollRight = scrollLeft + containerWidth

    const margin = 100
    const playheadScreenX = playheadPosition - scrollLeft

    if (playheadScreenX < margin || playheadScreenX > containerWidth - margin) {
      const targetScroll = playheadPosition - containerWidth / 2
      container.scrollLeft = Math.max(0, targetScroll)
    }
  }, [currentTime, pixelsPerSecond, autoScroll, isUserScrolling])

  const handleHorizontalScroll = useCallback(() => {
    setIsUserScrolling(true)

    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current)
    }

    userScrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false)
    }, 2000)

    if (timelineHeaderRef.current && horizontalScrollRef.current) {
      timelineHeaderRef.current.scrollLeft = horizontalScrollRef.current.scrollLeft
    }
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = "copy"

      if (tracksContainerRef.current && horizontalScrollRef.current) {
        const rect = tracksContainerRef.current.getBoundingClientRect()
        const scrollLeft = horizontalScrollRef.current.scrollLeft
        const x = e.clientX - rect.left + scrollLeft
        const y = e.clientY - rect.top

        const laneHeight = layout === "compact" ? 60 : 100
        const targetLane = Math.floor((y + laneHeight / 2) / laneHeight)
        const snappedY = targetLane * laneHeight + laneHeight / 2

        setDragOverPosition({ x: Math.max(0, x), y: snappedY })
      }
    },
    [layout],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverPosition(null)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOverPosition(null)

      if (!tracksContainerRef.current || !horizontalScrollRef.current) return

      const rect = tracksContainerRef.current.getBoundingClientRect()
      const scrollLeft = horizontalScrollRef.current.scrollLeft
      const x = e.clientX - rect.left + scrollLeft
      const y = e.clientY - rect.top
      const time = Math.max(0, x / pixelsPerSecond)

      const laneHeight = layout === "compact" ? 60 : 100
      const trackLane = Math.floor((y + laneHeight / 2) / laneHeight)

      const snappedTime = snapToGrid ? Math.round(time * 4) / 4 : time

      try {
        const audioFileData = e.dataTransfer.getData("application/x-audiofile")
        if (audioFileData) {
          const audioFileInfo = JSON.parse(audioFileData) as AudioFile
          const audioFile = audioFiles.find((f) => f.id === audioFileInfo.id)
          if (audioFile) {
            const conflictingTrack = tracks.find(
              (t) =>
                t.trackIndex === trackLane &&
                !(snappedTime >= t.endTime || snappedTime + audioFile.duration <= t.startTime),
            )

            let targetLane = trackLane
            if (conflictingTrack) {
              const usedLanes = new Set(tracks.map((t) => t.trackIndex))
              targetLane = 0
              while (usedLanes.has(targetLane)) {
                targetLane++
              }
            }

            onAddTrack(audioFile, snappedTime)

            setTimeout(() => {
              const newTrack = tracks.find(
                (t) => t.audioFileId === audioFile.id && Math.abs(t.startTime - snappedTime) < 0.01,
              )
              if (newTrack) {
                onTrackUpdate(newTrack.id, { trackIndex: targetLane })
              }
            }, 50)
          }
        }
      } catch (error) {
        console.warn("Failed to parse dragged audio file data:", error)
      }
    },
    [pixelsPerSecond, snapToGrid, onAddTrack, audioFiles, tracks, onTrackUpdate, layout],
  )

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (!timelineHeaderRef.current) return

      const rect = timelineHeaderRef.current.getBoundingClientRect()
      const scrollLeft = timelineHeaderRef.current.scrollLeft
      const x = e.clientX - rect.left + scrollLeft
      const time = Math.max(0, x / pixelsPerSecond)

      if (splitMode) {
        if (tracksContainerRef.current && verticalScrollRef.current) {
          const tracksRect = tracksContainerRef.current.getBoundingClientRect()
          const tracksY = e.clientY - tracksRect.top + verticalScrollRef.current.scrollTop
          const laneHeight = layout === "compact" ? 60 : 100
          const trackIndex = Math.floor(tracksY / laneHeight)

          const trackToSplit = tracks.find(
            (track) => track.trackIndex === trackIndex && time >= track.startTime && time <= track.endTime,
          )

          if (trackToSplit) {
            onTrackSplit(trackToSplit.id, time)
          }
        }
        setSplitMode(false)
      } else {
        onSeek(Math.max(0, Math.min(time, duration)))
      }
    },
    [pixelsPerSecond, duration, onSeek, splitMode, tracks, onTrackSplit, layout],
  )

  const handlePlayheadDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      setIsUserScrolling(true)

      const handleMouseMove = (e: MouseEvent) => {
        if (!timelineHeaderRef.current) return

        const rect = timelineHeaderRef.current.getBoundingClientRect()
        const scrollLeft = timelineHeaderRef.current.scrollLeft
        const x = e.clientX - rect.left + scrollLeft
        const time = Math.max(0, Math.min(x / pixelsPerSecond, duration))

        onSeek(time)
      }

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)

        setTimeout(() => {
          setIsUserScrolling(false)
        }, 1000)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [pixelsPerSecond, duration, onSeek],
  )

  const handleTrackSelect = useCallback(
    (trackId: string, selected: boolean) => {
      setSelectedTracks((prev) => {
        const newSet = new Set(prev)
        if (selected) {
          newSet.clear()
          newSet.add(trackId)
        } else {
          newSet.delete(trackId)
        }
        return newSet
      })

      tracks.forEach((track) => {
        onTrackUpdate(track.id, { selected: track.id === trackId ? selected : false })
      })
    },
    [onTrackUpdate, tracks],
  )

  const handleTrackDelete = useCallback(
    (trackId: string) => {
      onTrackDelete(trackId)
      setSelectedTracks((prev) => {
        const newSet = new Set(prev)
        newSet.delete(trackId)
        return newSet
      })
    },
    [onTrackDelete],
  )

  const handleTrackDuplicate = useCallback(
    (trackId: string) => {
      onTrackDuplicate(trackId)
    },
    [onTrackDuplicate],
  )

  // Generate timeline ruler
  const rulerMarks = []
  const totalWidth = Math.max(duration * pixelsPerSecond, 1200)
  const interval = pixelsPerSecond >= 50 ? 1 : pixelsPerSecond >= 25 ? 2 : 4

  for (let i = 0; i <= Math.ceil(duration); i += interval) {
    rulerMarks.push(i)
  }

  // Generate grid lines
  const gridLines = []
  const gridInterval = snapToGrid ? 0.25 : 1
  for (let i = 0; i <= duration; i += gridInterval) {
    gridLines.push(i)
  }

  // Group tracks by lane
  const tracksByLane = tracks.reduce(
    (acc, track) => {
      if (!acc[track.trackIndex]) {
        acc[track.trackIndex] = []
      }
      (acc[track.trackIndex] ?? []).push(track)
      return acc
    },
    {} as Record<number, Track[]>,
  )

  const maxLanes = Math.max(8, Math.max(...tracks.map((t) => t.trackIndex), -1) + 3)
  const laneHeight = layout === "compact" ? 60 : layout === "focus" ? 80 : 100

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      switch (e.key.toLowerCase()) {
        case "s":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            setSplitMode(!splitMode)
          }
          break
        case "delete":
        case "backspace":
          e.preventDefault()
          selectedTracks.forEach((trackId) => handleTrackDelete(trackId))
          break
        case "escape":
          setSplitMode(false)
          setSelectedTracks(new Set())
          tracks.forEach((track) => onTrackUpdate(track.id, { selected: false }))
          break
        case "a":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            setAutoScroll(!autoScroll)
          }
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [splitMode, selectedTracks, tracks, onTrackUpdate, handleTrackDelete, autoScroll])

  useEffect(() => {
    return () => {
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background text-foreground">
      {/* Timeline Header */}
      <div
        className={`${layout === "compact" ? "h-12" : "h-16"} border-b border-border flex items-center bg-background/80 backdrop-blur-sm shadow-sm z-10`}
      >
        {/* Fixed sidebar header */}
        <div className={`w-64 px-4 border-r border-border flex items-center justify-between flex-shrink-0`}>
          <div>
            <span className={`text-sm font-semibold text-foreground`}>
              Timeline ({tracks.length})
            </span>
            {layout !== "compact" && (
              <div className="flex items-center gap-2">
                <Button
                  size='sm'
                  variant='default'
                  onClick={() => setSplitMode(!splitMode)}
                  className={`h-8 ${splitMode
                    ? "bg-destructive text-white"
                    : ""
                    }`}
                >
                  {splitMode ? "Split on" : "Split"}
                </Button>
                <Button
                  size='sm'
                  variant='default'

                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`h-8 ${autoScroll
                    ? "bg-accent text-white"
                    : ""
                    }`}
                >
                  {autoScroll ? "Scroll on" : "Scroll"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable timeline header */}
        <div className="flex-1 overflow-hidden">
          <div
            ref={timelineHeaderRef}
            className="overflow-x-auto overflow-y-hidden custom-scroll"
            onClick={handleTimelineClick}
            style={{ cursor: splitMode ? "crosshair" : "pointer" }}
          >
            <div
              className="relative"
              style={{ width: `${totalWidth}px`, height: layout === "compact" ? "48px" : "64px" }}
            >
              {/* Grid Lines */}
              <div className="absolute inset-0 pointer-events-none">
                {gridLines.map((time) => (
                  <div
                    key={`grid-${time}`}
                    className={`absolute top-0 bottom-0 w-px ${time % 1 === 0 ? "bg-border" : "bg-border/50"
                      }`}
                    style={{ left: `${time * pixelsPerSecond}px` }}
                  />
                ))}
              </div>

              {/* Ruler */}
              <div className="h-full relative">
                {rulerMarks.map((time) => (
                  <div
                    key={time}
                    className="absolute top-0 h-full flex flex-col"
                    style={{ left: `${time * pixelsPerSecond}px` }}
                  >
                    <div className={`w-px h-4 bg-muted-foreground`} />
                    <span className={`text-xs mt-1 font-mono text-muted-foreground`}>
                      {formatTime(time)}
                    </span>
                  </div>
                ))}

                {/* Playhead */}
                <div
                  className="absolute top-0 w-0.5 h-full bg-gradient-to-b from-primary to-accent z-30 shadow-xl cursor-pointer"
                  style={{ left: `${currentTime * pixelsPerSecond - 1}px` }}
                  onMouseDown={handlePlayheadDrag}
                >
                  <div
                    className="absolute -top-2 -left-3 w-6 h-6 bg-gradient-to-r from-primary to-accent rotate-45 transform shadow-lg border-2 border-background cursor-pointer rounded-sm"
                    onMouseDown={handlePlayheadDrag}
                  />
                  <div className="absolute -top-8 -left-8 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-lg shadow-lg font-mono pointer-events-none">
                    {formatTime(currentTime)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area with vertical scrolling */}
      <div ref={verticalScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex min-h-full">
          {/* Fixed sidebar for track controls */}
          <div className={`w-64 flex-shrink-0 border-r border-sidebar-border bg-sidebar-background`}>
            {Array.from({ length: maxLanes }).map((_, laneIndex) => {
              const laneTrack = tracksByLane[laneIndex]?.[0]

              return (
                <div
                  key={`lane-controls-${laneIndex}`}
                  className={`p-3 border-b border-sidebar-border flex flex-col justify-between`}
                  style={{ height: `${laneHeight + 4}px` }}
                >
                  {laneTrack ? (
                    <>
                      <div className="flex-1">
                        <span className={`text-sm font-medium truncate block text-sidebar-foreground`}>
                          {laneTrack.name}
                        </span>
                        {(tracksByLane[laneIndex]?.length ?? 0) > 1 && (
                          <div className={`text-xs text-muted-foreground`}>
                            {(tracksByLane[laneIndex]?.length ?? 0)} segments
                          </div>
                        )}
                      </div>
                      {layout !== "compact" && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Button
                              size='sm'

                              className={`h-5 w-5 rounded-full text-xs transition-colors ${laneTrack.muted
                                ? "bg-destructive text-destructive-foreground shadow-md"
                                : "bg-secondary text-secondary-foreground hover:bg-muted"
                                }`}
                              onClick={() => onTrackUpdate(laneTrack.id, { muted: !laneTrack.muted })}
                            >
                              {laneTrack.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                            </Button>
                            <Button
                              size='sm'
                              className={`rounded-full h-5 w-5 text-xs font-bold transition-colors ${laneTrack.soloed
                                ? "bg-accent text-warning-foreground shadow-md"
                                : "bg-secondary text-secondary-foreground hover:bg-muted"
                                }`}
                              onClick={() => onTrackUpdate(laneTrack.id, { soloed: !laneTrack.soloed })}
                            >
                              <Radio className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex items-center space-x-1">
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.1"
                              value={laneTrack.volume}
                              onChange={(e) =>
                                onTrackUpdate(laneTrack.id, { volume: Number.parseFloat(e.target.value) })
                              }
                              className="w-16 h-1 "
                            />
                            <span className={`text-xs w-8 text-right text-muted-foreground`}>
                              {Math.round(laneTrack.volume * 100)}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <span className={`text-xs text-muted-foreground`}>
                        Lane {laneIndex + 1}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Horizontally scrollable tracks area */}
          <div className="flex-1 overflow-hidden">
            <div
              ref={horizontalScrollRef}
              className="overflow-x-auto overflow-y-hidden h-full"
              onScroll={handleHorizontalScroll}
            >
              <div
                ref={tracksContainerRef}
                className="relative bg-background"
                style={{ width: `${totalWidth}px`, height: `${maxLanes * (laneHeight + 4)}px` }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {/* Playhead extension */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/60 to-accent/60 z-20 cursor-pointer"
                  style={{ left: `${currentTime * pixelsPerSecond - 1}px` }}
                  onMouseDown={handlePlayheadDrag}
                />

                {/* Drop indicator */}
                {dragOverPosition && (
                  <>
                    <div
                      className="absolute w-0.5 h-full bg-primary z-20 pointer-events-none shadow-lg opacity-80"
                      style={{
                        left: `${dragOverPosition.x}px`,
                        top: 0,
                      }}
                    >
                      <div className="absolute -top-2 -left-2 w-4 h-4 bg-primary rotate-45 transform rounded-sm" />
                    </div>
                    <div
                      className="absolute w-full bg-primary/10 border-2 border-primary/30 border-dashed z-10 pointer-events-none rounded-lg"
                      style={{
                        left: 0,
                        top: `${Math.floor(dragOverPosition.y / (laneHeight + 4)) * (laneHeight + 4)}px`,
                        height: `${laneHeight + 4}px`,
                      }}
                    />
                  </>
                )}

                {/* Grid background */}
                <div className="absolute inset-0 pointer-events-none">
                  {gridLines.map((time) => (
                    <div
                      key={`track-grid-${time}`}
                      className={`absolute top-0 bottom-0 w-px ${time % 1 === 0 ? "bg-border/30" : "bg-muted/20"
                        }`}
                      style={{ left: `${time * pixelsPerSecond}px` }}
                    />
                  ))}
                </div>

                {/* Track lanes */}
                {Array.from({ length: maxLanes }).map((_, laneIndex) => (
                  <div
                    key={`lane-${laneIndex}`}
                    className={`absolute w-full border-b border-border`}
                    style={{
                      top: `${laneIndex * (laneHeight + 4)}px`,
                      height: `${laneHeight + 4}px`,
                    }}
                  >
                    {tracksByLane[laneIndex]?.map((track) => {
                      const audioFile = audioFiles.find((f) => f.id === track.audioFileId)
                      if (!audioFile) return null

                      return (
                        <TrackComponent
                          key={track.id}
                          track={track}
                          audioFile={audioFile}
                          pixelsPerSecond={pixelsPerSecond}
                          onUpdate={(updates) => onTrackUpdate(track.id, updates)}
                          onDelete={() => handleTrackDelete(track.id)}
                          onDuplicate={() => handleTrackDuplicate(track.id)}
                          onSplit={(time) => onTrackSplit(track.id, time)}
                          onSelect={(selected) => handleTrackSelect(track.id, selected)}
                          snapToGrid={snapToGrid}
                          isDark={isDark}
                          isSelected={selectedTracks.has(track.id)}
                          splitMode={splitMode}
                        />
                      )
                    })}
                  </div>
                ))}

                {/* Empty state */}
                {tracks.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div
                        className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-r from-primary to-accent opacity-50`}
                      >
                        <Plus className="w-8 h-8 text-primary-foreground" />
                      </div>
                      <div className={`text-lg font-medium mb-2 text-foreground`}>
                        No tracks yet
                      </div>
                      <div className={`text-sm text-muted-foreground`}>
                        Drag audio files from the sidebar to create tracks
                      </div>
                      <div className={`text-xs mt-2 text-muted-foreground/80`}>
                        Click tracks to select • Use keyboard shortcuts for quick actions
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  )
}

"use client"

import React, { useState } from "react"
import { Badge } from "~/components/shadcn/ui/badge"
import { Music, Sparkles, Sliders, Settings, Upload, X, Trash2, Clock, FileAudio } from "lucide-react"
import type { AudioFile } from "../types/audio"
import { IntelligentAIPanel } from "../components/IntelligentAIPanel"
import { AdaptiveMixer } from "../components/AdaptiveMixer"
import { useLyriaStatus } from "../hooks/use-lyria-status"

interface ModernSidebarProps {
  activePanel: "library" | "mixer" | "ai" | "settings"
  onPanelChange: (panel: "library" | "mixer" | "ai" | "settings") => void
  audioFiles: AudioFile[]
  onFilesAdded: (files: File[]) => void
  onRemoveFile: (fileId: string) => void
  onRemoveAll: () => void
  onDragStart: (audioFile: AudioFile) => void
  onAudioGenerated: (audioBlob: Blob, title: string) => void
  masterVolume: number
  onMasterVolumeChange: (volume: number) => void
  masterEQ: { low: number; mid: number; high: number }
  onEQChange: (band: "low" | "mid" | "high", value: number) => void
  isDark: boolean
  isCompact: boolean
}

export const ModernSidebar: React.FC<ModernSidebarProps> = ({
  activePanel,
  onPanelChange,
  audioFiles,
  onFilesAdded,
  onRemoveFile,
  onRemoveAll,
  onDragStart,
  onAudioGenerated,
  masterVolume,
  onMasterVolumeChange,
  masterEQ,
  onEQChange,
  isDark,
  isCompact,
}) => {
  const [dragOver, setDragOver] = useState(false)
  const { lyriaStatus } = useLyriaStatus()
  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const files = Array.from(e.dataTransfer.files).filter(
        (file) =>
          file.type.startsWith("audio/") ||
          file.name.toLowerCase().endsWith(".mp3") ||
          file.name.toLowerCase().endsWith(".wav") ||
          file.name.toLowerCase().endsWith(".m4a") ||
          file.name.toLowerCase().endsWith(".flac"),
      )
      if (files.length > 0) {
        onFilesAdded(files)
      }
    },
    [onFilesAdded],
  )

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false)
    }
  }, [])

  const handleFileInput = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (files.length > 0) {
        onFilesAdded(files)
      }
      e.target.value = ""
    },
    [onFilesAdded],
  )

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60)
    const seconds = Math.floor(duration % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const formatFileSize = (file: File) => {
    const size = file.size
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }
  console.log("Lyria Status:", lyriaStatus)
  const handleItemDragStart = React.useCallback(
    (e: React.DragEvent, audioFile: AudioFile) => {
      e.dataTransfer.setData(
        "application/x-audiofile",
        JSON.stringify({
          id: audioFile.id,
          name: audioFile.name,
          duration: audioFile.duration,
        }),
      )
      e.dataTransfer.effectAllowed = "copy"
      onDragStart(audioFile)
    },
    [onDragStart],
  )

  if (isCompact) {
    return (
      <div
        className={`h-full flex flex-col  border-r`}
      >
        <div className="p-4 space-y-3">
          {[
            { id: "library", icon: Music, label: "Library" },
            { id: "ai", icon: Sparkles, label: "AI" },
            { id: "mixer", icon: Sliders, label: "Mixer" },
          ].map((panel) => (
            <button
              key={panel.id}
              onClick={() => onPanelChange(panel.id as "library" | "ai" | "mixer" | "settings")}
              disabled={lyriaStatus === 'Playing'}
              className={`w-full p-3 rounded-xl transition-all 
              ${activePanel === panel.id
                  ? "bg-white dark:bg-gray-700  shadow-sm"
                  : "text-gray-600  hover:text-gray-900 dark:hover:text-gray-200"
                } hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center space-x-2
           
                  `}
              title={panel.label}
            >
              <panel.icon className="w-5 h-5 mx-auto" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`h-full flex flex-col  border-r`}
    >
      {/* Panel Navigation */}
      <div className={`p-4 border-b `}>
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
          {[
            { id: "library", icon: Music, label: "Library" },
            { id: "ai", icon: Sparkles, label: "AI" },
            { id: "mixer", icon: Sliders, label: "Mixer" },

          ].map((panel) => (
            <button
              key={panel.id}
              onClick={() => onPanelChange(panel.id as "library" | "ai" | "mixer" | "settings")}
              disabled={lyriaStatus === 'Playing'}

              className={`p-2 rounded-lg transition-all text-xs font-medium ${activePanel === panel.id
                ? "bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"

                }
                ${lyriaStatus === 'Playing' ? 'cursor-not-allowed opacity-50' : ''}
                
                `}
            >
              <panel.icon className="w-4 h-4 mx-auto mb-1" />
              {panel.label}
            </button>
          ))}
        </div>
      </div >

      {/* Panel Content */}
      < div className="flex-1 overflow-hidden " >
        {activePanel === "library" && (
          <div className="h-full flex flex-col">
            {/* Upload Area */}
            <div className="p-4">
              <div
                className={`p-6 border-2 border-dashed rounded-2xl transition-all duration-200 ${dragOver
                  ? "border-violet-400 bg-violet-50 dark:bg-violet-900/20 scale-105"
                  : "border-gray-300 dark:border-gray-700 hover:border-violet-400 bg-gray-50 dark:bg-gray-800/50"
                  }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <p className={`text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Drop audio files here
                  </p>
                  <p className={`text-xs mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    MP3, WAV, M4A, FLAC supported
                  </p>
                  <label className="inline-block">
                    <input
                      type="file"
                      multiple
                      accept="audio/*,.mp3,.wav,.m4a,.flac"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                    <span className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm rounded-xl cursor-pointer hover:from-violet-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg">
                      Browse Files
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {audioFiles.length > 0 && (
                <div className="flex justify-between items-center mb-4">
                  <Badge variant="outline" className="text-violet-600 border-violet-200">
                    {audioFiles.length} file{audioFiles.length !== 1 ? "s" : ""}
                  </Badge>
                  <button
                    onClick={onRemoveAll}
                    className={`text-xs px-3 py-1 rounded-lg transition-colors ${isDark
                      ? "text-red-400 hover:bg-red-900/20 hover:text-red-300"
                      : "text-red-600 hover:bg-red-50 hover:text-red-700"
                      }`}
                  >
                    <Trash2 className="w-3 h-3 inline mr-1" />
                    Clear All
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {audioFiles.map((file) => (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={(e) => handleItemDragStart(e, file)}
                    className={`p-4 rounded-2xl border cursor-move transition-all duration-200 group hover:shadow-lg bg-violet-50 dark:bg-violet-900/20  transform hover:scale-[1.02]`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 min-w-0 flex-1">
                        <div className="p-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500">
                          <FileAudio className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate `}>
                            {file.name.replace(/\.[^/.]+$/, "")}
                          </p>
                          <div className="flex items-center space-x-3 mt-1">
                            <div className="flex items-center space-x-1">
                              <Clock className={`w-3 h-3 `} />
                              <span className={`text-xs `}>
                                {formatDuration(file.duration)}
                              </span>
                            </div>
                            <span className={`text-xs `}>
                              {formatFileSize(file.file)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveFile(file.id)}
                        className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ${isDark
                          ? "text-gray-400 hover:text-red-400 hover:bg-red-900/20"
                          : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                          }`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {audioFiles.length === 0 && (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center mb-4 opacity-50">
                      <Music className="w-8 h-8 text-white" />
                    </div>
                    <p className={`text-sm font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      No audio files loaded
                    </p>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      Upload files to start creating music
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activePanel === "ai" && <IntelligentAIPanel onAudioGenerated={onAudioGenerated} isDark={isDark} />}

        {
          activePanel === "mixer" && (
            <AdaptiveMixer
              masterVolume={masterVolume}
              onMasterVolumeChange={onMasterVolumeChange}
              masterEQ={masterEQ}
              onEQChange={onEQChange}
              isDark={isDark}
            />
          )
        }


      </div >
    </div >
  )
}

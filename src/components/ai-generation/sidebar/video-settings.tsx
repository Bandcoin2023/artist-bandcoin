"use client"

import type React from "react"

import { HelpCircle, Square, RectangleHorizontal, RectangleVertical } from "lucide-react"
import { cn } from "~/lib/utils"
import { useGenerationStore } from "~/lib/generation-store"

export function VideoSettings() {
  const {
    selectedVideoModel,
    selectedDuration,
    setSelectedDuration,
    selectedQuality,
    setSelectedQuality,
    selectedVideoAspectRatio,
    setSelectedVideoAspectRatio,
  } = useGenerationStore()

  const { capabilities } = selectedVideoModel

  const aspectRatioIcons: Record<string, React.ReactNode> = {
    "16:9": <RectangleHorizontal className="w-6 h-4" />,
    "9:16": <RectangleVertical className="w-4 h-6" />,
    "1:1": <Square className="w-5 h-5" />,
  }

  return (
    <div className="space-y-5">
      {/* Duration */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-foreground">Duration</span>
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex gap-2">
          {capabilities.durations.map((duration) => (
            <button
              key={duration}
              onClick={() => setSelectedDuration(duration)}
              className={cn(
                "flex-1 py-2.5 rounded-lg border transition-colors text-sm font-medium",
                selectedDuration === duration.toString()
                  ? "bg-accent"
                  : "bg-secondary border-border text-muted-foreground hover:border-muted-foreground",
              )}
            >
              {duration}s
            </button>
          ))}
        </div>
      </div>

      {/* Generation Mode / Quality */}
      {capabilities.hasQuality && capabilities.qualities && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-foreground">Generation Mode</span>
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex gap-2">
            {capabilities.qualities.map((quality) => (
              <button
                key={quality.label}
                onClick={() => setSelectedQuality(quality.label)}
                className={cn(
                  "flex-1 flex flex-col items-center py-2.5 px-3 rounded-lg border transition-colors",
                  selectedQuality === quality.label
                    ? "bg-accent"
                    : "bg-secondary border-border text-muted-foreground hover:border-muted-foreground",
                )}
              >
                <span className="text-sm font-medium">{quality.label.toLocaleUpperCase()}</span>
                <span className="text-xs opacity-70">{quality.resolution}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Video Dimensions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-foreground">Video Dimensions</span>
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex gap-2">
          {capabilities.aspectRatios.map((ratio) => (
            <button
              key={ratio}
              onClick={() => setSelectedVideoAspectRatio(ratio)}
              className={cn(
                "flex-1 flex flex-col items-center gap-2 py-3 px-4 rounded-lg border transition-colors",
                selectedVideoAspectRatio === ratio
                  ? "bg-accent"
                  : "bg-secondary border-border text-muted-foreground hover:border-muted-foreground",
              )}
            >
              <div className="w-10 h-10 flex items-center justify-center">
                {aspectRatioIcons[ratio] ?? <Square className="w-5 h-5" />}
              </div>
              <span className="text-xs">{ratio}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

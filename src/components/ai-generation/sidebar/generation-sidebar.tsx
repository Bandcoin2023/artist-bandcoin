"use client"

import { RotateCcw, Lock, ChevronDown } from "lucide-react"
import { Button } from "~/components/shadcn/ui/button"
import { Switch } from "~/components/shadcn/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/shadcn/ui/collapsible"
import { ModelSelector } from "./model-selector"
import { ImageSettings } from "./image-settings"
import { VideoSettings } from "./video-settings"
import { useGenerationStore } from "~/lib/generation-store"

export function GenerationSidebar() {
  const { mediaType, resetToDefaults } = useGenerationStore()

  return (
    <aside className="w-80 bg-card border-r border-border flex flex-col h-full overflow-hidden ">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Model Selector */}
        <ModelSelector />
        {/* Dynamic Settings based on media type */}
        {mediaType === "image" ? <ImageSettings /> : <VideoSettings />}
      </div>
    </aside>
  )
}

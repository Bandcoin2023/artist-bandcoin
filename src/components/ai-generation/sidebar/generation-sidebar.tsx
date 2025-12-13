"use client"

import { RotateCcw, Lock, ChevronDown } from "lucide-react"
import { Button } from "~/components/shadcn/ui/button"
import { Switch } from "~/components/shadcn/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/shadcn/ui/collapsible"
import { ModelSelector } from "./model-selector"
import { ImageSettings } from "./image-settings"
import { VideoSettings } from "./video-settings"
import { useGenerationStore } from "~/lib/generation-store"
import { PromptInput } from "../main/prompt-input"

export function GenerationSidebar() {
  const { mediaType, resetToDefaults } = useGenerationStore()

  return (
    <aside className="w-96 h-[calc(100vh-10.8vh)] bg-card border-r border-border flex flex-col  overflow-hidden ">
      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-hide">
        {/* Model Selector */}

        <ModelSelector />
        <PromptInput />
        {/* Dynamic Settings based on media type */}
        {mediaType === "image" ? <ImageSettings /> : <VideoSettings />}

      </div>
    </aside>
  )
}

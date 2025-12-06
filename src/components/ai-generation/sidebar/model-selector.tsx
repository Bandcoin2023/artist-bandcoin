"use client"

import { useState } from "react"
import { ChevronUp, HelpCircle, Sparkles } from "lucide-react"
import { cn } from "~/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/shadcn/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/shadcn/ui/tabs"
import { Badge } from "~/components/shadcn/ui/badge"
import { useGenerationStore } from "~/lib/generation-store"
import { IMAGE_MODELS, VIDEO_MODELS, type ImageModelConfig, type VideoModelConfig } from "~/lib/models-config"

export function ModelSelector() {
  const [open, setOpen] = useState(false)
  const {
    mediaType,
    setMediaType,
    selectedImageModel,
    setSelectedImageModel,
    selectedVideoModel,
    setSelectedVideoModel,
    resetToDefaults,
  } = useGenerationStore()

  const currentModel = mediaType === "image" ? selectedImageModel : selectedVideoModel

  const handleSelectImageModel = (model: ImageModelConfig) => {
    setSelectedImageModel(model)
    setMediaType("image")
    setOpen(false)
  }

  const handleSelectVideoModel = (model: VideoModelConfig) => {
    setMediaType("video")
    resetToDefaults()
    setSelectedVideoModel(model)
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 p-4 text-left hover:border-emerald-500/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-emerald-400">Model</span>
            <p className="text-foreground font-semibold mt-1">{currentModel.name}</p>
          </div>
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden bg-card border-border">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle>Models</DialogTitle>
            </div>
          </DialogHeader>

          <Tabs defaultValue={mediaType} onValueChange={(v) => setMediaType(v as "image" | "video")}>
            <TabsList className="bg-accent">
              <TabsTrigger value="image">Image</TabsTrigger>
              <TabsTrigger value="video">Video</TabsTrigger>
            </TabsList>

            <TabsContent value="image" className="mt-4 max-h-[50vh] overflow-y-auto space-y-2 pr-2">

              {IMAGE_MODELS.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  isSelected={selectedImageModel.id === model.id}
                  onClick={() => handleSelectImageModel(model)}
                />
              ))}
            </TabsContent>

            <TabsContent value="video" className="mt-4 max-h-[50vh] overflow-y-auto space-y-2 pr-2">

              {VIDEO_MODELS.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  isSelected={selectedVideoModel.id === model.id}
                  onClick={() => handleSelectVideoModel(model)}
                />
              ))}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ModelCard({
  model,
  isSelected,
  onClick,
}: {
  model: ImageModelConfig | VideoModelConfig
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-4 p-3 rounded-lg text-left transition-colors",
        isSelected ? "bg-emerald-500/20 border border-emerald-500/50" : "hover:bg-secondary border border-transparent",
      )}
    >
      <img
        src={model.thumbnail || "/placeholder.svg"}
        alt={model.name}
        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{model.name}</span>
          <ProviderBadge provider={model.provider} />
          {model.isNew && <Badge className="bg-emerald-500 text-white text-xs px-1.5 py-0">New</Badge>}
        </div>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{model.description}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {model.features.map((feature) => (
            <Badge key={feature} variant="secondary" className="text-xs">
              {feature}
            </Badge>
          ))}
        </div>
      </div>
    </button>
  )
}

function ProviderBadge({ provider }: { provider: "openai" | "google" }) {
  return (
    <span
      className={cn(
        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
        provider === "openai" ? "bg-white text-black" : "bg-blue-500 text-white",
      )}
    >
      {provider === "openai" ? "O" : "G"}
    </span>
  )
}

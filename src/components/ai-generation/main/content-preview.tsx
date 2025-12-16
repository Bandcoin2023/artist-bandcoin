"use client"

import { useState, useEffect } from "react"
import {
  Check,
  Play,
  X,
  Download,
  Maximize2,
  Video,
  Trash2,
  Sparkles,
  ImageIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "~/lib/utils"
import { Button } from "~/components/shadcn/ui/button"
import { Dialog, DialogContent } from "~/components/shadcn/ui/dialog"
import { useGenerationStore } from "~/lib/generation-store"
import type { GeneratedItem } from "~/lib/generation-store"
import { api } from "~/utils/api"

export function ContentPreview() {
  const { generatedItems, toggleItemSelection, isGenerating, mediaType, activeItemId, setActiveItemId } =
    useGenerationStore()

  const [previewItem, setPreviewItem] = useState<GeneratedItem | null>(null)
  const selectedCount = generatedItems.filter((item) => item.selected).length

  const { data: aiContentData } = api.ai.getAllAiContent.useQuery({})
  const deleteMutation = api.ai.deleteAiContent.useMutation()

  const downloadItems = async (items: GeneratedItem[]) => {
    for (const item of items) {
      try {
        const response = await fetch(item.url)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${item.prompt.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "_")}.${item.type === "image" ? "jpg" : "mp4"}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error("Failed to download item:", item.id, error)
        // Fallback: open in new tab
        window.open(item.url, '_blank')
      }
    }
  }

  const handleDelete = () => {
    const selectedIds = generatedItems.filter((item) => item.selected).map((item) => parseInt(item.id))
    if (selectedIds.length > 0) {
      deleteMutation.mutate(
        { ids: selectedIds },
        {
          onSuccess: () => {
            useGenerationStore.setState((state) => ({
              generatedItems: state.generatedItems.filter((item) => !selectedIds.some(id => id === parseInt(item.id))),
              activeItemId: state.activeItemId && !selectedIds.some(id => id === parseInt(state.activeItemId!)) ? state.activeItemId : null,
            }))
          },
        }
      )
    }
  }

  const handleDownload = async () => {
    const selected = generatedItems.filter((item) => item.selected)
    if (selected.length > 0) {
      await downloadItems(selected)
    } else if (activeItem) {
      await downloadItems([activeItem])
    }
  }

  useEffect(() => {
    if (aiContentData?.aiContents && aiContentData.aiContents.length > 0) {
      // Convert database items to GeneratedItem format
      const dbItems: GeneratedItem[] = aiContentData.aiContents.map((content) => ({
        id: content.id.toString(),
        type: content.contentType.toLowerCase() as "image" | "video",
        url: content.contentUrl,
        prompt: content.prompt,
        model: "AI Model",
        timestamp: content.createdAt,
        selected: false,
      }))

      // Only update if we don't have items yet
      if (generatedItems.length === 0) {
        useGenerationStore.setState({
          generatedItems: dbItems,
          activeItemId: dbItems[0]?.id ?? null,
        })
      }
    }
  }, [aiContentData, generatedItems.length])

  // Get the active item to display in main area
  const activeItem = generatedItems.find((item) => item.id === activeItemId) ?? generatedItems[0] ?? null

  const navigateItem = (direction: "prev" | "next") => {
    if (generatedItems.length === 0) return

    const currentIndex = generatedItems.findIndex((item) => item.id === activeItemId)
    let newIndex: number

    if (direction === "prev") {
      newIndex = currentIndex <= 0 ? generatedItems.length - 1 : currentIndex - 1
    } else {
      newIndex = currentIndex >= generatedItems.length - 1 ? 0 : currentIndex + 1
    }

    setActiveItemId(generatedItems[newIndex]?.id ?? null)
  }

  return (
    <>
      {selectedCount > 0 && (
        <div className="px-4 py-2 bg-secondary/50 border-b border-border flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedCount} item{selectedCount > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={handleDownload}>
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-lg border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
            <div>
              <p className="text-sm font-medium">Generating {mediaType === "image" ? "images" : "video"}...</p>
              <p className="text-xs text-muted-foreground">This may take a few moments</p>
            </div>
          </div>
        </div>
      )}

      {generatedItems.length === 0 && !isGenerating ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
              {mediaType === "image" ? (
                <ImageIcon className="w-10 h-10 text-emerald-500" />
              ) : (
                <Video className="w-10 h-10 text-cyan-500" />
              )}
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Ready to Create</h3>
            <p className="text-muted-foreground mb-6">
              Enter a prompt above to start generating amazing AI {mediaType === "image" ? "images" : "videos"}. Your
              creations will appear here.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {mediaType === "image" ? (
                <>
                  <SuggestionChip text="A serene mountain landscape at sunset" />
                  <SuggestionChip text="Futuristic city with flying cars" />
                  <SuggestionChip text="Cute robot playing guitar" />
                </>
              ) : (
                <>
                  <SuggestionChip text="Ocean waves crashing on rocks" />
                  <SuggestionChip text="Time-lapse of flowers blooming" />
                  <SuggestionChip text="Drone shot flying through clouds" />
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeItem && (
              <div className="flex-1 relative bg-black/95 flex items-center justify-center overflow-hidden group">
                {/* Navigation Buttons */}
                {generatedItems.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => navigateItem("prev")}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => navigateItem("next")}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                  </>
                )}

                {/* Selection Checkbox */}
                <button
                  onClick={() => toggleItemSelection(activeItem.id)}
                  className={cn(
                    "absolute top-4 left-4 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all z-10",
                    activeItem.selected
                      ? "bg-emerald-500 border-emerald-500"
                      : "bg-black/50 border-white/50 hover:bg-black/70",
                  )}
                >
                  {activeItem.selected && <Check className="w-5 h-5 text-white" />}
                </button>

                {/* Action Buttons */}
                <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-black/50 hover:bg-black/70 text-white"
                    onClick={() => setPreviewItem(activeItem)}
                  >
                    <Maximize2 className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="bg-black/50 hover:bg-black/70 text-white" onClick={async () => await downloadItems([activeItem])}>
                    <Download className="w-5 h-5" />
                  </Button>
                </div>

                {/* Main Content */}
                {activeItem.type === "image" ? (
                  <img
                    src={activeItem.url || "/placeholder.svg"}
                    alt={activeItem.prompt}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <video src={activeItem.url} controls autoPlay loop className="max-w-full max-h-full" />
                )}

                {/* Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">{activeItem.model}</span>
                    <span className="text-xs text-white/70 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(activeItem.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-white text-sm line-clamp-2">{activeItem.prompt}</p>
                </div>
              </div>
            )}

            <div className="border-t border-border bg-card">
              <div className="px-4 py-3 overflow-x-auto">
                <div className="flex gap-3 min-w-max">
                  {generatedItems.map((item) => (
                    <ThumbnailCard
                      key={item.id}
                      item={item}
                      isActive={item.id === activeItemId}
                      onSelect={() => setActiveItemId(item.id)}
                      onToggleSelection={() => toggleItemSelection(item.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-card border-border">
          {previewItem && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70"
                onClick={() => setPreviewItem(null)}
              >
                <X className="w-5 h-5 text-white" />
              </Button>

              <div className="bg-black flex items-center justify-center min-h-[400px]">
                {previewItem.type === "image" ? (
                  <img
                    src={previewItem.url || "/placeholder.svg"}
                    alt={previewItem.prompt}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                ) : (
                  <video src={previewItem.url} controls autoPlay className="max-w-full max-h-[70vh]" />
                )}
              </div>

              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {previewItem.model}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(previewItem.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-foreground">{previewItem.prompt}</p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={async () => await downloadItems([previewItem])}>
                    <Download className="w-4 h-4" />
                    Download
                  </Button>

                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function SuggestionChip({ text }: { text: string }) {
  const { setPrompt } = useGenerationStore()

  return (
    <button
      onClick={() => setPrompt(text)}
      className="px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      {text}
    </button>
  )
}

function ThumbnailCard({
  item,
  isActive,
  onSelect,
  onToggleSelection,
}: {
  item: GeneratedItem
  isActive: boolean
  onSelect: () => void
  onToggleSelection: () => void
}) {
  return (
    <div
      className={cn(
        "relative w-32 h-32 rounded-lg overflow-hidden border-2 transition-all cursor-pointer bg-secondary flex-shrink-0",
        isActive
          ? "border-emerald-500 ring-2 ring-emerald-500/50 scale-105"
          : "border-border hover:border-muted-foreground/50",
      )}
      onClick={onSelect}
    >
      {item.type === "image" ? (
        <img
          src={item.url || "/placeholder.svg"}
          alt={item.prompt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="relative w-full h-full">
          <video src={item.url} className="w-full h-full object-cover" muted loop playsInline />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-5 h-5 text-white ml-0.5" />
            </div>
          </div>
        </div>
      )}

      {/* Selection Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleSelection()
        }}
        className={cn(
          "absolute top-1.5 left-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
          item.selected ? "bg-emerald-500 border-emerald-500" : "bg-black/50 border-white/50",
        )}
      >
        {item.selected && <Check className="w-3 h-3 text-white" />}
      </button>

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
      )}
    </div>
  )
}

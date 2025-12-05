"use client"
import { Sparkles, Loader2, ImageIcon, Video } from "lucide-react"
import { Button } from "~/components/shadcn/ui/button"
import { Textarea } from "~/components/shadcn/ui/textarea"
import { useGenerationStore } from "~/lib/generation-store"
import type { GeneratedItem } from "~/lib/generation-store"
import { cn } from "~/lib/utils"

export function PromptInput() {
  const {
    prompt,
    setPrompt,
    isGenerating,
    setIsGenerating,
    mediaType,
    selectedImageModel,
    selectedVideoModel,
    selectedStyle,
    selectedSize,
    selectedAspectRatio,
    numberOfImages,
    selectedDuration,
    selectedQuality,
    selectedVideoAspectRatio,
    addGeneratedItems,
  } = useGenerationStore()

  const currentModel = mediaType === "image" ? selectedImageModel : selectedVideoModel

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return

    setIsGenerating(true)

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          mediaType,
          model: currentModel.id,
          provider: currentModel.provider,
          // Image specific
          style: selectedStyle,
          size: selectedSize,
          aspectRatio: selectedAspectRatio,
          numberOfImages,
          // Video specific
          duration: selectedDuration,
          quality: selectedQuality,
          videoAspectRatio: selectedVideoAspectRatio,
        }),
      })

      const data = await response.json()

      if (data.items) {
        const newItems: GeneratedItem[] = data.items.map((item: { url: string }, index: number) => ({
          id: `${Date.now()}-${index}`,
          type: mediaType,
          url: item.url,
          prompt,
          model: currentModel.name,
          timestamp: new Date(),
          selected: false,
        }))
        addGeneratedItems(newItems)
      }
    } catch (error) {
      console.error("Generation failed:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 bg-secondary/50 border-b border-border">
        <div className="flex items-center gap-2">
          {mediaType === "image" ? (
            <ImageIcon className="w-4 h-4 text-emerald-500" />
          ) : (
            <Video className="w-4 h-4 text-cyan-500" />
          )}
          <span className="font-medium text-sm">{currentModel.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {currentModel.provider === "openai" ? "OpenAI" : "Google"}
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {mediaType === "image" ? (
            <>
              <span>{selectedStyle}</span>
              <span>•</span>
              <span>{selectedAspectRatio}</span>
              <span>•</span>
              <span>{selectedSize}</span>
              <span>•</span>
              <span>
                {numberOfImages} {numberOfImages > 1 ? "images" : "image"}
              </span>
            </>
          ) : (
            <>
              <span>{selectedDuration}s</span>
              <span>•</span>
              <span>{selectedVideoAspectRatio}</span>
              {selectedQuality && (
                <>
                  <span>•</span>
                  <span>{selectedQuality}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-3">
          <Textarea
            placeholder={`Describe what you want to ${mediaType === "image" ? "create" : "generate"}...`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="flex-1 min-h-[100px] bg-secondary/50 border-0 resize-none text-base"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleGenerate()
              }
            }}
          />
        </div>

        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">Enter</kbd> to
            generate or{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">Shift+Enter</kbd> for new
            line
          </p>
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className={cn(
              "px-6 gap-2",
              mediaType === "image"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600",
              "text-white shadow-lg",
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

"use client"
import { Sparkles, Loader2, ImageIcon, Video } from "lucide-react"
import { Button } from "~/components/shadcn/ui/button"
import { Textarea } from "~/components/shadcn/ui/textarea"
import { CAMERA_GEAR_OPTIONS, getRemixVarietyLabel, useGenerationStore } from "~/lib/generation-store"
import type { GeneratedItem } from "~/lib/generation-store"
import { cn } from "~/lib/utils"
import { useState, useRef, useCallback } from "react"

// Types for async job responses
interface JobStatusResponse {
  jobId: string
  status: "pending" | "processing" | "completed" | "failed"
  message?: string
  error?: string
  progress?: number
  result?: {
    items: Array<{
      type: string
      url: string
    }>
  }
}

interface JobCreateResponse {
  jobId: string
  status: string
  message?: string
}

// Polling configuration
const POLL_INTERVAL = 2000 // 2 seconds
const MAX_POLL_ATTEMPTS = 150 // 5 minutes max (150 * 2s)

interface ActiveJob {
  jobId: string
  prompt: string
  abortController: AbortController
}

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
    referenceImage,
    selectedCameraGear,
    remixVariety,
  } = useGenerationStore()

  const [statusMessage, setStatusMessage] = useState<string>("")
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([])
  const activeJobsRef = useRef<ActiveJob[]>([])

  const currentModel = mediaType === "image" ? selectedImageModel : selectedVideoModel
  const cameraGearLabel = CAMERA_GEAR_OPTIONS.find((g) => g.value === selectedCameraGear)?.label ?? "Default"

  const pollJobStatus = useCallback(
    async (jobId: string, abortController: AbortController): Promise<JobStatusResponse> => {
      let attempts = 0

      while (attempts < MAX_POLL_ATTEMPTS) {
        attempts++

        try {
          const response = await fetch(`/api/generate/status/${jobId}`, {
            method: "GET",
            signal: abortController.signal,
          })

          const data = await response.json() as JobStatusResponse
          console.log("[v0] Poll response:", data)

          if (data.status === "completed") {
            setStatusMessage("Generation complete!")
            return data
          }

          if (data.status === "failed") {
            throw new Error(data.error || "Generation failed")
          }

          // Update status message for user feedback
          const progressText = data.progress ? ` (${data.progress}%)` : ""
          setStatusMessage(
            data.status === "processing" ? `Processing your request...${progressText}` : "Waiting in queue...",
          )

          // Wait before next poll
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            throw new Error("Generation cancelled")
          }
          throw error
        }
      }

      throw new Error("Generation timed out")
    },
    [],
  )

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    const currentPrompt = prompt
    setIsGenerating(true)
    setStatusMessage("Starting generation...")

    const abortController = new AbortController()
    const jobId = `temp-${Date.now()}`

    // Track this job
    const newJob: ActiveJob = { jobId, prompt: currentPrompt, abortController }
    activeJobsRef.current = [...activeJobsRef.current, newJob]
    setActiveJobs([...activeJobsRef.current])

    try {
      // Step 1: Create the generation job
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: currentPrompt,
          mediaType,
          model: currentModel.id,
          provider: currentModel.provider,
          // Image specific
          style: selectedStyle,
          size: selectedSize,
          aspectRatio: selectedAspectRatio,
          numberOfImages,
          referenceImage,
          cameraGear: selectedCameraGear,
          remixVariety,
          // Video specific
          duration: selectedDuration,
          quality: selectedQuality ?? "hd",
          videoAspectRatio: selectedVideoAspectRatio,
        }),
        signal: abortController.signal,
      })

      const jobData = await response.json() as JobCreateResponse
      console.log("[v0] Job created:", jobData)

      if (!jobData.jobId) {
        throw new Error("Failed to create generation job")
      }

      // Update job with real jobId
      const realJobId = jobData.jobId
      activeJobsRef.current = activeJobsRef.current.map((j) => (j.jobId === jobId ? { ...j, jobId: realJobId } : j))
      setActiveJobs([...activeJobsRef.current])

      setStatusMessage("Job created, waiting for processing...")

      // Step 2: Poll for completion
      const result = await pollJobStatus(realJobId, abortController)
      console.log("[v0] Final result:", result)

      const urls: string[] = []
      if (result.result?.items && Array.isArray(result.result.items)) {
        for (const item of result.result.items) {
          if (item.url) {
            urls.push(item.url)
          }
        }
      }

      console.log("[v0] Extracted URLs:", urls)

      if (urls.length > 0) {
        const newItems: GeneratedItem[] = urls.map((url: string, index: number) => ({
          id: `${Date.now()}-${index}`,
          type: mediaType,
          url,
          prompt: currentPrompt,
          model: currentModel.name,
          timestamp: new Date(),
          selected: false,
        }))
        console.log("[v0] Adding items:", newItems)
        addGeneratedItems(newItems)
      } else {
        console.log("[v0] No URLs found in result")
        setStatusMessage("No images returned from generation")
      }
    } catch (error) {
      console.error("[v0] Generation failed:", error)
      setStatusMessage(error instanceof Error ? error.message : "Generation failed")
    } finally {
      // Remove this job from active jobs
      activeJobsRef.current = activeJobsRef.current.filter((j) => j.prompt !== currentPrompt)
      setActiveJobs([...activeJobsRef.current])

      // Only set isGenerating to false if no more active jobs
      if (activeJobsRef.current.length === 0) {
        setIsGenerating(false)
      }

      // Clear status after a delay
      setTimeout(() => setStatusMessage(""), 3000)
    }
  }

  const handleCancel = () => {
    // Cancel all active jobs
    for (const job of activeJobsRef.current) {
      job.abortController.abort()
    }
    activeJobsRef.current = []
    setActiveJobs([])
    setIsGenerating(false)
    setStatusMessage("Generation cancelled")
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
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
              {selectedCameraGear !== "default" && (
                <>
                  <span>•</span>
                  <span className="text-amber-500">{cameraGearLabel}</span>
                </>
              )}
              {remixVariety !== 30 && (
                <>
                  <span>•</span>
                  <span className="text-purple-500">{getRemixVarietyLabel(remixVariety)}</span>
                </>
              )}
              {referenceImage && (
                <>
                  <span>•</span>
                  <span className="text-cyan-500">Ref Image</span>
                </>
              )}
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
              {referenceImage && (
                <>
                  <span>•</span>
                  <span className="text-cyan-500">Start Frame</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {referenceImage && (
        <div className="px-4 py-2 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2">
            <img
              src={referenceImage || "/placeholder.svg"}
              alt="Reference"
              className="w-12 h-12 rounded object-cover border border-border"
            />
            <span className="text-xs text-muted-foreground">
              {mediaType === "image" ? "Reference image attached" : "Start frame attached"}
            </span>
          </div>
        </div>
      )}

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

        {statusMessage && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            {isGenerating && <Loader2 className="w-3 h-3 animate-spin" />}
            <span>{statusMessage}</span>
          </div>
        )}

        {activeJobs.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {activeJobs.length} job{activeJobs.length > 1 ? "s" : ""} in progress
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">Enter</kbd> to
            generate or{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">Shift+Enter</kbd> for new
            line
          </p>
          <div className="flex items-center gap-2">
            {isGenerating && (
              <Button onClick={handleCancel} variant="outline" className="px-4 bg-transparent">
                Cancel
              </Button>
            )}
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim()}
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
    </div>
  )
}

"use client"

import { Button } from "~/components/shadcn/ui/button"
import { Loader2, Sparkles, RotateCcw } from "lucide-react"
import { useContentGenerator } from "~/hooks/use-content-generator"
import { useCredits } from "~/hooks/use-credits"

export function GenerateButton() {
  const { isGenerating, topic, handleGenerate, resetForm } = useContentGenerator()
  const { balance } = useCredits()
  return (
    <div className="p-5 border-t border-border">
      <div className="flex gap-2">
        <Button variant="outline" size="icon" onClick={resetForm} className="h-11 w-11 shrink-0 bg-transparent">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !topic.trim() || balance <= 0}
          className="flex-1 h-11 gap-2 text-sm font-medium"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Content
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

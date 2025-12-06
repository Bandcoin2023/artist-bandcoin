"use client"

import { Label } from "~/components/shadcn/ui/label"
import { Bot } from "lucide-react"
import { useContentGenerator } from "~/hooks/use-content-generator"

export function ModelSelector() {
  const { selectedModel, setSelectedModel } = useContentGenerator()

  return (
    <div className="space-y-2.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <Bot className="h-3.5 w-3.5" />
        AI Model
      </Label>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSelectedModel("openai")}
          className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${selectedModel === "openai" ? " bg-accent" : "border-border hover:border-primary/50"
            }`}
        >
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <span className="text-xs font-bold text-emerald-500">GPT</span>
          </div>
          <div className="text-left">
            <div className="text-sm font-medium">OpenAI</div>
            <div className="text-xs text-muted-foreground">GPT-4 Turbo</div>
          </div>
        </button>
        <button
          onClick={() => setSelectedModel("google")}
          className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${selectedModel === "google" ? " bg-accent" : "border-border hover:border-primary/50"
            }`}
        >
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <span className="text-xs font-bold text-blue-500">G</span>
          </div>
          <div className="text-left">
            <div className="text-sm font-medium">Google AI</div>
            <div className="text-xs text-muted-foreground">Gemini Pro</div>
          </div>
        </button>
      </div>
    </div>
  )
}

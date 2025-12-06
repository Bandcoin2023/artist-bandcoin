"use client"

import { Label } from "~/components/shadcn/ui/label"
import { Textarea } from "~/components/shadcn/ui/textarea"
import { Wand2 } from "lucide-react"
import { useContentGenerator } from "~/hooks/use-content-generator"

export function TopicInput() {
  const { topic, setTopic, contentMode } = useContentGenerator()

  return (
    <div className="space-y-2.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <Wand2 className="h-3.5 w-3.5" />
        Topic / Theme
      </Label>
      <Textarea
        placeholder={
          contentMode === "seo"
            ? "e.g., Complete guide to Next.js 15 features..."
            : "e.g., Announcing our new AI product launch..."
        }
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        className="min-h-[90px] resize-none text-sm"
      />
    </div>
  )
}

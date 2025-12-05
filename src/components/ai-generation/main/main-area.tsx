"use client"

import { PromptInput } from "./prompt-input"
import { ContentGrid } from "./content-grid"

export function MainArea() {
  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Prompt Input */}
      <div className="p-4 border-b border-border">
        <PromptInput />
      </div>

      {/* Content Grid */}
      <ContentGrid />
    </main>
  )
}

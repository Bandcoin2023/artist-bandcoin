"use client"
import { PromptInput } from "./prompt-input"
import { ContentPreview } from "./content-preview"

export function MainArea() {
  return (
    <main className="flex-1 flex flex-col  overflow-hidden  px-2 h-[calc(100vh-10.8vh)]">


      <ContentPreview />
    </main>
  )
}

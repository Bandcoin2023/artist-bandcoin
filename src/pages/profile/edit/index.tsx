"use client"

import { useMemo, useState } from "react"
import {
  EditorShellHeader,
  type EditorViewportType,
} from "~/components/profile-editor/editor-shell-header"
import { IframePreview } from "~/components/profile-editor/iframe-preview"

export default function ProfileEditorPage() {
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [viewportType, setViewportType] = useState<EditorViewportType>("responsive")

  const previewSrc = useMemo(() => {
    const params = new URLSearchParams({
      selection: isSelectionMode ? "1" : "0",
      preview: isPreviewMode ? "1" : "0",
    })

    return `/profile/edit/preview?${params.toString()}`
  }, [isSelectionMode, isPreviewMode])

  return (
    <main className="h-full min-h-0 flex flex-col bg-background overflow-hidden">
      <EditorShellHeader
        isSelectionMode={isSelectionMode}
        onToggleSelectionMode={() => setIsSelectionMode((prev) => !prev)}
        viewportType={viewportType}
        onViewportTypeChange={setViewportType}
        isPreviewMode={isPreviewMode}
        onTogglePreviewMode={() => setIsPreviewMode((prev) => !prev)}
      />

      <IframePreview viewportType={viewportType} previewSrc={previewSrc} />
    </main>
  )
}

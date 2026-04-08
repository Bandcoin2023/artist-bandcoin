"use client"

import { useMemo, useState } from "react"
import {
  EditorShellHeader,
  type EditorViewportType,
} from "~/components/profile-editor/editor-shell-header"
import { IframePreview } from "~/components/profile-editor/iframe-preview"
import type { PreviewToParentMessage } from "~/components/profile-editor/lib/communication"

export default function ProfileEditorPage() {
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [viewportType, setViewportType] = useState<EditorViewportType>("responsive")
  const [isPreviewReady, setIsPreviewReady] = useState(false)
  const [isPreviewDirty, setIsPreviewDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveRequestId, setSaveRequestId] = useState(0)

  const previewSrc = useMemo(() => {
    const params = new URLSearchParams({
      selection: isSelectionMode ? "1" : "0",
      preview: isPreviewMode ? "1" : "0",
    })

    return `/profile/edit/preview?${params.toString()}`
  }, [isSelectionMode, isPreviewMode])

  const handlePreviewMessage = (message: PreviewToParentMessage) => {
    if (message.type === "READY") {
      setIsPreviewReady(true)
      return
    }

    if (message.type === "DIRTY_STATE") {
      setIsPreviewDirty(message.dirty)
      return
    }

    if (message.type === "SAVE_STATE") {
      if (message.status === "saving") {
        setIsSaving(true)
        return
      }

      if (message.status === "saved") {
        setIsSaving(false)
        setIsPreviewDirty(false)
        return
      }

      if (message.status === "error") {
        setIsSaving(false)
      }
    }
  }

  const canSave = isPreviewReady && isPreviewDirty && !isSaving
  const handleSave = () => {
    if (!canSave) return
    setSaveRequestId((prev) => prev + 1)
  }

  return (
    <main className="h-full min-h-0 flex flex-col bg-background overflow-hidden">
      <EditorShellHeader
        isSelectionMode={isSelectionMode}
        onToggleSelectionMode={() => setIsSelectionMode((prev) => !prev)}
        viewportType={viewportType}
        onViewportTypeChange={setViewportType}
        isPreviewMode={isPreviewMode}
        onTogglePreviewMode={() => setIsPreviewMode((prev) => !prev)}
        canSave={canSave}
        isSaving={isSaving}
        onSave={handleSave}
      />

      <IframePreview
        viewportType={viewportType}
        previewSrc={previewSrc}
        saveRequestId={saveRequestId}
        onPreviewMessage={handlePreviewMessage}
      />
    </main>
  )
}

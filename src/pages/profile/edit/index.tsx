"use client"

import { useState } from "react"
import {
  EditorShellHeader,
} from "~/components/profile-editor/editor-shell-header"
import { IframePreview } from "~/components/profile-editor/iframe-preview"
import type { PreviewToParentMessage } from "~/components/profile-editor/lib/communication"
import { useProfileEditorStore } from "~/components/profile-editor/store/editor-store"

export default function ProfileEditorPage() {
  const isSelectionMode = useProfileEditorStore((state) => state.isSelectionMode)
  const isPreviewMode = useProfileEditorStore((state) => state.isPreviewMode)
  const viewportType = useProfileEditorStore((state) => state.viewportType)
  const setSelectionMode = useProfileEditorStore((state) => state.setSelectionMode)
  const setPreviewMode = useProfileEditorStore((state) => state.setPreviewMode)
  const setViewportType = useProfileEditorStore((state) => state.setViewportType)
  const [isPreviewReady, setIsPreviewReady] = useState(false)
  const [isPreviewDirty, setIsPreviewDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveRequestId, setSaveRequestId] = useState(0)

  const previewSrc = "/profile/edit/preview"

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
        onToggleSelectionMode={() => setSelectionMode(!isSelectionMode)}
        viewportType={viewportType}
        onViewportTypeChange={setViewportType}
        isPreviewMode={isPreviewMode}
        onTogglePreviewMode={() => setPreviewMode(!isPreviewMode)}
        canSave={canSave}
        isSaving={isSaving}
        onSave={handleSave}
      />

      <IframePreview
        viewportType={viewportType}
        isSelectionMode={isSelectionMode}
        isPreviewMode={isPreviewMode}
        previewSrc={previewSrc}
        saveRequestId={saveRequestId}
        onPreviewMessage={handlePreviewMessage}
      />
    </main>
  )
}

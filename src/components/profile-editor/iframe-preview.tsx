"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { EditorViewportType } from "~/components/profile-editor/editor-shell-header"
import {
  PROFILE_EDITOR_MESSAGE_SOURCE,
  type PreviewToParentMessage,
  isPreviewToParentMessage,
} from "~/components/profile-editor/lib/communication"

type IframePreviewProps = {
  viewportType: EditorViewportType
  previewSrc: string
  saveRequestId: number
  onPreviewMessage?: (message: PreviewToParentMessage) => void
}

export function IframePreview({
  viewportType,
  previewSrc,
  saveRequestId,
  onPreviewMessage,
}: IframePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [wrapperDimensions, setWrapperDimensions] = useState({
    width: 0,
    height: 0,
  })

  const iframeWidth = useMemo(() => {
    if (viewportType === "desktop") return 1280
    if (viewportType === "mobile") return 375
    return null
  }, [viewportType])

  useEffect(() => {
    if (iframeWidth === null) return

    const wrapper = wrapperRef.current
    if (!wrapper) return

    const updateDimensions = () => {
      setWrapperDimensions({
        width: wrapper.clientWidth,
        height: wrapper.clientHeight,
      })
    }

    updateDimensions()

    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(wrapper)

    return () => resizeObserver.disconnect()
  }, [iframeWidth])

  const containerStyle = useMemo(() => {
    if (iframeWidth === null) {
      return {
        width: "100%",
        height: "100%",
      }
    }

    const { width: wrapperWidth, height: wrapperHeight } = wrapperDimensions

    if (iframeWidth > wrapperWidth && wrapperWidth > 0) {
      const scale = wrapperWidth / iframeWidth
      return {
        width: `${iframeWidth}px`,
        height: `${wrapperHeight / scale}px`,
        transform: `scale(${scale})`,
        transformOrigin: "top center",
      }
    }

    return {
      width: `${iframeWidth}px`,
      height: `${wrapperHeight}px`,
    }
  }, [iframeWidth, wrapperDimensions])

  useEffect(() => {
    if (saveRequestId <= 0) return

    const targetWindow = iframeRef.current?.contentWindow
    if (!targetWindow) return

    targetWindow.postMessage(
      {
        source: PROFILE_EDITOR_MESSAGE_SOURCE,
        type: "REQUEST_SAVE",
        requestId: saveRequestId,
      },
      window.location.origin,
    )
  }, [saveRequestId])

  useEffect(() => {
    const targetWindow = iframeRef.current?.contentWindow
    if (!targetWindow) return

    targetWindow.postMessage(
      {
        source: PROFILE_EDITOR_MESSAGE_SOURCE,
        type: "SET_VIEWPORT",
        viewport: viewportType,
      },
      window.location.origin,
    )
  }, [viewportType])

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      if (!isPreviewToParentMessage(event.data)) return

      if (event.data.type === "READY" && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            source: PROFILE_EDITOR_MESSAGE_SOURCE,
            type: "SET_VIEWPORT",
            viewport: viewportType,
          },
          window.location.origin,
        )
      }

      onPreviewMessage?.(event.data)
    }

    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [onPreviewMessage, viewportType])

  return (
    <div className="flex-1 overflow-hidden size-full">
      <div
        ref={wrapperRef}
        className="size-full flex justify-center items-start min-w-0 overflow-hidden relative"
      >
        <div
          className="overflow-hidden absolute bg-background border-x border-black/10"
          style={containerStyle}
        >
          <iframe
            ref={iframeRef}
            src={previewSrc}
            className="border-none"
            style={{
              width: iframeWidth ? `${iframeWidth}px` : "100%",
              height: "100%",
            }}
            title="Profile Preview"
          />
        </div>
      </div>
    </div>
  )
}

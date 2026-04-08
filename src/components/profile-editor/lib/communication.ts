export const PROFILE_EDITOR_MESSAGE_SOURCE = "artist-bandcoin-profile-editor"

export type ParentToPreviewMessage = {
  source: typeof PROFILE_EDITOR_MESSAGE_SOURCE
} & (
  | {
      type: "REQUEST_SAVE"
      requestId: number
    }
  | {
      type: "SET_VIEWPORT"
      viewport: "responsive" | "desktop" | "mobile"
    }
  | {
      type: "SET_COVER_HEIGHT"
      viewport: "responsive" | "desktop" | "mobile"
      height: number
    }
)

export type PreviewSaveStatus = "saving" | "saved" | "error"

export type PreviewToParentMessage =
  | {
      source: typeof PROFILE_EDITOR_MESSAGE_SOURCE
      type: "READY"
    }
  | {
      source: typeof PROFILE_EDITOR_MESSAGE_SOURCE
      type: "DIRTY_STATE"
      dirty: boolean
    }
  | {
      source: typeof PROFILE_EDITOR_MESSAGE_SOURCE
      type: "SAVE_STATE"
      status: PreviewSaveStatus
      requestId: number
      message?: string
    }
  | {
      source: typeof PROFILE_EDITOR_MESSAGE_SOURCE
      type: "COVER_HEIGHT_STATE"
      coverHeightDefault: number
      coverHeightDesktop: number
      coverHeightMobile: number
    }

export function isParentToPreviewMessage(data: unknown): data is ParentToPreviewMessage {
  if (!data || typeof data !== "object") return false
  const value = data as Record<string, unknown>

  return (
    value.source === PROFILE_EDITOR_MESSAGE_SOURCE &&
    ((value.type === "REQUEST_SAVE" && typeof value.requestId === "number") ||
      (value.type === "SET_VIEWPORT" &&
        (value.viewport === "responsive" ||
          value.viewport === "desktop" ||
          value.viewport === "mobile")) ||
      (value.type === "SET_COVER_HEIGHT" &&
        (value.viewport === "responsive" ||
          value.viewport === "desktop" ||
          value.viewport === "mobile") &&
        typeof value.height === "number"))
  )
}

export function isPreviewToParentMessage(data: unknown): data is PreviewToParentMessage {
  if (!data || typeof data !== "object") return false
  const value = data as Record<string, unknown>

  if (value.source !== PROFILE_EDITOR_MESSAGE_SOURCE || typeof value.type !== "string") {
    return false
  }

  if (value.type === "READY") return true

  if (value.type === "DIRTY_STATE") {
    return typeof value.dirty === "boolean"
  }

  if (value.type === "SAVE_STATE") {
    const validStatus =
      value.status === "saving" || value.status === "saved" || value.status === "error"
    return validStatus && typeof value.requestId === "number"
  }

  if (value.type === "COVER_HEIGHT_STATE") {
    return (
      typeof value.coverHeightDefault === "number" &&
      typeof value.coverHeightDesktop === "number" &&
      typeof value.coverHeightMobile === "number"
    )
  }

  return false
}

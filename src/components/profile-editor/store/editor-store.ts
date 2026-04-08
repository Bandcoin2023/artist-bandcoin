import { create } from "zustand"

export type EditorViewportType = "responsive" | "desktop" | "mobile"

export type ProfileEditorSelection =
  | {
      kind: "section"
      sectionId: string
    }
  | {
      kind: "container"
      sectionId: string
      containerId: string
    }
  | null

type ProfileEditorState = {
  isSelectionMode: boolean
  isPreviewMode: boolean
  viewportType: EditorViewportType
  selectedOverlay: ProfileEditorSelection
  setSelectionMode: (value: boolean) => void
  setPreviewMode: (value: boolean) => void
  setViewportType: (value: EditorViewportType) => void
  setSelectedOverlay: (value: ProfileEditorSelection) => void
  setStateFromSync: (input: {
    isSelectionMode: boolean
    isPreviewMode: boolean
    viewportType: EditorViewportType
  }) => void
}

export const useProfileEditorStore = create<ProfileEditorState>((set) => ({
  isSelectionMode: true,
  isPreviewMode: false,
  viewportType: "responsive",
  selectedOverlay: null,
  setSelectionMode: (value) => set({ isSelectionMode: value }),
  setPreviewMode: (value) => set({ isPreviewMode: value }),
  setViewportType: (value) => set({ viewportType: value }),
  setSelectedOverlay: (value) => set({ selectedOverlay: value }),
  setStateFromSync: (input) =>
    set({
      isSelectionMode: input.isSelectionMode,
      isPreviewMode: input.isPreviewMode,
      viewportType: input.viewportType,
    }),
}))

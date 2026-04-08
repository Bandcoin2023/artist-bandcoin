import { create } from "zustand"

export type EditorViewportType = "responsive" | "desktop" | "mobile"

type ProfileEditorState = {
  isSelectionMode: boolean
  isPreviewMode: boolean
  viewportType: EditorViewportType
  setSelectionMode: (value: boolean) => void
  setPreviewMode: (value: boolean) => void
  setViewportType: (value: EditorViewportType) => void
  setStateFromSync: (input: {
    isSelectionMode: boolean
    isPreviewMode: boolean
    viewportType: EditorViewportType
  }) => void
}

export const useProfileEditorStore = create<ProfileEditorState>((set) => ({
  isSelectionMode: false,
  isPreviewMode: false,
  viewportType: "responsive",
  setSelectionMode: (value) => set({ isSelectionMode: value }),
  setPreviewMode: (value) => set({ isPreviewMode: value }),
  setViewportType: (value) => set({ viewportType: value }),
  setStateFromSync: (input) =>
    set({
      isSelectionMode: input.isSelectionMode,
      isPreviewMode: input.isPreviewMode,
      viewportType: input.viewportType,
    }),
}))

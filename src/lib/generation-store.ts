import { create } from "zustand"
import type { ImageModelConfig, VideoModelConfig } from "./models-config"
import { IMAGE_MODELS, VIDEO_MODELS } from "./models-config"

export type MediaType = "image" | "video"

export interface GeneratedItem {
  id: string
  type: MediaType
  url: string
  prompt: string
  model: string
  timestamp: Date
  selected: boolean
}

interface GenerationState {
  // Media type
  mediaType: MediaType
  setMediaType: (type: MediaType) => void

  // Image settings
  selectedImageModel: ImageModelConfig
  setSelectedImageModel: (model: ImageModelConfig) => void
  promptEnhance: string
  setPromptEnhance: (value: string) => void
  selectedStyle: string
  setSelectedStyle: (style: string) => void
  selectedAspectRatio: string
  setSelectedAspectRatio: (ratio: string) => void
  selectedSize: string
  setSelectedSize: (size: string) => void
  numberOfImages: number
  setNumberOfImages: (count: number) => void

  // Video settings
  selectedVideoModel: VideoModelConfig
  setSelectedVideoModel: (model: VideoModelConfig) => void
  selectedDuration: number
  setSelectedDuration: (duration: number) => void
  selectedQuality: string
  setSelectedQuality: (quality: string) => void
  selectedVideoAspectRatio: string
  setSelectedVideoAspectRatio: (ratio: string) => void

  // Generation
  prompt: string
  setPrompt: (prompt: string) => void
  isGenerating: boolean
  setIsGenerating: (value: boolean) => void
  generatedItems: GeneratedItem[]
  addGeneratedItems: (items: GeneratedItem[]) => void
  toggleItemSelection: (id: string) => void
  selectedItem: GeneratedItem | null
  setSelectedItem: (item: GeneratedItem | null) => void

  // Reset
  resetToDefaults: () => void
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  // Media type
  mediaType: "image",
  setMediaType: (type) => set({ mediaType: type }),

  // Image settings
  selectedImageModel: IMAGE_MODELS[0],
  setSelectedImageModel: (model) =>
    set({
      selectedImageModel: model,
      selectedStyle: model.capabilities.styles?.[0] ?? "Dynamic",
      selectedAspectRatio: model.capabilities.aspectRatios[0],
      selectedSize: model.capabilities.sizes[0].value,
      numberOfImages: 1,
    }),
  promptEnhance: "Auto",
  setPromptEnhance: (value) => set({ promptEnhance: value }),
  selectedStyle: "Dynamic",
  setSelectedStyle: (style) => set({ selectedStyle: style }),
  selectedAspectRatio: "1:1",
  setSelectedAspectRatio: (ratio) => set({ selectedAspectRatio: ratio }),
  selectedSize: "1024x1024",
  setSelectedSize: (size) => set({ selectedSize: size }),
  numberOfImages: 1,
  setNumberOfImages: (count) => set({ numberOfImages: count }),

  // Video settings
  selectedVideoModel: VIDEO_MODELS[0],
  setSelectedVideoModel: (model) =>
    set({
      selectedVideoModel: model,
      selectedDuration: model.capabilities.durations[0],
      selectedQuality: model.capabilities.qualities?.[0]?.label ?? "",
      selectedVideoAspectRatio: model.capabilities.aspectRatios[0],
    }),
  selectedDuration: 4,
  setSelectedDuration: (duration) => set({ selectedDuration: duration }),
  selectedQuality: "Quality",
  setSelectedQuality: (quality) => set({ selectedQuality: quality }),
  selectedVideoAspectRatio: "16:9",
  setSelectedVideoAspectRatio: (ratio) => set({ selectedVideoAspectRatio: ratio }),

  // Generation
  prompt: "",
  setPrompt: (prompt) => set({ prompt }),
  isGenerating: false,
  setIsGenerating: (value) => set({ isGenerating: value }),
  generatedItems: [],
  addGeneratedItems: (items) =>
    set((state) => ({
      generatedItems: [...items, ...state.generatedItems],
    })),
  toggleItemSelection: (id) =>
    set((state) => ({
      generatedItems: state.generatedItems.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item,
      ),
    })),
  selectedItem: null,
  setSelectedItem: (item) => set({ selectedItem: item }),

  // Reset
  resetToDefaults: () => {
    const type = get().mediaType
    if (type === "image") {
      set({
        selectedImageModel: IMAGE_MODELS[0],
        promptEnhance: "Auto",
        selectedStyle: IMAGE_MODELS[0].capabilities.styles?.[0] ?? "Dynamic",
        selectedAspectRatio: IMAGE_MODELS[0].capabilities.aspectRatios[0],
        selectedSize: IMAGE_MODELS[0].capabilities.sizes[0].value,
        numberOfImages: 1,
      })
    } else {
      set({
        selectedVideoModel: VIDEO_MODELS[0],
        selectedDuration: VIDEO_MODELS[0].capabilities.durations[0],
        selectedQuality: VIDEO_MODELS[0].capabilities.qualities?.[0]?.label ?? "",
        selectedVideoAspectRatio: VIDEO_MODELS[0].capabilities.aspectRatios[0],
      })
    }
  },
}))

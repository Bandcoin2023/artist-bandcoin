import { create } from "zustand"
import type { ImageModelConfig, VideoModelConfig } from "~/lib/models-config"
import { IMAGE_MODELS, VIDEO_MODELS } from "~/lib/models-config"

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

export const CAMERA_GEAR_OPTIONS = [
  { value: "default", label: "Default", description: "No specific camera style" },
  { value: "nikon-z9", label: "Nikon Z9", description: "Professional mirrorless, sharp details" },
  { value: "canon-r5", label: "Canon EOS R5", description: "High resolution, vibrant colors" },
  { value: "sony-a7rv", label: "Sony A7R V", description: "Outstanding dynamic range" },
  { value: "dji-mavic", label: "DJI Mavic 3", description: "Aerial drone photography" },
  { value: "gopro-hero", label: "GoPro Hero 12", description: "Action camera, wide angle" },
  { value: "hasselblad", label: "Hasselblad X2D", description: "Medium format, exceptional detail" },
  { value: "leica-m11", label: "Leica M11", description: "Classic rangefinder, timeless look" },
  { value: "fujifilm-gfx", label: "Fujifilm GFX 100S", description: "Medium format, film simulation" },
  { value: "phase-one", label: "Phase One IQ4", description: "Ultra high resolution, studio" },
  { value: "red-v-raptor", label: "RED V-RAPTOR", description: "Cinema camera, cinematic look" },
  { value: "arri-alexa", label: "ARRI ALEXA 35", description: "Film industry standard" },
]

interface GenerationState {
  // Media type
  mediaType: MediaType
  setMediaType: (type: MediaType) => void
  activeItemId: string | null
  setActiveItemId: (id: string | null) => void
  // Provider selection
  selectedProvider: "openai" | "google"
  setSelectedProvider: (provider: "openai" | "google") => void
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

  selectedCameraGear: string
  setSelectedCameraGear: (gear: string) => void

  remixVariety: number
  setRemixVariety: (value: number) => void

  referenceImage: string | null
  setReferenceImage: (image: string | null) => void

  // Video settings
  selectedVideoModel: VideoModelConfig
  setSelectedVideoModel: (model: VideoModelConfig) => void
  selectedDuration: string
  setSelectedDuration: (duration: string) => void
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

  shouldGenerate: boolean
  setShouldGenerate: (value: boolean) => void

  // Reset
  resetToDefaults: () => void
}

export function getRemixVarietyLabel(value: number): string {
  if (value <= 20) return "Precision"
  if (value <= 40) return "Subtle"
  if (value <= 60) return "Balanced"
  if (value <= 80) return "Creative"
  return "Wild"
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  // Media type
  mediaType: "image",
  setMediaType: (type) => set({ mediaType: type }),
  activeItemId: null,
  setActiveItemId: (id: string | null) => set({ activeItemId: id }),

  // Provider selection
  selectedProvider: "openai",
  setSelectedProvider: (provider) => {
    const type = get().mediaType
    if (type === "image") {
      const providerModels = IMAGE_MODELS.filter((m) => m.provider === provider)
      const model = providerModels[0]!
      set({
        selectedProvider: provider,
        selectedImageModel: model,
        selectedStyle: model.capabilities.styles?.[0] ?? "Dynamic",
        selectedAspectRatio: model.capabilities.aspectRatios[0]!,
        selectedSize: model.capabilities.sizes[0]!.value,
        numberOfImages: 1,
      })
    } else {
      const providerModels = VIDEO_MODELS.filter((m) => m.provider === provider)
      const model = providerModels[0]!
      set({
        selectedProvider: provider,
        selectedVideoModel: model,
        selectedDuration: model.capabilities.durations[0]!,
        selectedQuality: model.capabilities.qualities?.[0]?.label ?? "hd",
        selectedVideoAspectRatio: model.capabilities.aspectRatios[0]!,
      })
    }
  },

  // Image settings
  selectedImageModel: IMAGE_MODELS[0]!,
  setSelectedImageModel: (model) =>
    set({
      selectedImageModel: model,
      selectedProvider: model.provider,
      selectedStyle: model.capabilities.styles?.[0] ?? "Dynamic",
      selectedAspectRatio: model.capabilities.aspectRatios[0]!,
      selectedSize: model.capabilities.sizes[0]!.value,
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

  selectedCameraGear: "default",
  setSelectedCameraGear: (gear) => set({ selectedCameraGear: gear }),

  remixVariety: 30,
  setRemixVariety: (value) => set({ remixVariety: value }),

  referenceImage: null,
  setReferenceImage: (image) => set({ referenceImage: image }),

  // Video settings
  selectedVideoModel: VIDEO_MODELS[0]!,
  setSelectedVideoModel: (model) =>
    set({
      selectedVideoModel: model,
      selectedProvider: model.provider,
      selectedDuration: model.capabilities.durations[0]!,
      selectedQuality: model.capabilities.qualities?.[0]?.label ?? "hd",
      selectedVideoAspectRatio: model.capabilities.aspectRatios[0]!,
    }),
  selectedDuration: "4",
  setSelectedDuration: (duration) => set({ selectedDuration: duration }),
  selectedQuality: "hd",
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
    set((state) => {
      const newItems = [...items, ...state.generatedItems]
      return {
        generatedItems: newItems,
        activeItemId: items.length > 0 ? items[0]?.id : state.activeItemId,
      }
    }),
  toggleItemSelection: (id) =>
    set((state) => ({
      generatedItems: state.generatedItems.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item,
      ),
    })),
  selectedItem: null,
  setSelectedItem: (item) => set({ selectedItem: item }),

  shouldGenerate: false,
  setShouldGenerate: (value) => set({ shouldGenerate: value }),

  // Reset
  resetToDefaults: () => {
    const type = get().mediaType
    if (type === "image") {
      set({
        selectedImageModel: IMAGE_MODELS[0]!,
        selectedProvider: IMAGE_MODELS[0]!.provider,
        promptEnhance: "Auto",
        selectedStyle: IMAGE_MODELS[0]!.capabilities.styles?.[0] ?? "Dynamic",
        selectedAspectRatio: IMAGE_MODELS[0]!.capabilities.aspectRatios[0]!,
        selectedSize: IMAGE_MODELS[0]!.capabilities.sizes[0]!.value,
        numberOfImages: 1,
        selectedCameraGear: "default",
        remixVariety: 30,
        referenceImage: null,
        activeItemId: null,
      })
    } else {
      set({
        selectedVideoModel: VIDEO_MODELS[0]!,
        selectedProvider: VIDEO_MODELS[0]!.provider,
        selectedDuration: VIDEO_MODELS[0]!.capabilities.durations[0]!,
        selectedQuality: VIDEO_MODELS[0]!.capabilities.qualities?.[0]?.label ?? "",
        selectedVideoAspectRatio: VIDEO_MODELS[0]!.capabilities.aspectRatios[0]!,
        referenceImage: null,
        activeItemId: null,
      })
    }
  },
}))

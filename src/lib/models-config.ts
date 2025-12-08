// Configuration for all AI models with their capabilities

import { VideoSeconds } from "openai/resources/videos"

export type MediaType = "image" | "video"

export interface ImageModelConfig {
  id: string
  name: string
  provider: "openai" | "google"
  description: string
  thumbnail: string
  features: string[]
  isNew?: boolean
  capabilities: {
    hasPromptEnhance: boolean
    hasStyles: boolean
    styles?: string[]
    aspectRatios: string[]
    sizes: { label: string; value: string; dimensions: string }[]
    maxImages: number
  }
}

export interface VideoModelConfig {
  id: string
  name: string
  provider: "openai" | "google"
  description: string
  thumbnail: string
  features: string[]
  isNew?: boolean
  capabilities: {
    durations: VideoSeconds[]
    hasQuality: boolean
    qualities?: { label: string; resolution: string }[]
    aspectRatios: string[]
  }
}

export const IMAGE_STYLES = [
  "Dynamic",
  "3D Render",
  "Graphic Design 3D",
  "Fashion",
  "Game Concept",
  "Photorealistic",
  "Anime",
  "Cinematic",
  "Abstract",
  "Watercolor",
  "Oil Painting",
  "Sketch",
]

export const IMAGE_MODELS: ImageModelConfig[] = [
  {
    id: "dall-e-3",
    name: "DALL-E 3",
    provider: "openai",
    description: "High-quality image generation with excellent prompt adherence",
    thumbnail: "/model/openai-dall-e-abstract-art.jpg",
    features: ["Style Ref", "Content Ref"],
    isNew: true,
    capabilities: {
      hasPromptEnhance: true,
      hasStyles: true,
      styles: IMAGE_STYLES,
      aspectRatios: ["1:1", "16:9", "9:16"],
      sizes: [
        { label: "Small", value: "1024x1024", dimensions: "1024×1024" },
        { label: "Medium", value: "1792x1024", dimensions: "1792×1024" },
        { label: "Large", value: "1024x1792", dimensions: "1024×1792" },
      ],
      maxImages: 4,
    },
  },
  {
    id: "dall-e-2",
    name: "DALL-E 2",
    provider: "openai",
    description: "Fast image generation with good quality",
    thumbnail: "/model/openai-dall-e-2-digital-art.jpg",
    features: ["Image Ref"],
    capabilities: {
      hasPromptEnhance: true,
      hasStyles: true,
      styles: IMAGE_STYLES,
      aspectRatios: ["1:1"],
      sizes: [
        { label: "Small", value: "256x256", dimensions: "256×256" },
        { label: "Medium", value: "512x512", dimensions: "512×512" },
        { label: "Large", value: "1024x1024", dimensions: "1024×1024" },
      ],
      maxImages: 10,
    },
  },
  {
    id: "nano-banana",
    name: "Nano Banana",
    provider: "google",
    description: "Google's most advanced image generation model",
    thumbnail: "/model/google-imagen-abstract-colorful.jpg",
    features: ["Image Ref", "Style Ref"],
    isNew: true,
    capabilities: {
      hasPromptEnhance: true,
      hasStyles: true,
      styles: IMAGE_STYLES,
      aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
      sizes: [
        { label: "Small", value: "1024x1024", dimensions: "1024×1024" },
        { label: "Medium", value: "2048x2048", dimensions: "2048×2048" },
        { label: "Large", value: "4096x4096", dimensions: "4096×4096" },
      ],
      maxImages: 4,
    },
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    provider: "google",
    description: "Fast turnaround for image concepts and visuals",
    thumbnail: "/model/google-imagen-fast-lightning.jpg",
    features: ["Fast"],
    isNew: true,
    capabilities: {
      hasPromptEnhance: false,
      hasStyles: true,
      styles: IMAGE_STYLES.slice(0, 6),
      aspectRatios: ["1:1", "16:9"],
      sizes: [
        { label: "Small", value: "512x512", dimensions: "512×512" },
        { label: "Medium", value: "1024x1024", dimensions: "1024×1024" },
      ],
      maxImages: 8,
    },
  },
]

export const VIDEO_MODELS: VideoModelConfig[] = [
  {
    id: "sora-2-pro",
    name: "Sora 2 Pro",
    provider: "openai",
    description: "For smooth, cinematic sequences with refined detail and motion",
    thumbnail: "/model/openai-sora-cinematic-clouds-sunset.jpg",
    features: ["Start Frame"],
    isNew: false,
    capabilities: {
      durations: ["4", "8", "12"],
      hasQuality: true,
      qualities: [
        { label: "standard", resolution: "720p" },
        { label: "hd", resolution: "1080p" },
      ],
      aspectRatios: ["16:9", "9:16"],
    },
  },
  {
    id: "sora-2",
    name: "Sora 2",
    provider: "openai",
    description: "Everyday video and steady multi-shot continuity with audio",
    thumbnail: "/model/openai-sora-video-clouds-sky.jpg",
    features: ["Start Frame", "Audio"],
    isNew: false,
    capabilities: {
      durations: ["4", "8", "12"],
      hasQuality: false,
      aspectRatios: ["16:9", "9:16"],
    },
  },
  {
    id: "veo-3",
    name: "Veo 3",
    provider: "google",
    description: "Sharper start and end frames. Smoother cinematic storytelling",
    thumbnail: "/model/google-veo-cinematic-earth-space.jpg",
    features: ["Start Frame", "End Frame", "Image Reference", "Audio"],
    isNew: true,
    capabilities: {
      durations: ["4", "8"],
      hasQuality: true,
      qualities: [
        { label: "standard", resolution: "720p" },
        { label: "hd", resolution: "1080p" },
      ],
      aspectRatios: ["16:9", "9:16"],
    },
  },
  {
    id: "veo-3-fast",
    name: "Veo 3 Fast",
    provider: "google",
    description: "Designed for fast-turnaround video concepts and visuals",
    thumbnail: "/model/google-veo-fast-abstract-fluid.jpg",
    features: ["Fast", "Start Frame", "End Frame", "Audio"],
    isNew: true,
    capabilities: {
      durations: ["4", "8"],
      hasQuality: false,
      aspectRatios: ["16:9", "9:16"],
    },
  },
]

export function getImageModel(id: string): ImageModelConfig | undefined {
  return IMAGE_MODELS.find((m) => m.id === id)
}

export function getVideoModel(id: string): VideoModelConfig | undefined {
  return VIDEO_MODELS.find((m) => m.id === id)
}

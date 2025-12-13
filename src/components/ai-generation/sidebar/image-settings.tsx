"use client"

import type React from "react"

import {
  ChevronDown,
  HelpCircle,
  Sparkles,
  Palette,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Grid3X3,
  ImageIcon,
  Camera,
  Shuffle,
  Upload,
  X,
} from "lucide-react"
import { cn } from "~/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/shadcn/ui/select"
import { CAMERA_GEAR_OPTIONS, getRemixVarietyLabel, useGenerationStore } from "~/lib/generation-store"
import { Slider } from "~/components/shadcn/ui/slider"
import { useRef } from "react"


export function ImageSettings() {
  const {
    selectedImageModel,
    promptEnhance,
    setPromptEnhance,
    selectedStyle,
    setSelectedStyle,
    selectedAspectRatio,
    setSelectedAspectRatio,
    selectedSize,
    setSelectedSize,
    numberOfImages,
    setNumberOfImages,
    selectedCameraGear,
    setSelectedCameraGear,
    remixVariety,
    setRemixVariety,
    referenceImage,
    setReferenceImage,
  } = useGenerationStore()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { capabilities } = selectedImageModel

  const aspectRatioIcons: Record<string, React.ReactNode> = {
    "2:3": <RectangleVertical className="w-4 h-4" />,
    "1:1": <Square className="w-4 h-4" />,
    "16:9": <RectangleHorizontal className="w-4 h-4" />,
    "9:16": <RectangleVertical className="w-4 h-4" />,
    "4:3": <RectangleHorizontal className="w-4 h-4" />,
    "3:4": <RectangleVertical className="w-4 h-4" />,
    Custom: <Grid3X3 className="w-4 h-4" />,
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setReferenceImage(reader.result as string)
        console.log("Reference image set", reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveReference = () => {
    setReferenceImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-5">
      {
        selectedImageModel.id === "dall-e-2" ?
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Reference Image</span>
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

            {referenceImage ? (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img src={referenceImage || "/placeholder.svg"} alt="Reference" className="w-full h-32 object-cover" />
                <button
                  onClick={handleRemoveReference}
                  className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Upload reference image</span>
              </button>
            )}
          </div> : null
      }

      {/* Prompt Enhance */}
      {/* {capabilities.hasPromptEnhance && (
        <div>
          <Select value={promptEnhance} onValueChange={setPromptEnhance}>
            <SelectTrigger className="w-full bg-secondary border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">Prompt Enhance</span>
              </div>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Auto">Auto</SelectItem>
              <SelectItem value="On">On</SelectItem>
              <SelectItem value="Off">Off</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )} */}

      {/* Style */}
      {capabilities.hasStyles && capabilities.styles && (
        <div>
          <Select value={selectedStyle} onValueChange={setSelectedStyle}>
            <SelectTrigger className="w-full bg-secondary border-border">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">Style</span>
              </div>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {capabilities.styles.map((style) => (
                <SelectItem key={style} value={style}>
                  {style}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Camera className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground">Camera Gear</span>
        </div>
        <Select value={selectedCameraGear} onValueChange={setSelectedCameraGear}>
          <SelectTrigger className="w-full bg-secondary border-border">
            <SelectValue placeholder="Select camera" />
          </SelectTrigger>
          <SelectContent>
            {CAMERA_GEAR_OPTIONS.map((camera) => (
              <SelectItem key={camera.value} value={camera.value}>
                <div className="flex flex-col">
                  <span>{camera.label}</span>
                  <span className="text-xs text-muted-foreground">{camera.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shuffle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Remix Variety</span>
          </div>
          <span className="text-sm text-primary">{getRemixVarietyLabel(remixVariety)}</span>
        </div>
        <div className="px-1">
          <Slider
            value={[remixVariety]}
            onValueChange={(value) => value[0] !== undefined && setRemixVariety(value[0])}
            max={100}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">Precision</span>
            <span className="text-xs text-muted-foreground">Wild</span>
          </div>
        </div>
      </div>

      {/* Image Dimensions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-foreground">Image Dimensions</span>
          <span className="text-sm text-muted-foreground ml-auto">
            {capabilities.sizes.find((s) => s.value === selectedSize)?.dimensions ?? "1024 × 1024"}
          </span>
        </div>

        {/* Aspect Ratio Buttons */}
        <div className="flex gap-2 mb-3">
          {capabilities.aspectRatios.map((ratio) => (
            <button
              key={ratio}
              onClick={() => setSelectedAspectRatio(ratio)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-lg border transition-colors",
                selectedAspectRatio === ratio
                  ? "bg-accent"
                  : "bg-secondary border-border text-muted-foreground hover:border-muted-foreground",
              )}
            >
              {aspectRatioIcons[ratio] ?? <Square className="w-4 h-4" />}
              <span className="text-xs">{ratio}</span>
            </button>
          ))}
        </div>

        {/* Size Buttons */}
        <div className="flex gap-2">
          {capabilities.sizes.map((size) => (
            <button
              key={size.value}
              onClick={() => setSelectedSize(size.value)}
              className={cn(
                "flex-1 flex flex-col items-center py-2 px-3 rounded-lg border transition-colors",
                selectedSize === size.value
                  ? "bg-accent"
                  : "bg-secondary border-border text-muted-foreground hover:border-muted-foreground",
              )}
            >
              <span className="text-sm font-medium">{size.label}</span>
              <span className="text-xs opacity-70">{size.dimensions}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Number of Images */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-foreground">Number of images</span>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4]
            .filter((n) => n <= capabilities.maxImages)
            .map((num) => (
              <button
                key={num}
                onClick={() => setNumberOfImages(num)}
                className={cn(
                  "flex-1 py-2 rounded-lg border transition-colors text-sm font-medium",
                  numberOfImages === num
                    ? "bg-accent"
                    : "bg-secondary border-border text-muted-foreground hover:border-muted-foreground",
                )}
              >
                {num}
              </button>
            ))}
          {capabilities.maxImages > 4 && (
            <Select
              value={numberOfImages > 4 ? numberOfImages.toString() : ""}
              onValueChange={(v) => setNumberOfImages(Number.parseInt(v))}
            >
              <SelectTrigger className="flex-1 bg-secondary border-border">
                <ChevronDown className="w-4 h-4" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: capabilities.maxImages - 4 }, (_, i) => i + 5).map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  )
}

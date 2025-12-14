"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "~/components/shadcn/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/shadcn/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/shadcn/ui/popover"
import { NeonInput } from "../../components/neon-input"
import { useGenerationStore } from "~/lib/generation-store"
import { Home, Grid3x3, ImageIcon, Video, Sparkles, ChevronDown, Music, Text, Layers, Upload, Infinity, Coins } from "lucide-react"
import { useRouter } from "next/navigation"

import Aurora from "~/components/shadcn/Aurora"
import { Badge } from "~/components/shadcn/ui/badge"
import AISidebar from "~/components/layout/ai/ai-sidebar"

export default function AIGenerationPage() {
    const [isExpanded, setIsExpanded] = useState(false)
    const inputRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element
            // Don't close if clicking on popover content or select content
            if (
                target.closest('[data-radix-popper-content-wrapper]') ||
                target.closest('[data-radix-select-content]') ||
                target.closest('[data-radix-popover-content]')
            ) {
                return
            }
            if (inputRef.current && !inputRef.current.contains(target)) {
                setIsExpanded(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const {
        prompt,
        setPrompt,
        mediaType,
        setMediaType,
        selectedProvider,
        setSelectedProvider,
        selectedImageModel,
        selectedVideoModel,
        selectedAspectRatio,
        setSelectedAspectRatio,
        selectedVideoAspectRatio,
        setSelectedVideoAspectRatio,
        selectedStyle,
        setSelectedStyle,
        selectedSize,
        setSelectedSize,
        numberOfImages,
        setNumberOfImages,
        selectedDuration,
        setSelectedDuration,
        selectedQuality,
        setSelectedQuality,
    } = useGenerationStore()
    const router = useRouter()

    const creationModes = [
        { icon: ImageIcon, label: "Image", active: false, href: "/ai-generation", badge: "NEW" },
        { icon: Video, label: "Video", active: false, href: "/ai-generation", badge: "NEW" },
        { icon: Music, label: "Music", active: false, href: "/artist/studio" },
        { icon: Text, label: "Text", active: false, href: "/text-generation", badge: "NEW" },
    ]

    const currentModel = mediaType === "image" ? selectedImageModel : selectedVideoModel
    const aspectRatio = mediaType === "image" ? selectedAspectRatio : selectedVideoAspectRatio

    return (
        <div className="flex h-[calc(100vh-11vh)]  overflow-hidden relative">
            <AISidebar />

            {/* Main Content */}
            <main className="flex flex-col overflow-hidden h-full w-full">
                {/* Hero Section */}
                <div className="relative h-full w-full flex items-center justify-center overflow-hidden">
                    {/* Background Image */}


                    <div
                        className="absolute inset-0 bg-cover bg-center"

                    >
                        <Aurora

                            colorStops={["#DCDC2C", "#EDEECD", "#DCDC2C"]}
                            blend={0.5}
                            amplitude={1.0}
                            speed={0.5}
                        />
                    </div>

                    {/* Hero Content */}
                    <div className="relative z-10 w-full max-w-4xl px-8 flex flex-col items-center gap-8">
                        <h1 className="text-7xl font-bold text-accent text-balance text-center tracking-tight">
                            {"Let's Create"}
                        </h1>

                        {/* Prompt Input with Neon Effect */}
                        <div className="w-full" ref={inputRef}>
                            <NeonInput
                                placeholder="Type a prompt..."
                                value={prompt}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrompt(e.target.value)}
                                onFocus={() => setIsExpanded(true)}
                                isExpanded={isExpanded}
                            >
                                {isExpanded && (
                                    <div className="flex flex-col gap-6">
                                        {/* Provider Selection */}
                                        <div className="flex items-center justify-between pb-4 border-b border-border">
                                            <span className="text-sm font-medium text-muted-foreground">Provider</span>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant={selectedProvider === "openai" ? "default" : "ghost"}
                                                    size="sm"
                                                    onClick={() => setSelectedProvider("openai")}
                                                    className={
                                                        selectedProvider === "openai"
                                                            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-foreground"
                                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                                    }
                                                >
                                                    OpenAI
                                                </Button>
                                                <Button
                                                    variant={selectedProvider === "google" ? "default" : "ghost"}
                                                    size="sm"
                                                    onClick={() => setSelectedProvider("google")}
                                                    className={
                                                        selectedProvider === "google"
                                                            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-foreground"
                                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                                    }
                                                >
                                                    Google
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Media Type Toggle */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex gap-2">
                                                <Button
                                                    variant={mediaType === "image" ? "default" : "ghost"}
                                                    size="sm"
                                                    onClick={() => setMediaType("image")}
                                                    className={
                                                        mediaType === "image"
                                                            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-foreground"
                                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                                    }
                                                >
                                                    <ImageIcon className="w-4 h-4 mr-2" />
                                                    Image
                                                </Button>
                                                <Button
                                                    variant={mediaType === "video" ? "default" : "ghost"}
                                                    size="sm"
                                                    onClick={() => setMediaType("video")}
                                                    className={
                                                        mediaType === "video"
                                                            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-foreground"
                                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                                    }
                                                >
                                                    <Video className="w-4 h-4 mr-2" />
                                                    Video
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Settings Grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Aspect Ratio with Popover */}
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="bg-muted/50 hover:bg-muted justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Grid3x3 className="w-4 h-4" />
                                                            {aspectRatio}
                                                        </div>
                                                        <ChevronDown className="w-4 h-4 ml-2" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 bg-popover border-border">
                                                    <div className="space-y-4">
                                                        <h4 className="font-medium text-sm text-foreground">Aspect Ratio</h4>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {currentModel.capabilities.aspectRatios.map((ratio) => (
                                                                <Button
                                                                    key={ratio}
                                                                    variant={aspectRatio === ratio ? "default" : "outline"}
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        if (mediaType === "image") {
                                                                            setSelectedAspectRatio(ratio)
                                                                        } else {
                                                                            setSelectedVideoAspectRatio(ratio)
                                                                        }
                                                                    }}
                                                                    className={
                                                                        aspectRatio === ratio
                                                                            ? "bg-primary text-primary-foreground shadow-sm shadow-foreground"
                                                                            : "bg-muted/50 hover:bg-muted"
                                                                    }
                                                                >
                                                                    {ratio}
                                                                </Button>
                                                            ))}
                                                        </div>

                                                        {/* Image-specific settings */}
                                                        {mediaType === "image" && (
                                                            <>
                                                                <div className="space-y-2">
                                                                    <h4 className="font-medium text-sm text-foreground">Size</h4>
                                                                    <Select value={selectedSize} onValueChange={setSelectedSize}>
                                                                        <SelectTrigger className="bg-muted/50">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="bg-popover border-border">
                                                                            {selectedImageModel.capabilities.sizes.map((size) => (
                                                                                <SelectItem key={size.value} value={size.value}>
                                                                                    {size.label} - {size.dimensions}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <h4 className="font-medium text-sm text-foreground">Number of Images</h4>
                                                                    <Select
                                                                        value={numberOfImages.toString()}
                                                                        onValueChange={(val) => setNumberOfImages(Number(val))}
                                                                    >
                                                                        <SelectTrigger className="bg-muted/50">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="bg-popover border-border">
                                                                            {Array.from(
                                                                                { length: selectedImageModel.capabilities.maxImages },
                                                                                (_, i) => i + 1,
                                                                            ).map((num) => (
                                                                                <SelectItem key={num} value={num.toString()}>
                                                                                    {num} {num === 1 ? "image" : "images"}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* Video-specific settings */}
                                                        {mediaType === "video" && (
                                                            <>
                                                                <div className="space-y-2">
                                                                    <h4 className="font-medium text-sm text-foreground">Duration</h4>
                                                                    <Select
                                                                        value={selectedDuration}
                                                                        onValueChange={(val: string) => setSelectedDuration(val)}
                                                                    >
                                                                        <SelectTrigger className="bg-muted/50">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="bg-popover border-border">
                                                                            {selectedVideoModel.capabilities.durations.map((duration) => (
                                                                                <SelectItem key={duration} value={duration}>
                                                                                    {duration} seconds
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                {selectedVideoModel.capabilities.hasQuality && (
                                                                    <div className="space-y-2">
                                                                        <h4 className="font-medium text-sm text-foreground">Quality</h4>
                                                                        <Select value={selectedQuality} onValueChange={setSelectedQuality}>
                                                                            <SelectTrigger className="bg-muted/50">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent className="bg-popover border-border">
                                                                                {selectedVideoModel.capabilities.qualities?.map((quality) => (
                                                                                    <SelectItem key={quality.label} value={quality.label}>
                                                                                        {quality.label.toUpperCase()} - {quality.resolution}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>

                                            {/* Style Selection (Image only) */}
                                            {mediaType === "image" && selectedImageModel.capabilities.hasStyles && (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className="bg-muted/50 hover:bg-muted justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Sparkles className="w-4 h-4" />
                                                                {selectedStyle}
                                                            </div>
                                                            <ChevronDown className="w-4 h-4 ml-2" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-80 bg-popover border-border">
                                                        <div className="space-y-4">
                                                            <h4 className="font-medium text-sm text-foreground">Style</h4>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {selectedImageModel.capabilities.styles?.map((style) => (
                                                                    <Button
                                                                        key={style}
                                                                        variant={selectedStyle === style ? "default" : "outline"}
                                                                        size="sm"
                                                                        onClick={() => setSelectedStyle(style)}
                                                                        className={
                                                                            selectedStyle === style
                                                                                ? "bg-primary text-primary-foreground shadow-sm shadow-foreground"
                                                                                : "bg-muted/50 hover:bg-muted"
                                                                        }
                                                                    >
                                                                        {style}
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            )}
                                        </div>

                                        {/* Generate Button */}
                                        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-foreground mt-4">
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Generate{" "}
                                            {mediaType === "image"
                                                ? `${numberOfImages} ${numberOfImages === 1 ? "Image" : "Images"}`
                                                : "Video"}
                                        </Button>
                                    </div>
                                )}
                            </NeonInput>
                        </div>
                    </div>

                </div>
                <div className="flex items-center justify-center gap-8 py-8">
                    {creationModes.map((mode, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                if (mode.href) {
                                    router.push(mode.href)
                                }
                            }}
                            className="relative flex flex-col items-center gap-2 transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center ">
                                <mode.icon className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-medium">{mode.label}</span>
                            {mode.badge && (
                                <Badge className="absolute -top-1 -right-1 text-[9px] px-1.5 py-0 h-4 bg-accent text-white">
                                    {mode.badge}
                                </Badge>
                            )}
                        </button>
                    ))}
                </div>
            </main>
        </div>
    )
}

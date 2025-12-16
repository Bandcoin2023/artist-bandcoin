import type { NextApiRequest, NextApiResponse } from "next"
import { verifySignature } from "@upstash/qstash/nextjs"
import { updateJob } from "~/lib/qstash"
import OpenAI from "openai"
import { createPartFromUri, createUserContent, GoogleGenAI } from "@google/genai"
import type { VideoModel, VideoSeconds, VideoSize } from "openai/resources/videos"
import { env } from "~/env"
import { S3UploadService } from "~/lib/s3-upload.service"
import { db } from "~/server/db"
import { getToken } from "next-auth/jwt"

export const config = {
    api: {
        bodyParser: false,
    },
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface GeneratedItemResult {
    url: string
    type: "image" | "video"
}

interface ProcessJobRequest {
    jobId: string
    prompt: string
    mediaType: "image" | "video"
    model: string
    provider: "openai" | "google"
    style?: string
    size?: string
    aspectRatio?: string
    numberOfImages: number
    referenceImage?: string
    cameraGear?: string
    remixVariety?: number
    duration?: VideoSeconds
    quality?: "hd" | "standard"
    videoAspectRatio?: string
    userId: string
}

interface ProcessJobResult {
    success: boolean
    items: GeneratedItemResult[]
}

interface PixelSizeResult {
    width: number
    height: number
    dalleSize: string
}

type DallESize = "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792"

type Dalle2Size = "256x256" | "512x512" | "1024x1024"

// ============================================================================
// CONSTANTS
// ============================================================================

const CAMERA_GEAR_PROMPTS: Record<string, string> = {
    default: "",
    "nikon-z9": "shot on Nikon Z9, professional mirrorless camera, sharp details, excellent autofocus",
    "canon-r5": "shot on Canon EOS R5, high resolution 45MP, vibrant colors, excellent dynamic range",
    "sony-a7rv": "shot on Sony A7R V, 61MP full-frame, outstanding dynamic range, precise autofocus",
    "dji-mavic": "aerial drone photography, shot on DJI Mavic 3, Hasselblad camera, wide aerial view",
    "gopro-hero": "action camera shot, GoPro Hero 12, ultra wide angle, high frame rate, immersive POV",
    hasselblad: "shot on Hasselblad X2D 100C, medium format, exceptional detail, studio quality",
    "leica-m11": "shot on Leica M11, classic rangefinder aesthetic, timeless film-like quality",
    "fujifilm-gfx": "shot on Fujifilm GFX 100S, medium format, beautiful film simulation colors",
    "phase-one": "shot on Phase One IQ4 150MP, ultra high resolution, studio photography",
    "red-v-raptor": "cinematic shot, RED V-RAPTOR 8K, film-like motion blur, Hollywood production quality",
    "arri-alexa": "shot on ARRI ALEXA 35, film industry standard, natural skin tones, cinematic look",
}

const DALLE_SIZES: Record<string, string> = {
    "1:1": "1024x1024",
    "2:3": "1024x1792",
    "3:2": "1792x1024",
    "16:9": "1792x1024",
    "9:16": "1024x1792",
}

// Pricing tables - Updated December 2024
const DALL_E2_PRICES: Record<string, number> = {
    "256x256": 0.016,
    "512x512": 0.018,
    "1024x1024": 0.02,
}

const DALL_E3_PRICES: Record<string, Record<string, number>> = {
    standard: {
        "1024x1024": 0.04,
        "1024x1792": 0.08,
        "1792x1024": 0.08,
    },
    hd: {
        "1024x1024": 0.08,
        "1024x1792": 0.12,
        "1792x1024": 0.12,
    },
}

// Google Imagen 4 pricing (per image)
const IMAGEN_PRICES: Record<string, number> = {
    "imagen-4": 0.04,           // Standard Imagen 4
    "imagen-4-ultra": 0.06,     // Ultra quality
    "imagen-3": 0.039,          // Legacy Imagen 3
}

// OpenAI Sora pricing (per second of video)
const SORA_PRICES: Record<string, number> = {
    "sora-2": 0.10,         // $0.10 per second
    "sora-2-pro": 0.10,     // Same pricing for Pro model
}

// Google Veo pricing (per second of video)
// Based on Vertex AI official pricing and recent updates
const VEO_PRICES: Record<string, { videoOnly: number; withAudio: number }> = {
    "veo-2": {
        videoOnly: 0.35,    // Gemini API pricing (30% cheaper than Vertex)
        withAudio: 0.50,    // Vertex AI pricing
    },
    "veo-3": {
        videoOnly: 0.50,    // Video only
        withAudio: 0.75,    // Video with native audio
    },
    "veo-3-fast": {
        videoOnly: 0.10,    // Fast variant - optimized for speed and cost
        withAudio: 0.15,    // Fast variant with audio
    },
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function getRawBody(req: NextApiRequest): Promise<string> {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
    }
    return Buffer.concat(chunks).toString("utf-8")
}

function getRemixSettings(variety: number): {
    temperature: number
    description: string
} {
    if (variety <= 20)
        return {
            temperature: 0.3,
            description: "with high precision and accuracy to the prompt",
        }
    if (variety <= 40) return { temperature: 0.5, description: "with subtle creative variations" }
    if (variety <= 60)
        return {
            temperature: 0.7,
            description: "with balanced creativity and accuracy",
        }
    if (variety <= 80)
        return {
            temperature: 0.9,
            description: "with creative artistic interpretation",
        }
    return {
        temperature: 1.2,
        description: "with wild imaginative and artistic interpretation",
    }
}

function extractBase64FromDataUrl(dataUrl: string): { base64: string; mimeType: string } | null {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (match?.[1] && match[2]) {
        return { mimeType: match[1], base64: match[2] }
    }
    return null
}

function getPixelSizeFromAspectRatio(aspectRatio: string, baseSize: string): PixelSizeResult {
    const baseDim = Number.parseInt(baseSize?.split("x")[0] ?? "1024", 10)

    const aspectDimensions: Record<string, { width: number; height: number }> = {
        "1:1": { width: baseDim, height: baseDim },
        "2:3": { width: Math.round(baseDim * 0.67), height: baseDim },
        "3:2": { width: baseDim, height: Math.round(baseDim * 0.67) },
        "16:9": { width: baseDim, height: Math.round(baseDim * 0.5625) },
        "9:16": { width: Math.round(baseDim * 0.5625), height: baseDim },
    }

    return {
        ...(aspectDimensions[aspectRatio] ?? { width: 1024, height: 1024 }),
        dalleSize: DALLE_SIZES[aspectRatio] ?? "1024x1024",
    }
}

// Helper function to record credit transactions
async function recordCreditTransaction(
    userId: string,
    amount: number,
    description: string
): Promise<void> {
    try {
        await db.creditBalance.update({
            where: { userId },
            data: { balance: { decrement: amount } },
        })
        await db.creditTransaction.create({
            data: {
                userId,
                amount,
                type: "USAGE",
                description,
            },
        })
    } catch (error) {
        console.error("Error recording credit transaction:", error)
        throw new Error("Failed to record credit transaction")
    }
}

// ============================================================================
// PROMPT ENHANCEMENT FUNCTIONS
// ============================================================================

function buildEnhancedImagePrompt(params: {
    prompt: string
    style?: string
    cameraGear?: string
    remixVariety?: number
    hasReferenceImage?: boolean
}): string {
    const { prompt, style, cameraGear, remixVariety, hasReferenceImage } = params

    let enhancedPrompt = prompt

    // Add style prefix for images
    if (style && style !== "Dynamic" && style !== "Auto" && style !== "default") {
        enhancedPrompt = `${style} style: ${enhancedPrompt}`
    }

    // Add camera gear style for photographic images
    const cameraPrompt = cameraGear ? CAMERA_GEAR_PROMPTS[cameraGear] : ""
    if (cameraPrompt) {
        enhancedPrompt = `${enhancedPrompt}, ${cameraPrompt}`
    }

    // Add remix variety description
    if (remixVariety !== undefined && remixVariety !== 30) {
        const remixSettings = getRemixSettings(remixVariety)
        enhancedPrompt = `${enhancedPrompt}, ${remixSettings.description}`
    }

    // Add reference context hint
    if (hasReferenceImage) {
        enhancedPrompt = `Using the provided reference image as style and composition inspiration: ${enhancedPrompt}`
    }

    // Add image-specific quality enhancers
    enhancedPrompt = `${enhancedPrompt}, high quality, detailed, professional`

    return enhancedPrompt
}

function buildEnhancedVideoPrompt(params: {
    prompt: string
    style?: string
    cameraGear?: string
    remixVariety?: number
    duration?: VideoSeconds
}): string {
    const { prompt, style, cameraGear, remixVariety, duration } = params

    let enhancedPrompt = prompt

    // Add cinematic style prefix for videos
    if (style && style !== "Dynamic" && style !== "Auto" && style !== "default") {
        enhancedPrompt = `${style} cinematic style: ${enhancedPrompt}`
    }

    // Add camera movement and cinematography for videos
    const cameraPrompt = cameraGear ? CAMERA_GEAR_PROMPTS[cameraGear] : ""
    if (cameraPrompt) {
        // For videos, emphasize motion and cinematic qualities
        enhancedPrompt = `${enhancedPrompt}, ${cameraPrompt}, smooth camera movement`
    }

    // Add remix variety description
    if (remixVariety !== undefined && remixVariety !== 30) {
        const remixSettings = getRemixSettings(remixVariety)
        enhancedPrompt = `${enhancedPrompt}, ${remixSettings.description}`
    }

    // Add duration context for pacing
    if (duration) {
        const pacingHint = duration <= "5" ? "fast-paced action" : "smooth flowing motion"
        enhancedPrompt = `${enhancedPrompt}, ${pacingHint}`
    }

    // Add video-specific quality enhancers
    enhancedPrompt = `${enhancedPrompt}, cinematic lighting, smooth motion, high quality video, professional cinematography`

    return enhancedPrompt
}

// ============================================================================
// CLIENT INITIALIZATION
// ============================================================================

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null
const googleAI = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null

// ============================================================================
// IMAGE GENERATION HANDLERS
// ============================================================================

async function generateOpenAIImage(
    params: ProcessJobRequest,
    enhancedPrompt: string,
    pixelSize: PixelSizeResult,
): Promise<GeneratedItemResult[]> {
    const items: GeneratedItemResult[] = []
    const { model, numberOfImages, quality, referenceImage, style, userId, size } = params

    if (model === "dall-e-3") {
        const dalleSize = pixelSize.dalleSize as keyof typeof DALL_E3_PRICES.standard
        const selectedQuality = quality === "hd" ? "hd" : "standard"

        for (let i = 0; i < numberOfImages; i++) {
            const response = await openai!.images.generate({
                model: "dall-e-3",
                prompt: enhancedPrompt,
                n: 1,
                size: dalleSize,
                quality: selectedQuality,
                style: style === "vivid" ? "vivid" : "natural",
            })

            if (response.data?.[0]?.url) {
                items.push({ url: response.data[0].url, type: "image" })

                // Calculate and charge cost
                const qualityPrices = DALL_E3_PRICES[selectedQuality]
                const cost = qualityPrices?.[dalleSize] ?? 0.04
                await recordCreditTransaction(
                    userId,
                    cost,
                    `Generated image using DALL-E 3 (${selectedQuality}, ${dalleSize})`
                )
            }
        }
    } else {
        // DALL-E 2
        const dalle2Size: Dalle2Size =
            size === "256x256" ? "256x256" : size === "512x512" ? "512x512" : "1024x1024"

        if (referenceImage) {
            const imageData = extractBase64FromDataUrl(referenceImage)
            if (imageData) {
                const imageBuffer = Buffer.from(imageData.base64, "base64")

                for (let i = 0; i < Math.min(numberOfImages, 10); i++) {
                    try {
                        const response = await openai!.images.createVariation({
                            image: new File([imageBuffer], "reference.png", { type: imageData.mimeType }),
                            n: 1,
                            size: dalle2Size,
                        })

                        if (response.data?.[0]?.url) {
                            items.push({ url: response.data[0].url, type: "image" })

                            const cost = DALL_E2_PRICES[dalle2Size] ?? 0.02
                            await recordCreditTransaction(
                                userId,
                                cost,
                                `Generated image variation using DALL-E 2 (${dalle2Size})`
                            )
                        }
                    } catch (varError) {
                        console.error("Variation error, falling back:", varError)

                        // Fallback generation
                        const fallbackResponse = await openai!.images.generate({
                            model: "dall-e-2",
                            prompt: enhancedPrompt,
                            n: 1,
                            size: dalle2Size,
                        })

                        if (fallbackResponse.data?.[0]?.url) {
                            items.push({ url: fallbackResponse.data[0].url, type: "image" })

                            const cost = DALL_E2_PRICES[dalle2Size] ?? 0.02
                            await recordCreditTransaction(
                                userId,
                                cost,
                                `Generated fallback image using DALL-E 2 (${dalle2Size})`
                            )
                        }
                    }
                }
            } else {
                // Reference image not readable
                const response = await openai!.images.generate({
                    model: "dall-e-2",
                    prompt: enhancedPrompt,
                    n: Math.min(numberOfImages, 10),
                    size: dalle2Size,
                })

                for (const img of response.data) {
                    if (img.url) {
                        items.push({ url: img.url, type: "image" })

                        const cost = DALL_E2_PRICES[dalle2Size] ?? 0.02
                        await recordCreditTransaction(
                            userId,
                            cost,
                            `Generated image using DALL-E 2 (${dalle2Size})`
                        )
                    }
                }
            }
        } else {
            // Normal DALL-E 2 generation
            const response = await openai!.images.generate({
                model: "dall-e-2",
                prompt: enhancedPrompt,
                n: Math.min(numberOfImages, 10),
                size: dalle2Size,
            })

            for (const img of response.data) {
                if (img.url) {
                    items.push({ url: img.url, type: "image" })

                    const cost = DALL_E2_PRICES[dalle2Size] ?? 0.02
                    await recordCreditTransaction(
                        userId,
                        cost,
                        `Generated image using DALL-E 2 (${dalle2Size})`
                    )
                }
            }
        }
    }

    return items
}

async function generateGoogleImage(params: ProcessJobRequest, enhancedPrompt: string): Promise<GeneratedItemResult[]> {
    const items: GeneratedItemResult[] = []
    const { model, numberOfImages, aspectRatio, referenceImage, userId } = params
    console.log("generateGoogleImage called with userId:", userId)

    if (!googleAI) {
        throw new Error("Google AI client not initialized - GEMINI_API_KEY missing")
    }

    // Determine which Imagen model to use
    const imagenModel =
        model === "imagen-3" || model === "imagen-3-fast" || model === "imagen-pro"
            ? "imagen-4.0-generate-001"
            : "imagen-4.0-generate-001"

    // Map aspect ratios to Google's format
    const aspectRatioMap: Record<string, string> = {
        "1:1": "1:1",
        "2:3": "2:3",
        "3:2": "3:2",
        "16:9": "16:9",
        "9:16": "9:16",
    }

    const googleAspectRatio = aspectRatioMap[aspectRatio ?? "1:1"] ?? "1:1"

    // Determine pricing based on model
    const cost = IMAGEN_PRICES[model] ?? IMAGEN_PRICES["imagen-4"]

    // Generate images sequentially
    for (let i = 0; i < numberOfImages; i++) {
        try {
            const config = {
                numberOfImages: 1,
                aspectRatio: googleAspectRatio,
            }

            const response = await googleAI.models.generateImages({
                model: imagenModel,
                prompt: enhancedPrompt,
                config,
            })

            // Process the generated image
            if (response.generatedImages?.[0]?.image) {
                const imageData = response.generatedImages[0].image

                // Check if we have base64 encoded image data
                if (imageData.imageBytes) {
                    // Convert bytes to base64 data URL and upload to S3
                    const awsURL = await S3UploadService.uploadBase64Image(
                        imageData.imageBytes,
                        imageData.mimeType ?? "image/png",
                    )

                    items.push({ url: awsURL, type: "image" })

                    // Record credit transaction
                    await recordCreditTransaction(
                        userId,
                        cost,
                        `Generated image using ${model} (${googleAspectRatio})`
                    )

                    // Optional: Count tokens for logging
                    try {
                        const countTokensResponse = await googleAI.models.countTokens({
                            model: imagenModel,
                            contents: createUserContent([
                                enhancedPrompt,
                                createPartFromUri(awsURL, imageData.mimeType ?? "image/png"),
                            ]),
                        })
                        console.log("Total tokens used:", countTokensResponse.totalTokens)
                    } catch (tokenError) {
                        console.warn("Token counting failed:", tokenError)
                    }
                }
            }

            // Add small delay between requests to avoid rate limiting
            if (i < numberOfImages - 1) {
                await new Promise((resolve) => setTimeout(resolve, 1000))
            }
        } catch (error) {
            console.error(`Google Imagen generation error for image ${i + 1}:`, error)
            throw error
        }
    }

    return items
}

// ============================================================================
// VIDEO GENERATION HANDLERS
// ============================================================================

async function generateOpenAIVideo(params: ProcessJobRequest, enhancedPrompt: string, userId: string): Promise<GeneratedItemResult[]> {
    const items: GeneratedItemResult[] = []
    const { model, aspectRatio, duration } = params

    const sizeForAspect: VideoSize = aspectRatio === "9:16" ? "720x1280" : "1280x720"
    const soraModel: VideoModel = model === "sora-2-pro" ? "sora-2-pro" : "sora-2"

    const video = await openai!.videos.create({
        model: soraModel,
        prompt: enhancedPrompt,
        size: sizeForAspect,
        seconds: duration,
    })

    // Poll for completion
    let completed = false
    let attempts = 0
    const maxAttempts = 60

    while (!completed && attempts < maxAttempts) {
        const response = await openai!.videos.retrieve(video.id)

        if (response.status === "completed") {
            completed = true
            const content = await openai!.videos.downloadContent(response.id)

            if (content.ok) {
                const arrayBuffer = await content.arrayBuffer()
                const base64 = Buffer.from(arrayBuffer).toString("base64")
                const awsURL = await S3UploadService.uploadBase64Image(
                    base64,
                    "video/mp4",
                )
                items.push({
                    url: awsURL,
                    type: "video",
                })

                // Calculate cost based on duration
                const videoDuration = Number.parseInt(duration ?? "5", 10)
                const costPerSecond = SORA_PRICES[model] ?? SORA_PRICES["sora-2"] ?? 0.1
                const totalCost = costPerSecond * videoDuration

                await recordCreditTransaction(
                    userId,
                    totalCost,
                    `Generated ${videoDuration}s video using ${model} (${sizeForAspect})`
                )
            }
        } else if (response.status === "failed") {
            throw new Error("Video generation failed")
        }

        attempts++
        if (!completed) {
            await new Promise((resolve) => setTimeout(resolve, 10000))
        }
    }

    if (!completed) {
        throw new Error("Video generation timed out")
    }

    return items
}

async function generateGoogleVideo(params: ProcessJobRequest, enhancedPrompt: string, userId: string): Promise<GeneratedItemResult[]> {
    const items: GeneratedItemResult[] = []
    const { aspectRatio, model } = params

    if (!googleAI) {
        throw new Error("Google AI client not initialized - GEMINI_API_KEY missing")
    }

    // Determine which Veo model to use based on model name
    let veoModelName = "veo-3.0-generate-001"
    let modelKey = "veo-3"
    const hasAudio = true

    if (model === "veo-3-fast") {
        veoModelName = "veo-3.0-fast-generate-001"
        modelKey = "veo-3-fast"
    } else if (model === "veo-2") {
        veoModelName = "veo-2.0-generate-001"
        modelKey = "veo-2"
    }

    const veoOptions = {
        model: veoModelName,
        prompt: enhancedPrompt,
        config: {
            aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9",
            numberOfVideos: 1,
        },
    }

    let operation = await googleAI.models.generateVideos(veoOptions)

    // Poll for completion
    let attempts = 0
    const maxAttempts = 60

    while (!operation.done && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 10000))
        operation = await googleAI.operations.getVideosOperation({
            operation,
        })
        attempts++
    }

    if (operation.done && operation.response?.generatedVideos?.[0]?.video) {
        const videoFile = operation.response.generatedVideos[0].video

        if (videoFile.uri) {
            console.log("Generated video URI:", videoFile.uri)
            items.push({
                url: videoFile.uri,
                type: "video",
            })

            // Veo typically generates 8-second videos by default
            const estimatedDuration = 8

            // Get pricing based on model and audio
            const pricing = VEO_PRICES[modelKey] ?? VEO_PRICES["veo-3"]
            const costPerSecond = hasAudio ? (pricing?.withAudio ?? 0.75) : (pricing?.videoOnly ?? 0.50)
            const totalCost = costPerSecond * estimatedDuration

            await recordCreditTransaction(
                userId,
                totalCost,
                `Generated ~${estimatedDuration}s video using ${model} (${aspectRatio}, ${hasAudio ? 'with audio' : 'video only'})`
            )
        }
    }

    return items
}

// ============================================================================
// MAIN PROCESS JOB FUNCTION
// ============================================================================

async function processJob(body: ProcessJobRequest): Promise<ProcessJobResult> {
    const { jobId, prompt, mediaType, provider, style, size, aspectRatio, cameraGear, remixVariety, duration, userId } = body

    await updateJob(jobId, {
        status: "processing",
        message: "Starting generation...",
        progress: 10,
    })

    const pixelSize = getPixelSizeFromAspectRatio(aspectRatio ?? "1:1", size ?? "1024x1024")

    let items: GeneratedItemResult[] = []

    try {
        if (mediaType === "image") {
            await updateJob(jobId, {
                message: "Generating images...",
                progress: 20,
            })

            const enhancedPrompt = buildEnhancedImagePrompt({
                prompt,
                style,
                cameraGear,
                remixVariety,
                hasReferenceImage: !!body.referenceImage,
            })

            if (provider === "openai" && openai) {
                items = await generateOpenAIImage(body, enhancedPrompt, pixelSize)
            } else if (provider === "google" && googleAI) {
                items = await generateGoogleImage(body, enhancedPrompt)
            }
        } else if (mediaType === "video") {
            await updateJob(jobId, {
                message: "Generating video...",
                progress: 20,
            })

            const enhancedPrompt = buildEnhancedVideoPrompt({
                prompt,
                style,
                cameraGear,
                remixVariety,
                duration,
            })

            if (provider === "openai" && openai) {
                items = await generateOpenAIVideo(body, enhancedPrompt, userId)
            } else if (provider === "google" && googleAI) {
                items = await generateGoogleVideo(body, enhancedPrompt, userId)
            }
        }

        // Fallback placeholder if no items generated
        if (items.length === 0) {
            console.warn("No items generated, adding placeholder")
        }

        await updateJob(jobId, {
            status: "completed",
            message: "Generation complete!",
            progress: 100,
            result: { items },
        })

        return { success: true, items }
    } catch (error) {
        console.error(`${mediaType} generation error:`, error)

        await updateJob(jobId, {
            status: "failed",
            message: error instanceof Error ? error.message : "Generation failed",
            progress: 100,
            result: { items },
        })

        throw error
    }
}

// ============================================================================
// API HANDLER
// ============================================================================

async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" })
        return
    }

    try {
        let body: ProcessJobRequest

        if (req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
            body = req.body
        } else {
            const rawBody = await getRawBody(req)
            body = JSON.parse(rawBody)
        }


        if (!body.jobId) {
            res.status(400).json({ error: "Missing jobId in request body" })
            return
        }

        await processJob(body)

        res.json({ success: true })
    } catch (error) {
        console.error("Process handler error:", error)
        res.status(500).json({
            error: error instanceof Error ? error.message : "Processing failed",
        })
    }
}

export default process.env.NODE_ENV === "development" ? handler : verifySignature(handler)
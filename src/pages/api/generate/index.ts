import type { NextApiRequest, NextApiResponse } from "next"
import OpenAI from "openai"
import { GoogleGenerativeAI } from "@google/generative-ai"

const openai = process.env.NEXT_PUBLIC_OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY }) : null

const googleAI = process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY ? new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY) : null

// Type for generated items
interface GeneratedItemResult {
  url: string
  type: "image" | "video"
}

async function pollOpenAIVideo(videoId: string, maxAttempts = 60): Promise<{ status: string; id: string } | null> {
  if (!openai) return null

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`https://api.openai.com/v1/videos/${videoId}`, {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        console.error("Video polling failed:", response.statusText)
        return null
      }

      const video = await response.json()

      if (video.status === "completed") {
        return video
      } else if (video.status === "failed") {
        console.error("Video generation failed:", video)
        return null
      }
    } catch (error) {
      console.error("Polling error:", error)
    }

    await new Promise((resolve) => setTimeout(resolve, 10000))
  }

  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    return res.status(200).json({
      message: "AI Generation API",
      endpoints: {
        POST: "Generate images or videos",
        status: "GET /api/generate/status?videoId=...&provider=...",
      },
    })
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { prompt, mediaType, model, provider, style, size, aspectRatio, numberOfImages, duration, quality } = req.body

    const items: GeneratedItemResult[] = []

    if (mediaType === "image") {
      if (provider === "openai") {
        if (!openai) {
          return res.status(500).json({ error: "OpenAI API key not configured" })
        }

        try {
          type DallESize = "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792"

          const sizeMap: Record<string, DallESize> = {
            "256x256": "256x256",
            "512x512": "512x512",
            "1024x1024": "1024x1024",
            "1792x1024": "1792x1024",
            "1024x1792": "1024x1792",
          }

          const enhancedPrompt = style && style !== "Dynamic" ? `${style} style: ${prompt}` : prompt

          const selectedSize: DallESize = sizeMap[size] || "1024x1024"

          if (model === "dall-e-3") {
            for (let i = 0; i < numberOfImages; i++) {
              const response = await openai.images.generate({
                model: "dall-e-3",
                prompt: enhancedPrompt,
                n: 1,
                size: selectedSize,
                quality: quality === "hd" ? "hd" : "standard",
              })

              if (response.data) {
                for (const img of response.data) {
                  if (img.url) {
                    items.push({ url: img.url, type: "image" })
                  }
                }
              }
            }
          } else {
            const dalle2Size: "256x256" | "512x512" | "1024x1024" =
              size === "256x256" ? "256x256" : size === "512x512" ? "512x512" : "1024x1024"

            const response = await openai.images.generate({
              model: "dall-e-2",
              prompt: enhancedPrompt ?? "",
              n: Math.min(numberOfImages, 10),
              size: dalle2Size,
            })

            if (response.data) {
              for (const img of response.data) {
                if (img.url) {
                  items.push({ url: img.url, type: "image" })
                }
              }
            }
          }
        } catch (error) {
          console.error("OpenAI image generation error:", error)
          for (let i = 0; i < numberOfImages; i++) {
            items.push({
              url: `/placeholder.svg?height=1024&width=1024&query=${encodeURIComponent(prompt + " " + (style || ""))}`,
              type: "image",
            })
          }
        }
      } else if (provider === "google") {
        if (!googleAI) {
          return res.status(500).json({ error: "Google AI API key not configured" })
        }

        try {
          const enhancedPrompt = style && style !== "Dynamic" ? `Create an image in ${style} style: ${prompt}` : prompt

          const geminiModel = googleAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp-image-generation",
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
          })

          for (let i = 0; i < numberOfImages; i++) {
            try {
              const result = await geminiModel.generateContent(enhancedPrompt)
              const response = result.response

              if (response.candidates && response.candidates[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                  const partAny = part as any
                  if (partAny.inlineData?.data) {
                    const base64Data = partAny.inlineData.data
                    const mimeType = partAny.inlineData.mimeType || "image/png"
                    items.push({
                      url: `data:${mimeType};base64,${base64Data}`,
                      type: "image",
                    })
                  }
                }
              }
            } catch (innerError) {
              console.error("Single image generation error:", innerError)
            }
          }

          if (items.length === 0) {
            for (let i = 0; i < numberOfImages; i++) {
              items.push({
                url: `/placeholder.svg?height=1024&width=1024&query=${encodeURIComponent(prompt + " " + (style || ""))}`,
                type: "image",
              })
            }
          }
        } catch (error) {
          console.error("Google AI image generation error:", error)
          for (let i = 0; i < numberOfImages; i++) {
            items.push({
              url: `/placeholder.svg?height=1024&width=1024&query=${encodeURIComponent(prompt + " " + (style || ""))}`,
              type: "image",
            })
          }
        }
      }
    } else if (mediaType === "video") {
      if (provider === "openai") {
        if (!openai) {
          return res.status(500).json({ error: "OpenAI API key not configured" })
        }

        try {
          const sizeForAspect = aspectRatio === "9:16" ? "720x1280" : "1280x720"
          const soraModel = model === "sora-2-pro" ? "sora-2-pro" : "sora-2"

          const createResponse = await fetch("https://api.openai.com/v1/videos", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: soraModel,
              prompt: prompt,
              size: sizeForAspect,
              seconds: duration || 8,
            }),
          })

          if (!createResponse.ok) {
            throw new Error(`Failed to create video: ${createResponse.statusText}`)
          }

          const videoJob = await createResponse.json()
          const completedVideo = await pollOpenAIVideo(videoJob.id)

          if (completedVideo) {
            const contentResponse = await fetch(`https://api.openai.com/v1/videos/${completedVideo.id}/content`, {
              headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              },
            })

            if (contentResponse.ok) {
              const arrayBuffer = await contentResponse.arrayBuffer()
              const base64 = Buffer.from(arrayBuffer).toString("base64")
              items.push({
                url: `data:video/mp4;base64,${base64}`,
                type: "video",
              })
            } else {
              throw new Error("Failed to download video content")
            }
          } else {
            throw new Error("Video generation timed out or failed")
          }
        } catch (error) {
          console.error("OpenAI video generation error:", error)
          items.push({
            url: `/placeholder.svg?height=720&width=1280&query=${encodeURIComponent(prompt + " video frame")}`,
            type: "video",
          })
        }
      } else if (provider === "google") {
        if (!googleAI) {
          return res.status(500).json({ error: "Google AI API key not configured" })
        }

        try {
          const veoEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/veo-002:generateVideo"

          const response = await fetch(veoEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || "",
            },
            body: JSON.stringify({
              prompt: prompt,
              aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9",
              durationSeconds: duration || 6,
            }),
          })

          if (response.ok) {
            const data = await response.json()

            if (data.name) {
              let completed = false
              let attempts = 0
              const maxAttempts = 60

              while (!completed && attempts < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 10000))

                const statusResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${data.name}`, {
                  headers: {
                    "x-goog-api-key": process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || "",
                  },
                })

                if (statusResponse.ok) {
                  const statusData = await statusResponse.json()
                  if (statusData.done) {
                    completed = true
                    if (statusData.response?.generatedVideos?.[0]?.video) {
                      items.push({
                        url: statusData.response.generatedVideos[0].video,
                        type: "video",
                      })
                    }
                  }
                }
                attempts++
              }
            }
          }

          if (items.length === 0) {
            items.push({
              url: `/placeholder.svg?height=720&width=1280&query=${encodeURIComponent(prompt + " video frame")}`,
              type: "video",
            })
          }
        } catch (error) {
          console.error("Google Veo video generation error:", error)
          items.push({
            url: `/placeholder.svg?height=720&width=1280&query=${encodeURIComponent(prompt + " video frame")}`,
            type: "video",
          })
        }
      }
    }

    return res.status(200).json({ items })
  } catch (error) {
    console.error("Generation error:", error)
    return res.status(500).json({ error: "Failed to generate content" })
  }
}
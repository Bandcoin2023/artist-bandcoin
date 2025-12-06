import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import type {
  VideoModel,
  VideoSeconds,
  VideoSize,
} from "openai/resources/videos";

const openai = process.env.NEXT_PUBLIC_OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY })
  : null;

const googleAI = process.env.NEXT_PUBLIC_GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY })
  : null;

// Type for generated items
interface GeneratedItemResult {
  url: string;
  type: "image" | "video";
}

function extractBase64FromDataUrl(
  dataUrl: string,
): { base64: string; mimeType: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match?.[1] && match[2]) {
    return { mimeType: match[1], base64: match[2] };
  }
  return null;
}

const CAMERA_GEAR_PROMPTS: Record<string, string> = {
  default: "",
  "nikon-z9":
    "shot on Nikon Z9, professional mirrorless camera, sharp details, excellent autofocus",
  "canon-r5":
    "shot on Canon EOS R5, high resolution 45MP, vibrant colors, excellent dynamic range",
  "sony-a7rv":
    "shot on Sony A7R V, 61MP full-frame, outstanding dynamic range, precise autofocus",
  "dji-mavic":
    "aerial drone photography, shot on DJI Mavic 3, Hasselblad camera, wide aerial view",
  "gopro-hero":
    "action camera shot, GoPro Hero 12, ultra wide angle, high frame rate, immersive POV",
  hasselblad:
    "shot on Hasselblad X2D 100C, medium format, exceptional detail, studio quality",
  "leica-m11":
    "shot on Leica M11, classic rangefinder aesthetic, timeless film-like quality",
  "fujifilm-gfx":
    "shot on Fujifilm GFX 100S, medium format, beautiful film simulation colors",
  "phase-one":
    "shot on Phase One IQ4 150MP, ultra high resolution, studio photography",
  "red-v-raptor":
    "cinematic shot, RED V-RAPTOR 8K, film-like motion blur, Hollywood production quality",
  "arri-alexa":
    "shot on ARRI ALEXA 35, film industry standard, natural skin tones, cinematic look",
};

function getRemixSettings(variety: number): {
  temperature: number;
  description: string;
} {
  if (variety <= 20)
    return {
      temperature: 0.3,
      description: "with high precision and accuracy to the prompt",
    };
  if (variety <= 40)
    return { temperature: 0.5, description: "with subtle creative variations" };
  if (variety <= 60)
    return {
      temperature: 0.7,
      description: "with balanced creativity and accuracy",
    };
  if (variety <= 80)
    return {
      temperature: 0.9,
      description: "with creative artistic interpretation",
    };
  return {
    temperature: 1.2,
    description: "with wild imaginative and artistic interpretation",
  };
}

async function base64ToFile(
  base64DataUrl: string,
  filename: string,
): Promise<File | null> {
  try {
    const response = await fetch(base64DataUrl);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  } catch {
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    return res.status(200).json({
      message: "AI Generation API",
      endpoints: {
        POST: "Generate images or videos",
        status: "GET /api/generate/status?videoId=...&provider=...",
      },
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      prompt,
      mediaType,
      model,
      provider,
      style,
      size,
      aspectRatio,
      numberOfImages,
      duration,
      quality,
      referenceImage,
      cameraGear,
      remixVariety,
    } = req.body as {
      prompt: string;
      mediaType: "image" | "video";
      model: string;
      provider: "openai" | "google";
      style?: string;
      size?: string;
      aspectRatio?: string;
      numberOfImages: number;
      duration?: VideoSeconds;
      quality?: "standard" | "hd";
      referenceImage?: string;
      cameraGear?: string;
      remixVariety?: number;
    };

    const remixSettings = getRemixSettings(remixVariety ?? 30);

    const pixelSize = getPixelSizeFromAspectRatio(
      aspectRatio ?? "1:1",
      size ?? "1024x1024",
    );

    const enhancedPrompt = buildEnhancedPrompt({
      prompt,
      style,
      cameraGear,
      remixVariety,
      hasReferenceImage: !!referenceImage,
    });

    const items: GeneratedItemResult[] = [];

    if (mediaType === "image") {
      if (provider === "openai") {
        if (!openai) {
          return res
            .status(500)
            .json({ error: "OpenAI API key not configured" });
        }

        try {
          type DallESize =
            | "256x256"
            | "512x512"
            | "1024x1024"
            | "1792x1024"
            | "1024x1792";

          const dalleSize = pixelSize.dalleSize as DallESize;

          if (model === "dall-e-3") {
            for (let i = 0; i < numberOfImages; i++) {
              const response = await openai.images.generate({
                model: "dall-e-3",
                prompt: enhancedPrompt,
                n: 1,
                size: dalleSize,
                quality:
                  quality === "hd" || quality === "standard"
                    ? "standard"
                    : "hd",
                style: style === "Natural" ? "natural" : "vivid",
              });
              if (response.data) {
                for (const img of response.data) {
                  if (img.url) {
                    items.push({ url: img.url, type: "image" });
                  }
                }
              }
            }
          } else {
            // DALL-E 2
            const dalle2Size: "256x256" | "512x512" | "1024x1024" =
              size === "256x256"
                ? "256x256"
                : size === "512x512"
                  ? "512x512"
                  : "1024x1024";

            if (referenceImage) {
              const imageData = extractBase64FromDataUrl(referenceImage);

              if (imageData) {
                const imageBuffer = Buffer.from(imageData.base64, "base64");

                for (let i = 0; i < Math.min(numberOfImages, 10); i++) {
                  try {
                    // Use createVariation for reference-based generation
                    const response = await openai.images.createVariation({
                      image: new File([imageBuffer], "reference.png", {
                        type: imageData.mimeType,
                      }),
                      n: 1,
                      size: dalle2Size,
                    });

                    if (response.data?.[0]?.url) {
                      items.push({ url: response.data[0].url, type: "image" });
                    }
                  } catch (varError) {
                    console.error(
                      "Variation error, falling back to generate:",
                      varError,
                    );
                    // Fallback to regular generation
                    const response = await openai.images.generate({
                      model: "dall-e-2",
                      prompt: enhancedPrompt,
                      n: 1,
                      size: dalle2Size,
                    });
                    if (response.data?.[0]?.url) {
                      items.push({ url: response.data[0].url, type: "image" });
                    }
                  }
                }
              } else {
                // Couldn't process reference image, generate normally
                const response = await openai.images.generate({
                  model: "dall-e-2",
                  prompt: enhancedPrompt,
                  n: Math.min(Number(numberOfImages), 10),
                  size: dalle2Size,
                });

                if (response.data) {
                  for (const img of response.data) {
                    if (img.url) {
                      items.push({ url: img.url, type: "image" });
                    }
                  }
                }
              }
            } else {
              // No reference image - standard generation
              const response = await openai.images.generate({
                model: "dall-e-2",
                prompt: enhancedPrompt,
                n: Math.min(numberOfImages, 10),
                size: dalle2Size,
              });

              if (response.data) {
                for (const img of response.data) {
                  if (img.url) {
                    items.push({ url: img.url, type: "image" });
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("OpenAI image generation error:", error);
          for (let i = 0; i < numberOfImages; i++) {
            items.push({
              url: `/placeholder.svg?height=1024&width=1024&query=${encodeURIComponent(prompt + " " + (style ?? ""))}`,
              type: "image",
            });
          }
        }
      } else if (provider === "google") {
        if (!googleAI) {
          return res
            .status(500)
            .json({ error: "Google AI API key not configured" });
        } else if (provider === "google") {
          if (!googleAI) {
            return res
              .status(500)
              .json({ error: "Google AI API key not configured" });
          }

          try {
            for (let i = 0; i < numberOfImages; i++) {
              try {
                let response;

                if (referenceImage) {
                  const imageData = extractBase64FromDataUrl(referenceImage);

                  if (imageData) {
                    response = await googleAI.models.generateContent({
                      model:
                        model === "gemini-pro-image"
                          ? "gemini-2.0-flash-exp-image-generation"
                          : "gemini-2.0-flash-exp-image-generation",
                      contents: [
                        {
                          role: "user",
                          parts: [
                            {
                              inlineData: {
                                mimeType: imageData.mimeType,
                                data: imageData.base64,
                              },
                            },
                            {
                              text: `Using this reference image as inspiration for style, composition, colors, and mood, create a new image: ${enhancedPrompt}. 
                            
Output dimensions should be approximately ${pixelSize.width}x${pixelSize.height} (${aspectRatio} aspect ratio).`,
                            },
                          ],
                        },
                      ],
                      config: {
                        responseModalities: ["TEXT", "IMAGE"],
                        temperature: remixSettings.temperature,
                      },
                    });
                  } else {
                    // Fallback if can't parse reference image
                    response = await googleAI.models.generateContent({
                      model: "gemini-2.0-flash-exp-image-generation",
                      contents: `${enhancedPrompt}. Create in ${aspectRatio} aspect ratio.`,
                      config: {
                        responseModalities: ["TEXT", "IMAGE"],
                        temperature: remixSettings.temperature,
                      },
                    });
                  }
                } else {
                  response = await googleAI.models.generateContent({
                    model:
                      model === "gemini-pro-image"
                        ? "gemini-2.0-flash-exp-image-generation"
                        : "gemini-2.0-flash-exp-image-generation",
                    contents: `${enhancedPrompt}. Create in ${aspectRatio} aspect ratio, ${pixelSize.width}x${pixelSize.height} pixels.`,
                    config: {
                      responseModalities: ["TEXT", "IMAGE"],
                      temperature: remixSettings.temperature,
                    },
                  });
                }
                console.log("Image generation response:", response);
                // Extract image from response
                if (response.candidates?.[0]?.content?.parts) {
                  for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData?.data) {
                      const base64Data = part.inlineData.data;
                      const mimeType = part.inlineData.mimeType ?? "image/png";
                      items.push({
                        url: `data:${mimeType};base64,${base64Data}`,
                        type: "image",
                      });
                    }
                  }
                }
              } catch (innerError) {
                console.error("Single image generation error:", innerError);
              }
            }

            // Fallback if no images generated
            if (items.length === 0) {
              for (let i = 0; i < numberOfImages; i++) {
                items.push({
                  url: `/placeholder.svg?height=${pixelSize.height}&width=${pixelSize.width}&query=${encodeURIComponent(prompt + " " + (style ?? ""))}`,
                  type: "image",
                });
              }
            }
          } catch (error) {
            console.error("Google AI image generation error:", error);
            for (let i = 0; i < numberOfImages; i++) {
              items.push({
                url: `/placeholder.svg?height=${pixelSize.height}&width=${pixelSize.width}&query=${encodeURIComponent(prompt + " " + (style ?? ""))}`,
                type: "image",
              });
            }
          }
        }
      }
    } else if (mediaType === "video") {
      if (provider === "openai") {
        if (!openai) {
          return res
            .status(500)
            .json({ error: "OpenAI API key not configured" });
        }

        try {
          const sizeForAspect =
            aspectRatio === "9:16" ? "720x1280" : "1280x720";
          const soraModel = model === "sora-2-pro" ? "sora-2-pro" : "sora-2";

          type VideoCreateOptions = {
            model: VideoModel;
            prompt: string;
            size: VideoSize;
            seconds: VideoSeconds | undefined;
            image?: string;
          };

          const videoOptions: VideoCreateOptions = {
            model: soraModel,
            prompt: enhancedPrompt,
            size: sizeForAspect,
            seconds: duration,
          };

          const video = await openai.videos.create(videoOptions);

          // Poll for completion
          let completed = false;
          let attempts = 0;
          const maxAttempts = 60;

          while (!completed && attempts < maxAttempts) {
            const response = await openai.videos.retrieve(video.id);

            if (response.status === "completed") {
              completed = true;
              const content = await openai.videos.downloadContent(response.id);

              if (content.ok) {
                const arrayBuffer = await content.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString("base64");
                items.push({
                  url: `data:video/mp4;base64,${base64}`,
                  type: "video",
                });
              }
            } else if (response.status === "failed") {
              throw new Error("Video generation failed");
            }

            attempts++;
            if (!completed) {
              await new Promise((resolve) => setTimeout(resolve, 10000));
            }
          }

          if (!completed) {
            throw new Error("Video generation timed out");
          }
        } catch (error) {
          console.error("OpenAI video generation error:", error);
          items.push({
            url: `/placeholder.svg?height=720&width=1280&query=${encodeURIComponent(prompt + " video frame")}`,
            type: "video",
          });
        }
      } else if (provider === "google") {
        if (!googleAI) {
          return res
            .status(500)
            .json({ error: "Google AI API key not configured" });
        }

        try {
          type VeoGenerateOptions = {
            model: string;
            prompt: string;
            config?: {
              aspectRatio?: string;
              numberOfVideos?: number;
            };
            image?: {
              imageBytes: string;
              mimeType: string;
            };
          };

          const veoOptions: VeoGenerateOptions = {
            model: "veo-2.0-generate-001",
            prompt: enhancedPrompt,
            config: {
              aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9",
              numberOfVideos: 1,
            },
          };

          let operation = await googleAI.models.generateVideos(veoOptions);

          // Poll for completion
          let attempts = 0;
          const maxAttempts = 60;

          while (!operation.done && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            operation = await googleAI.operations.getVideosOperation({
              operation,
            });
            attempts++;
          }
          console.log("Video generation operation:", operation);
          if (
            operation.done &&
            operation.response?.generatedVideos?.[0]?.video
          ) {
            const videoFile = operation.response.generatedVideos[0].video;
            const x = await googleAI.files.download({
              file: operation.response.generatedVideos[0].video,
              downloadPath: "dialogue_example.mp4",
            });
            console.log("Downloaded video file:", x);
            console.log("Generated video file:", videoFile.uri);
            if (videoFile.uri) {
              items.push({ url: videoFile.uri, type: "video" });
            }
          }

          // Fallback if no video generated
          if (items.length === 0) {
            items.push({
              url: `/placeholder.svg?height=720&width=1280&query=${encodeURIComponent(prompt + " video frame")}`,
              type: "video",
            });
          }
        } catch (error) {
          console.error("Google Veo video generation error:", error);
          items.push({
            url: `/placeholder.svg?height=720&width=1280&query=${encodeURIComponent(prompt + " video frame")}`,
            type: "video",
          });
        }
      }
    }

    return res.status(200).json({ items });
  } catch (error) {
    console.error("Generation error:", error);
    return res.status(500).json({ error: "Failed to generate content" });
  }
}
function buildEnhancedPrompt(params: {
  prompt: string;
  style?: string;
  cameraGear?: string;
  remixVariety?: number;
  hasReferenceImage?: boolean;
}): string {
  const { prompt, style, cameraGear, remixVariety, hasReferenceImage } = params;

  let enhancedPrompt = prompt;

  // Add style prefix if not default
  if (style && style !== "Dynamic" && style !== "Auto") {
    enhancedPrompt = `${style} style artwork: ${enhancedPrompt}`;
  }

  // Add camera gear style
  const cameraPrompt = cameraGear ? CAMERA_GEAR_PROMPTS[cameraGear] : "";
  if (cameraPrompt) {
    enhancedPrompt = `${enhancedPrompt}, ${cameraPrompt}`;
  }

  // Add remix variety description
  if (remixVariety !== undefined && remixVariety !== 30) {
    const remixSettings = getRemixSettings(remixVariety);
    enhancedPrompt = `${enhancedPrompt}, ${remixSettings.description}`;
  }

  // Add reference context hint
  if (hasReferenceImage) {
    enhancedPrompt = `Using the provided reference image as style and composition inspiration: ${enhancedPrompt}`;
  }

  return enhancedPrompt;
}
function getPixelSizeFromAspectRatio(
  aspectRatio: string,
  baseSize: string,
): { width: number; height: number; dalleSize: string } {
  // Parse base size to get the base dimension
  const baseDim = Number.parseInt(baseSize?.split("x")[0] ?? "1024", 10);

  // DALL-E supported sizes
  const dalleSizes: Record<string, string> = {
    "1:1": "1024x1024",
    "2:3": "1024x1792",
    "3:2": "1792x1024",
    "16:9": "1792x1024",
    "9:16": "1024x1792",
  };

  const aspectDimensions: Record<string, { width: number; height: number }> = {
    "1:1": { width: baseDim, height: baseDim },
    "2:3": { width: Math.round(baseDim * 0.67), height: baseDim },
    "3:2": { width: baseDim, height: Math.round(baseDim * 0.67) },
    "16:9": { width: baseDim, height: Math.round(baseDim * 0.5625) },
    "9:16": { width: Math.round(baseDim * 0.5625), height: baseDim },
  };

  return {
    ...(aspectDimensions[aspectRatio] ?? { width: 1024, height: 1024 }),
    dalleSize: dalleSizes[aspectRatio] ?? "1024x1024",
  };
}

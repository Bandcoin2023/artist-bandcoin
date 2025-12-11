import { GoogleGenAI } from "@google/genai";
import type {
  GeneratedItem,
  GenerationOptions,
  PixelSize,
  RemixSettings,
} from "../types/generation.types";
import { S3UploadService } from "./s3-upload.service";

const googleAI = new GoogleGenAI({});

export class GoogleAIService {
  /**
   * Generate images using Gemini
   */
  static async generateImages(
    options: GenerationOptions,
    pixelSize: PixelSize,
    enhancedPrompt: string,
    remixSettings: RemixSettings,
  ): Promise<GeneratedItem[]> {
    if (!googleAI) {
      throw new Error("Google AI API key not configured");
    }

    const items: GeneratedItem[] = [];
    const { model, numberOfImages, aspectRatio, referenceImage } = options;

    for (let i = 0; i < numberOfImages; i++) {
      try {
        let response;

        if (referenceImage) {
          const imageData = this.extractBase64FromDataUrl(referenceImage);

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

        // Extract image from response
        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              const base64Data = part.inlineData.data;
              const mimeType = part.inlineData.mimeType ?? "image/png";

              // Upload base64 image to S3 and get public URL
              const imageUrl = await S3UploadService.uploadBase64Image(
                base64Data,
                mimeType,
              );

              items.push({
                url: imageUrl,
                type: "image",
              });
            }
          }
        }
      } catch (error) {
        console.error("Single image generation error:", error);
        throw error;
      }
    }

    return items;
  }

  /**
   * Generate videos using Veo
   */
  static async generateVideos(
    options: GenerationOptions,
    enhancedPrompt: string,
  ): Promise<GeneratedItem[]> {
    if (!googleAI) {
      throw new Error("Google AI API key not configured");
    }

    const items: GeneratedItem[] = [];
    const { aspectRatio } = options;

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

    if (operation.done && operation.response?.generatedVideos?.[0]?.video) {
      const videoFile = operation.response.generatedVideos[0].video;

      if (videoFile.uri) {
        items.push({ url: videoFile.uri, type: "video" });
      }
    }

    return items;
  }

  /**
   * Extract base64 data from data URL
   */
  private static extractBase64FromDataUrl(
    dataUrl: string,
  ): { base64: string; mimeType: string } | null {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match?.[1] && match[2]) {
      return { mimeType: match[1], base64: match[2] };
    }
    return null;
  }
}

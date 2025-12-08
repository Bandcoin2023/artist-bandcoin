import OpenAI from "openai";
import type {
  VideoModel,
  VideoSeconds,
  VideoSize,
} from "openai/resources/videos";
import type {
  GeneratedItem,
  GenerationOptions,
  PixelSize,
} from "../types/generation.types";

const openai = new OpenAI();

export class OpenAIService {
  /**
   * Generate images using DALL-E
   */
  static async generateImages(
    options: GenerationOptions,
    pixelSize: PixelSize,
    enhancedPrompt: string,
  ): Promise<GeneratedItem[]> {
    if (!openai) {
      throw new Error("OpenAI API key not configured");
    }

    const items: GeneratedItem[] = [];
    const { model, numberOfImages, quality, size, referenceImage } = options;

    type DallESize =
      | "256x256"
      | "512x512"
      | "1024x1024"
      | "1792x1024"
      | "1024x1792";
    const dalleSize = pixelSize.dalleSize as DallESize;

    if (model === "dall-e-3") {
      // DALL-E 3 - one image at a time
      for (let i = 0; i < numberOfImages; i++) {
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: enhancedPrompt,
          n: 1,
          size: dalleSize,
          quality: quality === "hd" ? "hd" : "standard",
          style: options.style === "Natural" ? "natural" : "vivid",
        });

        if (response.data?.[0]?.url) {
          items.push({ url: response.data[0].url, type: "image" });
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
        // Use reference image for variations
        const imageData = this.extractBase64FromDataUrl(referenceImage);

        if (imageData) {
          const imageBuffer = Buffer.from(imageData.base64, "base64");

          for (let i = 0; i < Math.min(numberOfImages, 10); i++) {
            try {
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
            } catch (error) {
              console.error(
                "Variation error, falling back to generate:",
                error,
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

    return items;
  }

  /**
   * Generate videos using Sora
   */
  static async generateVideos(
    options: GenerationOptions,
    enhancedPrompt: string,
  ): Promise<GeneratedItem[]> {
    if (!openai) {
      throw new Error("OpenAI API key not configured");
    }

    const items: GeneratedItem[] = [];
    const { model, aspectRatio, duration } = options;

    const sizeForAspect = aspectRatio === "9:16" ? "720x1280" : "1280x720";
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

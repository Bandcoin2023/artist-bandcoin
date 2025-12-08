import { DynamoDBService } from "./dynamodb.service";
import { OpenAIService } from "./openai.service";
import { GoogleAIService } from "./google.service";
import type {
  GenerationOptions,
  PixelSize,
  RemixSettings,
} from "../types/generation.types";

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

export class JobProcessorService {
  /**
   * Process a generation job
   */
  static async processJob(
    jobId: string,
    options: GenerationOptions,
  ): Promise<void> {
    try {
      // Update status to processing
      await DynamoDBService.updateJobStatus(jobId, "processing");
      await DynamoDBService.updateJobProgress(jobId, 10);

      // Calculate pixel size and remix settings
      const pixelSize = this.getPixelSizeFromAspectRatio(
        options.aspectRatio ?? "1:1",
        options.size ?? "1024x1024",
      );
      const remixSettings = this.getRemixSettings(options.remixVariety ?? 30);

      // Build enhanced prompt
      const enhancedPrompt = this.buildEnhancedPrompt({
        prompt: options.prompt,
        style: options.style,
        cameraGear: options.cameraGear,
        remixVariety: options.remixVariety,
        hasReferenceImage: !!options.referenceImage,
      });

      await DynamoDBService.updateJobProgress(jobId, 20);

      // Generate content based on media type and provider
      let items;
      if (options.mediaType === "image") {
        await DynamoDBService.updateJobProgress(jobId, 30);

        if (options.provider === "openai") {
          items = await OpenAIService.generateImages(
            options,
            pixelSize,
            enhancedPrompt,
          );
        } else {
          items = await GoogleAIService.generateImages(
            options,
            pixelSize,
            enhancedPrompt,
            remixSettings,
          );
        }

        await DynamoDBService.updateJobProgress(jobId, 90);
      } else {
        // Video generation
        await DynamoDBService.updateJobProgress(jobId, 30);

        if (options.provider === "openai") {
          items = await OpenAIService.generateVideos(options, enhancedPrompt);
        } else {
          items = await GoogleAIService.generateVideos(options, enhancedPrompt);
        }

        await DynamoDBService.updateJobProgress(jobId, 90);
      }

      // Mark as completed
      await DynamoDBService.setJobCompleted(jobId, items);
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await DynamoDBService.setJobFailed(jobId, errorMessage);
    }
  }

  /**
   * Get remix settings based on variety level
   */
  private static getRemixSettings(variety: number): RemixSettings {
    if (variety <= 20)
      return {
        temperature: 0.3,
        description: "with high precision and accuracy to the prompt",
      };
    if (variety <= 40)
      return {
        temperature: 0.5,
        description: "with subtle creative variations",
      };
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

  /**
   * Build enhanced prompt with style and camera gear
   */
  private static buildEnhancedPrompt(params: {
    prompt: string;
    style?: string;
    cameraGear?: string;
    remixVariety?: number;
    hasReferenceImage?: boolean;
  }): string {
    const { prompt, style, cameraGear, remixVariety, hasReferenceImage } =
      params;

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
      const remixSettings = this.getRemixSettings(remixVariety);
      enhancedPrompt = `${enhancedPrompt}, ${remixSettings.description}`;
    }

    // Add reference context hint
    if (hasReferenceImage) {
      enhancedPrompt = `Using the provided reference image as style and composition inspiration: ${enhancedPrompt}`;
    }

    return enhancedPrompt;
  }

  /**
   * Get pixel size from aspect ratio
   */
  private static getPixelSizeFromAspectRatio(
    aspectRatio: string,
    baseSize: string,
  ): PixelSize {
    const baseDim = Number.parseInt(baseSize?.split("x")[0] ?? "1024", 10);

    const dalleSizes: Record<string, string> = {
      "1:1": "1024x1024",
      "2:3": "1024x1792",
      "3:2": "1792x1024",
      "16:9": "1792x1024",
      "9:16": "1024x1792",
    };

    const aspectDimensions: Record<string, { width: number; height: number }> =
      {
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
}

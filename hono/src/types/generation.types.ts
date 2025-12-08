import type {
  VideoModel,
  VideoSeconds,
  VideoSize,
} from "openai/resources/videos";

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export type MediaType = "image" | "video";

export type Provider = "openai" | "google";

export interface GeneratedItem {
  url: string;
  type: MediaType;
}

export interface GenerationOptions {
  prompt: string;
  mediaType: MediaType;
  model: string;
  provider: Provider;
  style?: string;
  size?: string;
  aspectRatio?: string;
  numberOfImages: number;
  duration?: VideoSeconds;
  quality?: "standard" | "hd";
  referenceImage?: string;
  cameraGear?: string;
  remixVariety?: number;
}

export interface JobData {
  jobId: string;
  status: JobStatus;
  progress: number;
  type: MediaType;
  provider: Provider;
  prompt: string;
  options: GenerationOptions;
  result?: {
    items: GeneratedItem[];
  };
  error?: string;
  createdAt: string;
  updatedAt: string;
  ttl: number; // Unix timestamp for DynamoDB TTL (24 hours from creation)
}

export interface CreateJobRequest {
  prompt: string;
  mediaType: MediaType;
  model: string;
  provider: Provider;
  style?: string;
  size?: string;
  aspectRatio?: string;
  numberOfImages: number;
  duration?: VideoSeconds;
  quality?: "standard" | "hd";
  referenceImage?: string;
  cameraGear?: string;
  remixVariety?: number;
}

export interface CreateJobResponse {
  jobId: string;
  status: JobStatus;
  message: string;
}

export interface JobStatusResponse extends JobData {}

export interface PixelSize {
  width: number;
  height: number;
  dalleSize: string;
}

export interface RemixSettings {
  temperature: number;
  description: string;
}

import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import type {
  VideoModel,
  VideoSeconds,
  VideoSize,
} from "openai/resources/videos";
import { env } from "~/env";
import { qstash, generateJobId, createJob } from "~/lib/qstash"
import { getToken } from "next-auth/jwt";
import { BASE_URL } from "~/lib/common";



export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const token = await getToken({ req });
  if (!token?.sub) {
    res.status(401).json({
      error: "User is not authenticated",
    });
    return;
  }

  if (req.method === "GET") {
    return res.status(200).json({
      message: "AI Generation API",
      endpoints: {
        POST: "Generate images or videos",
        status: "GET /api/generate/status/[jobId]",
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
      videoAspectRatio,
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
      videoAspectRatio: string,
    };
    // Generate a unique job ID
    const jobId = generateJobId()
    // Create job record in Redis
    await createJob(jobId, {
      status: "pending",
      message: "Job queued for processing",
    })

    await qstash.publishJSON({
      url: `${BASE_URL}/api/generate/process`,
      body: {
        jobId,
        prompt,
        mediaType,
        model,
        provider,
        style,
        size,
        aspectRatio,
        numberOfImages,
        referenceImage,
        cameraGear,
        remixVariety,
        duration,
        quality,
        videoAspectRatio,
      },
      retries: 1,
    })
    console.log("JobId", jobId)
    return res.json({
      jobId,
      status: "pending",
      message: "Generation job queued successfully",
    })

  } catch (error) {
    console.error("Generation error:", error);
    return res.status(500).json({ error: "Failed to generate content" });
  }
}

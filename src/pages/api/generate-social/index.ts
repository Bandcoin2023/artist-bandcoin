import OpenAI from "openai"
import { GoogleGenAI } from "@google/genai"
import type { NextApiRequest, NextApiResponse } from "next"
import { env } from "~/env"
import { qstash, generateJobId, createJob } from "~/lib/qstash"
import { getToken } from "next-auth/jwt"
import { BASE_URL } from "~/lib/common"

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null

const googleAI = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null

const platformLimits: Record<string, number> = {
  twitter: 280,
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req })
  if (!token?.sub) {
    res.status(401).json({
      error: "User is not authenticated",
    })
    return
  }

  if (req.method === "GET") {
    return res.status(200).json({
      message: "Social Media Content Generation API",
      endpoints: {
        POST: "Generate social media posts",
        status: "GET /api/generate-social/status/[jobId]",
      },
    })
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const {
      topic,
      context,
      platform,
      postStyle,
      includeHashtags,
      includeEmojis,
      includeCTA,
      ctaType,
      postLength,
      numberOfVariations,
      contentPillar,
      hookStyle,
      hashtagCount,
      targetDemographic,
      model,
    } = req.body as {
      topic: string
      context: string
      platform: string
      postStyle: string
      includeHashtags: boolean
      includeEmojis: boolean
      includeCTA: boolean
      ctaType: string
      postLength: string
      numberOfVariations: number
      contentPillar: string
      hookStyle: string
      hashtagCount: number
      targetDemographic: string
      model: string
    }

    const jobId = generateJobId()
    await createJob(jobId, {
      status: "pending",
      message: "Social media content generation queued for processing",
    })

    await qstash.publishJSON({
      url: `${BASE_URL}/api/generate-social/process`,
      body: {
        jobId,
        topic,
        context,
        platform,
        postStyle,
        includeHashtags,
        includeEmojis,
        includeCTA,
        ctaType,
        postLength,
        numberOfVariations,
        contentPillar,
        hookStyle,
        hashtagCount,
        targetDemographic,
        model,
        userId: token.sub,
      },
      retries: 1,
    })

    return res.json({
      jobId,
      status: "pending",
      message: "Social media content generation job queued successfully",
    })
  } catch (error) {
    console.error("Social media generation error:", error)
    return res.status(500).json({ error: "Failed to queue social media content generation" })
  }
}

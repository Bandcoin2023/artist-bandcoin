import OpenAI from "openai"
import { GoogleGenAI } from "@google/genai"
import type { NextApiRequest, NextApiResponse } from "next"
import { env } from "~/env"
import { getToken } from "next-auth/jwt"
import { qstash, generateJobId, createJob } from "~/lib/qstash"
import { BASE_URL } from "~/lib/common"

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null

const googleAI = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null

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
      message: "SEO Content Generation API",
      endpoints: {
        POST: "Generate SEO content",
        status: "GET /api/generate-seo/status/[jobId]",
      },
    })
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const {
      topic,
      primaryKeyword,
      secondaryKeywords,
      contentType,
      tone,
      wordCount,
      targetAudience,
      readingLevel,
      contentStructure,
      searchIntent,
      keywordDensity,
      language,
      includeMetaTags,
      includeFAQ,
      includeTableOfContents,
      includeInternalLinks,
      includeImages,
      includeStats,
      includeQuotes,
      model,
    } = req.body as {
      topic: string
      primaryKeyword: string
      secondaryKeywords: string[]
      contentType: string
      tone: string
      wordCount: number
      targetAudience: string
      readingLevel: string
      contentStructure: string
      searchIntent: string
      keywordDensity: number
      language: string
      includeMetaTags: boolean
      includeFAQ: boolean
      includeTableOfContents: boolean
      includeInternalLinks: boolean
      includeImages: boolean
      includeStats: boolean
      includeQuotes: boolean
      model: string
    }

    const jobId = generateJobId()
    await createJob(jobId, {
      status: "pending",
      message: "SEO content generation queued for processing",
    })

    await qstash.publishJSON({
      url: `${BASE_URL}/api/generate-seo/process`,
      body: {
        jobId,
        topic,
        primaryKeyword,
        secondaryKeywords,
        contentType,
        tone,
        wordCount,
        targetAudience,
        readingLevel,
        contentStructure,
        searchIntent,
        keywordDensity,
        language,
        includeMetaTags,
        includeFAQ,
        includeTableOfContents,
        includeInternalLinks,
        includeImages,
        includeStats,
        includeQuotes,
        model,
        userId: token.sub,
      },
      retries: 1,
    })

    return res.json({
      jobId,
      status: "pending",
      message: "SEO content generation job queued successfully",
    })
  } catch (error) {
    console.error("SEO generation error:", error)
    return res.status(500).json({ error: "Failed to queue SEO content generation" })
  }
}

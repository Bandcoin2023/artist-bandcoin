import type { NextApiRequest, NextApiResponse } from "next"
import { verifySignature } from "@upstash/qstash/nextjs"
import { updateJob } from "~/lib/qstash"
import OpenAI from "openai"
import { GoogleGenAI } from "@google/genai"
import { env } from "~/env"
import { db } from "~/server/db"

export const config = {
  api: {
    bodyParser: false,
  },
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ProcessSocialJobRequest {
  jobId: string
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
  userId: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

// OpenAI GPT-4 pricing (per 1K tokens)
const INPUT_COST_PER_1K_OPENAI = 0.01
const OUTPUT_COST_PER_1K_OPENAI = 0.03

// Google Gemini pricing (per 1K tokens)
const INPUT_COST_PER_1K_GOOGLE = 0.0003
const OUTPUT_COST_PER_1K_GOOGLE = 0.0025

const platformLimits: Record<string, number> = {
  twitter: 280,
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function getRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer))
  }
  return Buffer.concat(chunks).toString("utf-8")
}


async function recordCreditTransaction(userId: string, amount: number, description: string): Promise<void> {
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

function buildSocialContentPrompt(params: ProcessSocialJobRequest): string {
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
  } = params

  const charLimit = platformLimits[platform] ?? 2000

  const prompt = `You are an expert social media content creator. Generate ${numberOfVariations} unique ${platform} post(s) about "${topic}".

CONTEXT: ${context || "None provided"}

POST REQUIREMENTS:
- Platform: ${platform} (max ${charLimit} characters)
- Style: ${postStyle}
- Content Pillar: ${contentPillar}
- Hook Style: Start with a ${hookStyle}
- Post Length: ${postLength}
- Target Audience: ${targetDemographic}
- CTA Type: ${includeCTA ? ctaType : "none"}

FORMATTING:
${includeHashtags ? `- Include ${hashtagCount} relevant hashtags` : "- No hashtags"}
${includeEmojis ? "- Use appropriate emojis strategically" : "- No emojis"}
${includeCTA ? `- End with a ${ctaType} call-to-action` : "- No CTA needed"}

Generate ${numberOfVariations} unique variation(s), each optimized for ${platform}.
${postLength === "thread" ? "Create a thread with 3-5 connected posts." : ""}

Format each variation clearly with "--------" separators. Make content engaging, authentic, and tailored for ${platform}'s audience.`

  return prompt
}

// ============================================================================
// CLIENT INITIALIZATION
// ============================================================================

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null
const googleAI = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null

// ============================================================================
// SOCIAL GENERATION HANDLERS
// ============================================================================

async function generateSocialContent(params: ProcessSocialJobRequest): Promise<string> {
  const { model, userId } = params
  const prompt = buildSocialContentPrompt(params)

  let generatedContent: string | undefined

  if (model === "openai") {
    if (!openai) {
      throw new Error("OpenAI API key not configured")
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    })

    generatedContent = completion.choices[0]?.message?.content ?? ""

    const promptTokens = completion.usage?.prompt_tokens ?? 0
    const completionTokens = completion.usage?.completion_tokens ?? 0
    const cost =
      (promptTokens / 1000) * INPUT_COST_PER_1K_OPENAI + (completionTokens / 1000) * OUTPUT_COST_PER_1K_OPENAI

    await recordCreditTransaction(userId, cost, "Social Media Content Generation (OpenAI)")
  } else {
    if (!googleAI) {
      throw new Error("Google Gemini API key not configured")
    }

    const result = await googleAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          text: prompt,
        },
      ],
      config: {
        temperature: 0.7,
      },
    })

    generatedContent = result.text

    const promptTokens = result.usageMetadata?.promptTokenCount ?? 0
    const completionTokens = result.usageMetadata?.candidatesTokenCount ?? 0
    const cost =
      (promptTokens / 1000) * INPUT_COST_PER_1K_GOOGLE + (completionTokens / 1000) * OUTPUT_COST_PER_1K_GOOGLE

    await recordCreditTransaction(userId, cost, "Social Media Content Generation (Google Gemini)")
  }

  if (!generatedContent) {
    throw new Error("Failed to generate social media content")
  }

  return generatedContent
}

// ============================================================================
// MAIN PROCESS JOB FUNCTION
// ============================================================================

async function processSocialJob(body: ProcessSocialJobRequest): Promise<string> {
  const { jobId, userId } = body

  // Update job status to processing
  await updateJob(jobId, {
    status: "processing",
    message: "Generating social media content...",
  })

  const generatedContent = await generateSocialContent(body)

  // Update job with completed status
  await updateJob(jobId, {
    status: "completed",
    message: "Social media content generated successfully",
    result: generatedContent,
  })

  return generatedContent
}

// ============================================================================
// API HANDLER
// ============================================================================

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  let body: ProcessSocialJobRequest | null = null
  let jobId: string | undefined

  try {
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

    const generatedContent = await processSocialJob(body)

    return res.status(200).json({
      success: true,
      jobId,
      content: generatedContent,
    })
  } catch (error) {
    console.error("Social media content generation process error:", error)

    if (jobId) {
      try {
        await updateJob(jobId, {
          status: "failed",
          message: error instanceof Error ? error.message : "Failed to generate social media content",
        })
      } catch (updateError) {
        console.error("Failed to update job status:", updateError)
      }
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to process social media content generation",
    })
  }
}

export default verifySignature(handler)

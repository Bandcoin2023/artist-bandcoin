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

interface ProcessSEOJobRequest {
  jobId: string
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function getRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk as Buffer)
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

function buildSEOContentPrompt(params: ProcessSEOJobRequest): string {
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
  } = params

  const prompt = `You are an expert SEO content writer. Generate a ${contentType} about "${topic}" in ${language}.

SEO REQUIREMENTS:
- Primary Keyword: ${primaryKeyword || topic}
- Secondary Keywords: ${secondaryKeywords?.join(", ") || "None"}
- Search Intent: ${searchIntent}
- Target Keyword Density: ${keywordDensity}%

CONTENT REQUIREMENTS:
- Tone: ${tone}
- Target Word Count: ${wordCount} words
- Target Audience: ${targetAudience}
- Reading Level: ${readingLevel}
- Structure: ${contentStructure}

INCLUDE THE FOLLOWING:
${includeMetaTags ? "- SEO Meta Title (under 60 chars) and Meta Description (under 160 chars) at the start" : ""}
${includeTableOfContents ? "- Table of Contents with anchor links" : ""}
${includeFAQ ? "- FAQ Section with 5-7 common questions and answers" : ""}
${includeInternalLinks ? "- Placeholder suggestions for internal links [INTERNAL LINK: topic]" : ""}
${includeStats ? "- Relevant statistics and data points with sources" : ""}
${includeQuotes ? "- Expert quotes and citations" : ""}

Write the content with proper headings (H2, H3), bullet points, and formatting. Make it comprehensive, well-structured, and optimized for search engines while maintaining readability.`

  return prompt
}

// ============================================================================
// CLIENT INITIALIZATION
// ============================================================================

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null
const googleAI = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null

// ============================================================================
// SEO GENERATION HANDLERS
// ============================================================================

async function generateSEOContent(params: ProcessSEOJobRequest): Promise<string> {
  const { model, userId } = params
  const prompt = buildSEOContentPrompt(params)

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

    await recordCreditTransaction(userId, cost, "SEO Content Generation (OpenAI)")
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

    await recordCreditTransaction(userId, cost, "SEO Content Generation (Google Gemini)")
  }

  if (!generatedContent) {
    throw new Error("Failed to generate SEO content")
  }

  return generatedContent
}

// ============================================================================
// MAIN PROCESS JOB FUNCTION
// ============================================================================

async function processSEOJob(body: ProcessSEOJobRequest): Promise<string> {
  const { jobId, userId } = body

  // Update job status to processing
  await updateJob(jobId, {
    status: "processing",
    message: "Generating SEO content...",
  })

  const generatedContent = await generateSEOContent(body)

  // Update job with completed status
  await updateJob(jobId, {
    status: "completed",
    message: "SEO content generated successfully",
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

  let body: ProcessSEOJobRequest | null = null
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

    const generatedContent = await processSEOJob(body)

    return res.status(200).json({
      success: true,
      jobId,
      content: generatedContent,
    })
  } catch (error) {
    console.error("SEO content generation process error:", error)

    if (jobId) {
      try {
        await updateJob(jobId, {
          status: "failed",
          message: error instanceof Error ? error.message : "Failed to generate SEO content",
        })
      } catch (updateError) {
        console.error("Failed to update job status:", updateError)
      }
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to process SEO content generation",
    })
  }
}

export default verifySignature(handler)

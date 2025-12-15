import OpenAI from "openai"
import { GoogleGenAI } from "@google/genai";
import { NextApiRequest, NextApiResponse } from "next";
import { env } from "~/env";
import { getToken } from "next-auth/jwt";
import { db } from "~/server/db";

const openai = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

const googleAI = env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })
  : null;

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

Write the content  with proper headings (H2, H3), bullet points, and formatting. Make it comprehensive, well-structured, and optimized for search engines while maintaining readability.`


    if (model === "openai") {
      const INPUT_COST_PER_1K_OPENAI = 0.01;
      const OUTPUT_COST_PER_1K_OPENAI = 0.03;


      if (!openai) {
        return res.status(500).json({ error: "OpenAI API key not configured" })
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      })
      //costing,
      const promptTokens = completion.usage?.prompt_tokens || 0;
      const completionTokens = completion.usage?.completion_tokens || 0;
      const cost =
        (promptTokens / 1000) * INPUT_COST_PER_1K_OPENAI +
        (completionTokens / 1000) * OUTPUT_COST_PER_1K_OPENAI;


      await db.creditBalance.update({
        where: { userId: token.sub },
        data: { balance: { decrement: cost, } },
      })

      await db.creditTransaction.create({
        data: {
          userId: token.sub,
          amount: cost,
          type: "USAGE",
          description: "SEO Content Generation"
        },
      })

      return res.status(200).json(completion.choices[0]?.message?.content)
    } else {
      if (!googleAI) {
        return res.status(500).json({ error: "Google Gemini API key not configured" })
      }

      const INPUT_COST_PER_1K_GOOGLE = 0.0003;
      const OUTPUT_COST_PER_1K_GOOGLE = 0.0025;

      const result = await googleAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            text: prompt,
          },
        ],
        config: {
          temperature: 0.7,
        }
      })

      //costing,
      const promptTokens = result.usageMetadata?.promptTokenCount || 0;
      const completionTokens = result.usageMetadata?.candidatesTokenCount || 0;
      const cost = (promptTokens / 1000) * INPUT_COST_PER_1K_GOOGLE +
        (completionTokens / 1000) * OUTPUT_COST_PER_1K_GOOGLE;

      if (!result.text) {
        return res.status(500).json({ error: "Failed to generate content from Google Gemini" })
      }


      await db.creditBalance.update({
        where: { userId: token.sub },
        data: { balance: { decrement: cost, } },
      })

      await db.creditTransaction.create({
        data: {
          userId: token.sub,
          amount: cost,
          type: "USAGE",
          description: "SEO Content Generation (Google Gemini)",
          metadata: { prompt, model: "gemini-2.5-flash", completionTokens }
        }
      });
      res.status(200).json(result.text)

    }

    res.end()
  } catch (error) {
    console.error("Error generating SEO content:", error)
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate content" })
    } else {
      res.end()
    }
  }
}
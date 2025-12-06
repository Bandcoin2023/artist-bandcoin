import OpenAI from "openai"
import { GoogleGenAI } from "@google/genai";
import { NextApiRequest, NextApiResponse } from "next";

const openai = process.env.NEXT_PUBLIC_OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY })
  : null;

const googleAI = process.env.NEXT_PUBLIC_GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY })
  : null;

const platformLimits: Record<string, number> = {
  twitter: 280,
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
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

Format each variation clearly with "---" separators. Make content engaging, authentic, and tailored for ${platform}'s audience.`

    if (model === "openai") {
      if (!openai) {
        return res.status(500).json({ error: "OpenAI API key not configured" })
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      })

      return res.status(200).json(completion.choices[0]?.message?.content)
    } else {
      if (!googleAI) {
        return res.status(500).json({ error: "Google Gemini API key not configured" })
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
        }
      })
      if (!result.text) {
        return res.status(500).json({ error: "Failed to generate content from Google Gemini" })
      }

      res.status(200).json(result.text)

    }

    res.end()
  } catch (error) {
    console.error("Error generating social posts:", error)
    if (!res.headersSent) {
      return res.status(500).json({ error: "Failed to generate posts" })
    } else {
      return res.end()
    }
  }
}

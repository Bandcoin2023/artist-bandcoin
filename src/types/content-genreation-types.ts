export type AIModel = "openai" | "google"
export type ContentMode = "seo" | "social"
export type Platform = "twitter" | "linkedin" | "instagram" | "facebook"

export interface SEOParams {
    primaryKeyword: string
    secondaryKeywords: string
    contentType: string
    tone: string
    wordCount: number[]
    targetAudience: string
    readingLevel: string
    contentStructure: string
    searchIntent: string
    keywordDensity: number[]
    language: string
    includeMetaTags: boolean
    includeFAQ: boolean
    includeTableOfContents: boolean
    includeInternalLinks: boolean
    includeImages: boolean
    includeStats: boolean
    includeQuotes: boolean
}

export interface SocialParams {
    context: string
    selectedPlatform: Platform
    postStyle: string
    includeHashtags: boolean
    includeEmojis: boolean
    includeCTA: boolean
    ctaType: string
    postLength: string
    numberOfVariations: number[]
    contentPillar: string
    hookStyle: string
    hashtagCount: number[]
    targetDemographic: string
}

export const defaultSEOParams: SEOParams = {
    primaryKeyword: "",
    secondaryKeywords: "",
    contentType: "blog-post",
    tone: "professional",
    wordCount: [500],
    targetAudience: "general",
    readingLevel: "intermediate",
    contentStructure: "standard",
    searchIntent: "informational",
    keywordDensity: [2],
    language: "english",
    includeMetaTags: true,
    includeFAQ: true,
    includeTableOfContents: true,
    includeInternalLinks: false,
    includeImages: true,
    includeStats: false,
    includeQuotes: false,
}

export const defaultSocialParams: SocialParams = {
    context: "",
    selectedPlatform: "linkedin",
    postStyle: "engaging",
    includeHashtags: true,
    includeEmojis: true,
    includeCTA: true,
    ctaType: "engagement",
    postLength: "medium",
    numberOfVariations: [3],
    contentPillar: "educational",
    hookStyle: "question",
    hashtagCount: [5],
    targetDemographic: "professionals",
}

"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import {
    type AIModel,
    type ContentMode,
    type SEOParams,
    type SocialParams,
    defaultSEOParams,
    defaultSocialParams,
} from "~/types/content-genreation-types"

interface ContentGeneratorState {
    // Core state
    contentMode: ContentMode
    topic: string
    selectedModel: AIModel
    isGenerating: boolean
    copied: boolean
    generatedContent: string

    // Params
    seoParams: SEOParams
    socialParams: SocialParams
}

interface ContentGeneratorActions {
    setContentMode: (mode: ContentMode) => void
    setTopic: (topic: string) => void
    setSelectedModel: (model: AIModel) => void
    updateSeoParams: (updates: Partial<SEOParams>) => void
    updateSocialParams: (updates: Partial<SocialParams>) => void
    handleGenerate: () => Promise<void>
    copyToClipboard: () => Promise<void>
    resetForm: () => void
}

type ContentGeneratorContextType = ContentGeneratorState & ContentGeneratorActions

const ContentGeneratorContext = createContext<ContentGeneratorContextType | null>(null)

export function ContentGeneratorProvider({ children }: { children: ReactNode }) {
    // Core state
    const [contentMode, setContentMode] = useState<ContentMode>("seo")
    const [topic, setTopic] = useState("")
    const [selectedModel, setSelectedModel] = useState<AIModel>("openai")
    const [isGenerating, setIsGenerating] = useState(false)
    const [copied, setCopied] = useState(false)
    const [seoGeneratedContent, setSeoGeneratedContent] = useState("")
    const [socialGeneratedContent, setSocialGeneratedContent] = useState("")

    // Params state
    const [seoParams, setSeoParams] = useState<SEOParams>(defaultSEOParams)
    const [socialParams, setSocialParams] = useState<SocialParams>(defaultSocialParams)

    const updateSeoParams = useCallback((updates: Partial<SEOParams>) => {
        setSeoParams((prev) => ({ ...prev, ...updates }))
    }, [])

    const updateSocialParams = useCallback((updates: Partial<SocialParams>) => {
        setSocialParams((prev) => ({ ...prev, ...updates }))
    }, [])

    const handleGenerate = useCallback(async () => {
        if (!topic.trim()) return
        setIsGenerating(true)
        if (contentMode === "seo") {
            setSeoGeneratedContent("")
        } else {
            setSocialGeneratedContent("")
        }

        console.log("Starting generation:", { contentMode, topic, selectedModel })

        try {
            const endpoint = contentMode === "seo" ? "/api/generate-seo" : "/api/generate-social"
            const body =
                contentMode === "seo"
                    ? {
                        topic,
                        ...seoParams,
                        secondaryKeywords: seoParams.secondaryKeywords
                            .split(",")
                            .map((k) => k.trim())
                            .filter(Boolean),
                        wordCount: seoParams.wordCount[0],
                        keywordDensity: seoParams.keywordDensity[0],
                        model: selectedModel,
                    }
                    : {
                        topic,
                        ...socialParams,
                        platform: socialParams.selectedPlatform,
                        numberOfVariations: socialParams.numberOfVariations[0],
                        hashtagCount: socialParams.hashtagCount[0],
                        model: selectedModel,
                    }

            console.log("Fetching:", endpoint, body)

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })

            console.log("Response status:", response.status, response.ok)

            if (!response.ok) {
                const errorText = await response.text()
                console.log("Error response:", errorText)
                throw new Error(errorText || "Generation failed")
            }

            console.log("No reader, falling back to JSON")
            const data = await response.json() as string
            if (contentMode === "seo") {
                setSeoGeneratedContent(data)
            } else {
                setSocialGeneratedContent(data)
            }

        } catch (error) {
            console.error("Error generating content:", error)
            const errorMessage = "Error generating content. Please try again. " + (error as Error).message
            if (contentMode === "seo") {
                setSeoGeneratedContent(errorMessage)
            } else {
                setSocialGeneratedContent(errorMessage)
            }
        } finally {
            setIsGenerating(false)
        }
    }, [topic, contentMode, seoParams, socialParams, selectedModel])

    const copyToClipboard = useCallback(async () => {
        const content = contentMode === "seo" ? seoGeneratedContent : socialGeneratedContent
        await navigator.clipboard.writeText(content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [contentMode, seoGeneratedContent, socialGeneratedContent])

    const resetForm = useCallback(() => {
        setTopic("")
        setSeoGeneratedContent("")
        setSocialGeneratedContent("")
        setSeoParams(defaultSEOParams)
        setSocialParams(defaultSocialParams)
    }, [])

    const setContentModeWithReset = useCallback((mode: ContentMode) => {
        setContentMode(mode)
    }, [])

    const value: ContentGeneratorContextType = {
        // State
        contentMode,
        topic,
        selectedModel,
        isGenerating,
        copied,
        generatedContent: contentMode === "seo" ? seoGeneratedContent : socialGeneratedContent,
        seoParams,
        socialParams,
        // Actions
        setContentMode: setContentModeWithReset,
        setTopic,
        setSelectedModel,
        updateSeoParams,
        updateSocialParams,
        handleGenerate,
        copyToClipboard,
        resetForm,
    }

    return <ContentGeneratorContext.Provider value={value}>{children}</ContentGeneratorContext.Provider>
}

export function useContentGenerator() {
    const context = useContext(ContentGeneratorContext)
    if (!context) {
        throw new Error("useContentGenerator must be used within a ContentGeneratorProvider")
    }
    return context
}

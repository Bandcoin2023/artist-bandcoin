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

        console.log(" Starting generation:", { contentMode, topic, selectedModel })

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

            console.log(" Creating job:", endpoint, body)

            // Step 1: Create the job
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })

            console.log(" Job creation response status:", response.status)

            if (!response.ok) {
                const errorText = await response.text()
                console.log(" Error response:", errorText)
                throw new Error(errorText || "Generation failed")
            }

            const { jobId } = (await response.json()) as { jobId: string }
            console.log(" Job created with ID:", jobId)

            // Step 2: Poll for status
            const statusEndpoint = `${endpoint}/status/${jobId}`
            const pollInterval = 2000 // Poll every 2 seconds
            const maxAttempts = 150 // 5 minutes max (150 * 2s = 300s)
            let attempts = 0

            const pollStatus = async (): Promise<void> => {
                while (attempts < maxAttempts) {
                    attempts++
                    console.log(" Polling status, attempt:", attempts)

                    const statusResponse = await fetch(statusEndpoint)

                    if (!statusResponse.ok) {
                        throw new Error("Failed to check job status")
                    }

                    const statusData = (await statusResponse.json()) as {
                        status: "processing" | "completed" | "failed"
                        result?: string
                        error?: string
                    }

                    console.log(" Job status:", statusData.status)

                    if (statusData.status === "completed" && statusData.result) {
                        console.log(" Job completed successfully")
                        if (contentMode === "seo") {
                            setSeoGeneratedContent(statusData.result)
                        } else {
                            setSocialGeneratedContent(statusData.result)
                        }
                        return
                    }

                    if (statusData.status === "failed") {
                        console.log(" Job failed:", statusData.error)
                        throw new Error(statusData.error ?? "Generation failed")
                    }

                    // Still processing, wait before next poll
                    await new Promise((resolve) => setTimeout(resolve, pollInterval))
                }

                throw new Error("Generation timed out. Please try again.")
            }

            await pollStatus()
        } catch (error) {
            console.error(" Error generating content:", error)
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

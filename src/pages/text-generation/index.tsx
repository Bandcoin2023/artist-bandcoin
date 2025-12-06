"use client"
import { ScrollArea } from "~/components/shadcn/ui/scroll-area"
import { Header } from "~/components/content-generator/header"
import { ModelSelector } from "~/components/content-generator/model-selector"
import { TopicInput } from "~/components/content-generator/topic-input"
import { SEOParamsForm } from "~/components/content-generator/seo-params"
import { SocialParamsForm } from "~/components/content-generator/social-params"
import { GenerateButton } from "~/components/content-generator/generate-button"
import { OutputPanel } from "~/components/content-generator/output-panel"
import { ContentGeneratorProvider, useContentGenerator } from "~/hooks/use-content-generator"

function ContentGeneratorInner() {
    const {
        contentMode,
        topic,
        setTopic,
        selectedModel,
        setSelectedModel,
        isGenerating,

        copied,

        generatedContent,

        seoParams,

        socialParams,

        updateSeoParams,
        updateSocialParams,
        handleGenerate,
        copyToClipboard,
        resetForm,
    } = useContentGenerator()

    return (
        <div className="flex h-[calc(100vh-10.8vh)] bg-background">
            {/* Left Panel - Controls */}
            <div className="w-[480px] flex-shrink-0 border-r border-border flex flex-col">
                <Header />

                <ScrollArea className="flex-1">
                    <div className="p-5 space-y-5">
                        <ModelSelector />
                        <TopicInput />

                        {contentMode === "seo" ? (
                            <SEOParamsForm />
                        ) : (
                            <SocialParamsForm />
                        )}
                    </div>
                </ScrollArea>

                <GenerateButton />
            </div>


            <OutputPanel />
        </div>
    )
}

export default function ContentGenerator() {
    return (
        <ContentGeneratorProvider>
            <ContentGeneratorInner />
        </ContentGeneratorProvider>
    )
}

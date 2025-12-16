"use client";
import { useState } from "react";
import { ScrollArea } from "~/components/shadcn/ui/scroll-area";
import { Sheet, SheetContent } from "~/components/shadcn/ui/sheet";
import { Button } from "~/components/shadcn/ui/button";
import { Settings2 } from "lucide-react";
import { Header } from "~/components/content-generator/header";
import { ModelSelector } from "~/components/content-generator/model-selector";
import { TopicInput } from "~/components/content-generator/topic-input";
import { SEOParamsForm } from "~/components/content-generator/seo-params";
import { SocialParamsForm } from "~/components/content-generator/social-params";
import { GenerateButton } from "~/components/content-generator/generate-button";
import { OutputPanel } from "~/components/content-generator/output-panel";
import {
  ContentGeneratorProvider,
  useContentGenerator,
} from "~/hooks/use-content-generator";

function ContentGeneratorInner() {
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  } = useContentGenerator();

  return (
    <div className="flex h-[calc(100vh-10.8vh)] bg-background">
      {/* Left Panel - Controls */}
      <div className="hidden md:flex w-[480px] flex-shrink-0 flex-col border-r border-border">
        <Header />

        <ScrollArea className="flex-1">
          <div className="space-y-5 p-5">
            <ModelSelector />
            <TopicInput />

            {contentMode === "seo" ? <SEOParamsForm /> : <SocialParamsForm />}
          </div>
        </ScrollArea>

        <GenerateButton />
      </div>

      <OutputPanel settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen} />

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="bottom" className="h-[85vh] p-0 w-full">
          <div className="h-full overflow-y-auto w-full">
            <Header />

            <ScrollArea className="flex-1">
              <div className="space-y-5 p-5">
                <ModelSelector />
                <TopicInput />

                {contentMode === "seo" ? <SEOParamsForm /> : <SocialParamsForm />}
              </div>
            </ScrollArea>

            <GenerateButton />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function ContentGenerator() {
  return (
    <ContentGeneratorProvider>
      <ContentGeneratorInner />
    </ContentGeneratorProvider>
  );
}

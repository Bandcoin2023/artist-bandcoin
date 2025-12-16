"use client"

import { useRef, useEffect } from "react"
import { FileText, Sparkles, Loader2, Twitter, Linkedin, Instagram, Facebook, Settings2 } from "lucide-react"
import { Button } from "~/components/shadcn/ui/button"
import { useContentGenerator } from "~/hooks/use-content-generator"
import { SEOOutput } from "./seo-output"
import { SocialMediaOutput } from "./social-media-output"

const platformIcons = {
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  facebook: Facebook,
}

interface OutputPanelProps {
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
}

export function OutputPanel({ settingsOpen, setSettingsOpen }: OutputPanelProps) {
  const { contentMode, socialParams, generatedContent, isGenerating, copied, copyToClipboard } = useContentGenerator()
  const outputRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (outputRef.current && generatedContent) {
      outputRef.current.scrollTop = 0
    }
  }, [generatedContent])

  const PlatformIcon = platformIcons[socialParams.selectedPlatform]

  return (
    <div className="flex-1 flex flex-col bg-secondary/20">
      {/* Output Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            {contentMode === "seo" ? (
              <FileText className="h-4 w-4 text-primary" />
            ) : (
              <PlatformIcon className="h-4 w-4 text-primary" />
            )}
          </div>
          <div>
            <h2 className="text-sm font-medium">Generated Content</h2>
            <p className="text-xs text-muted-foreground">
              {contentMode === "seo" ? "SEO-optimized article" : `${socialParams.selectedPlatform} post`}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="ml-2 bg-transparent md:hidden"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Output Content */}
      <div ref={outputRef} className="flex-1 overflow-auto p-6">
        {isGenerating && !generatedContent ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium">Generating your content...</h3>
                <p className="text-sm text-muted-foreground">
                  AI is crafting{" "}
                  {contentMode === "seo" ? "an SEO-optimized article" : `your ${socialParams.selectedPlatform} post`}
                </p>
              </div>
            </div>
          </div>
        ) : generatedContent ? (
          <div>
            {contentMode === "seo" ? (
              <SEOOutput content={generatedContent} />
            ) : (
              <SocialMediaOutput content={generatedContent} platform={socialParams.selectedPlatform} />
            )}
            {isGenerating && (
              <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>AI is regenerating your content...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-muted-foreground">No content generated yet</h3>
                <p className="text-sm text-muted-foreground/70">
                  Fill in the parameters and click generate to create your content
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

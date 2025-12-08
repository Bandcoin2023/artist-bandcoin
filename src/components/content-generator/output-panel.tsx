"use client"

import { useRef, useEffect } from "react"
import { Button } from "~/components/shadcn/ui/button"
import {
  FileText,
  Copy,
  Check,
  Download,
  Sparkles,
  Loader2,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
} from "lucide-react"
import { useContentGenerator } from "~/hooks/use-content-generator"

import { Remark } from "react-remark"
import { MarkdownRenderer } from "../markdown-renderer"

const platformIcons = {
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  facebook: Facebook,
}

export function OutputPanel() {
  const { contentMode, socialParams, generatedContent, isGenerating, copied, copyToClipboard } = useContentGenerator()
  // console.log("Generated Content:", generatedContent)
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (outputRef.current && generatedContent) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
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
        {generatedContent && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs bg-transparent"
              onClick={copyToClipboard}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs bg-transparent">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        )}
      </div>

      {/* Output Content */}
      <div ref={outputRef} className="flex-1 overflow-auto p-6">
        {generatedContent ? (
          <div className="">
            <div className="">

              <MarkdownRenderer content={generatedContent} />

            </div>
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

        {isGenerating && (
          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>AI is generating your content...</span>
          </div>
        )}
      </div>
    </div>
  )
}

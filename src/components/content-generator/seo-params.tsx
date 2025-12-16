"use client"

import { Input } from "~/components/shadcn/ui/input"
import { Label } from "~/components/shadcn/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/shadcn/ui/select"
import { Slider } from "~/components/shadcn/ui/slider"
import { Switch } from "~/components/shadcn/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/shadcn/ui/collapsible"
import { Target, Settings2, Zap, ChevronDown } from "lucide-react"
import { useContentGenerator } from "~/hooks/use-content-generator"
import { useState } from "react"

export function SEOParamsForm() {
  const { seoParams: params, updateSeoParams: onParamsChange } = useContentGenerator()
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  return (
    <>
      <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Target className="h-4 w-4 text-primary" />
          Essential Keywords
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Primary Keyword</Label>
              <Input
                placeholder="e.g., Next.js 15"
                value={params.primaryKeyword}
                onChange={(e) => onParamsChange({ primaryKeyword: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Search Intent</Label>
              <Select value={params.searchIntent} onValueChange={(v) => onParamsChange({ searchIntent: v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="informational">Informational</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="transactional">Transactional</SelectItem>
                  <SelectItem value="navigational">Navigational</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between p-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-all group">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm font-medium">Advanced Settings</span>
            <span className="text-xs text-muted-foreground">
              (Optional - Click to {isAdvancedOpen ? "hide" : "customize"})
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${isAdvancedOpen ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-5 mt-5">
          {/* Advanced Keywords */}
          <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-primary" />
              Advanced Keywords
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Secondary Keywords (comma separated)</Label>
                <Input
                  placeholder="e.g., React, SSR, performance, web development"
                  value={params.secondaryKeywords}
                  onChange={(e) => onParamsChange({ secondaryKeywords: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Keyword Density: {params.keywordDensity[0]}%</Label>
                <Slider
                  value={params.keywordDensity}
                  onValueChange={(v) => onParamsChange({ keywordDensity: v })}
                  min={1}
                  max={5}
                  step={0.5}
                />
              </div>
            </div>
          </div>

          {/* Content Settings Section */}
          <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings2 className="h-4 w-4 text-primary" />
              Content Settings
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Content Type</Label>
                  <Select value={params.contentType} onValueChange={(v) => onParamsChange({ contentType: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blog-post">Blog Post</SelectItem>
                      <SelectItem value="article">Long-form Article</SelectItem>
                      <SelectItem value="pillar-content">Pillar Content</SelectItem>
                      <SelectItem value="listicle">Listicle</SelectItem>
                      <SelectItem value="how-to-guide">How-to Guide</SelectItem>
                      <SelectItem value="comparison">Comparison</SelectItem>
                      <SelectItem value="case-study">Case Study</SelectItem>
                      <SelectItem value="product-review">Product Review</SelectItem>
                      <SelectItem value="landing-page">Landing Page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tone</Label>
                  <Select value={params.tone} onValueChange={(v) => onParamsChange({ tone: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="authoritative">Authoritative</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                      <SelectItem value="persuasive">Persuasive</SelectItem>
                      <SelectItem value="educational">Educational</SelectItem>
                      <SelectItem value="inspiring">Inspiring</SelectItem>
                      <SelectItem value="humorous">Humorous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Audience</Label>
                  <Select value={params.targetAudience} onValueChange={(v) => onParamsChange({ targetAudience: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="beginners">Beginners</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="experts">Experts</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="developers">Developers</SelectItem>
                      <SelectItem value="marketers">Marketers</SelectItem>
                      <SelectItem value="entrepreneurs">Entrepreneurs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Reading Level</Label>
                  <Select value={params.readingLevel} onValueChange={(v) => onParamsChange({ readingLevel: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Structure</Label>
                  <Select
                    value={params.contentStructure}
                    onValueChange={(v) => onParamsChange({ contentStructure: v })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="aida">AIDA</SelectItem>
                      <SelectItem value="pas">PAS</SelectItem>
                      <SelectItem value="skyscraper">Skyscraper</SelectItem>
                      <SelectItem value="hub-spoke">Hub & Spoke</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Language</Label>
                  <Select value={params.language} onValueChange={(v) => onParamsChange({ language: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="spanish">Spanish</SelectItem>
                      <SelectItem value="french">French</SelectItem>
                      <SelectItem value="german">German</SelectItem>
                      <SelectItem value="portuguese">Portuguese</SelectItem>
                      <SelectItem value="italian">Italian</SelectItem>
                      <SelectItem value="dutch">Dutch</SelectItem>
                      <SelectItem value="japanese">Japanese</SelectItem>
                      <SelectItem value="chinese">Chinese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Word Count: {params.wordCount[0]?.toLocaleString()}
                </Label>
                <Slider
                  value={params.wordCount}
                  onValueChange={(v) => onParamsChange({ wordCount: v })}
                  min={100}
                  max={1000}
                  step={100}
                />
              </div>
            </div>
          </div>

          {/* Enhancements Section */}
          <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4 text-primary" />
              Enhancements
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Meta Tags", key: "includeMetaTags" as const, state: params.includeMetaTags },
                { label: "FAQ Section", key: "includeFAQ" as const, state: params.includeFAQ },
                {
                  label: "Table of Contents",
                  key: "includeTableOfContents" as const,
                  state: params.includeTableOfContents,
                },
                { label: "Internal Links", key: "includeInternalLinks" as const, state: params.includeInternalLinks },
                { label: "Statistics", key: "includeStats" as const, state: params.includeStats },
                { label: "Expert Quotes", key: "includeQuotes" as const, state: params.includeQuotes },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1.5">
                  <Label className="text-xs">{item.label}</Label>
                  <Switch checked={item.state} onCheckedChange={(checked) => onParamsChange({ [item.key]: checked })} />
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  )
}

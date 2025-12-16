"use client"

import { Label } from "~/components/shadcn/ui/label"
import { Textarea } from "~/components/shadcn/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/shadcn/ui/select"
import { Slider } from "~/components/shadcn/ui/slider"
import { Switch } from "~/components/shadcn/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/shadcn/ui/collapsible"
import { Share2, Settings2, Zap, Twitter, Linkedin, Instagram, Facebook, ChevronDown } from "lucide-react"
import { useContentGenerator } from "~/hooks/use-content-generator"
import type { Platform } from "~/types/content-genreation-types"
import { useState } from "react"

const platformIcons = {
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  facebook: Facebook,
}

export function SocialParamsForm() {
  const { socialParams: params, updateSocialParams: onParamsChange } = useContentGenerator()
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  return (
    <>
      <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Share2 className="h-4 w-4 text-primary" />
          Platform
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(["twitter", "linkedin", "instagram", "facebook"] as Platform[]).map((platform) => {
            const Icon = platformIcons[platform]
            return (
              <button
                key={platform}
                onClick={() => onParamsChange({ selectedPlatform: platform })}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${params.selectedPlatform === platform ? "bg-accent" : "border-border hover:border-primary/50"
                  }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium capitalize">{platform === "twitter" ? "X" : platform}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Additional Context</Label>
        <Textarea
          placeholder="Add specific details, stats, or key points to include..."
          value={params.context}
          onChange={(e) => onParamsChange({ context: e.target.value })}
          className="min-h-[70px] resize-none text-sm"
        />
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
          {/* Post Settings */}
          <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings2 className="h-4 w-4 text-primary" />
              Post Settings
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Post Style</Label>
                  <Select value={params.postStyle} onValueChange={(v) => onParamsChange({ postStyle: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engaging">Engaging</SelectItem>
                      <SelectItem value="informative">Informative</SelectItem>
                      <SelectItem value="promotional">Promotional</SelectItem>
                      <SelectItem value="storytelling">Storytelling</SelectItem>
                      <SelectItem value="thought-leadership">Thought Leadership</SelectItem>
                      <SelectItem value="controversial">Controversial</SelectItem>
                      <SelectItem value="viral">Viral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Content Pillar</Label>
                  <Select value={params.contentPillar} onValueChange={(v) => onParamsChange({ contentPillar: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="educational">Educational</SelectItem>
                      <SelectItem value="inspirational">Inspirational</SelectItem>
                      <SelectItem value="entertaining">Entertaining</SelectItem>
                      <SelectItem value="promotional">Promotional</SelectItem>
                      <SelectItem value="community">Community</SelectItem>
                      <SelectItem value="behind-scenes">Behind the Scenes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Hook Style</Label>
                  <Select value={params.hookStyle} onValueChange={(v) => onParamsChange({ hookStyle: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="question">Question</SelectItem>
                      <SelectItem value="statistic">Statistic</SelectItem>
                      <SelectItem value="bold-statement">Bold Statement</SelectItem>
                      <SelectItem value="story">Story Opener</SelectItem>
                      <SelectItem value="controversial">Controversial</SelectItem>
                      <SelectItem value="problem">Problem/Pain Point</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Post Length</Label>
                  <Select value={params.postLength} onValueChange={(v) => onParamsChange({ postLength: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="long">Long</SelectItem>
                      <SelectItem value="thread">Thread</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">CTA Type</Label>
                  <Select value={params.ctaType} onValueChange={(v) => onParamsChange({ ctaType: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engagement">Engagement</SelectItem>
                      <SelectItem value="traffic">Traffic</SelectItem>
                      <SelectItem value="conversion">Conversion</SelectItem>
                      <SelectItem value="follow">Follow</SelectItem>
                      <SelectItem value="share">Share</SelectItem>
                      <SelectItem value="save">Save</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Target Audience</Label>
                  <Select
                    value={params.targetDemographic}
                    onValueChange={(v) => onParamsChange({ targetDemographic: v })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professionals">Professionals</SelectItem>
                      <SelectItem value="entrepreneurs">Entrepreneurs</SelectItem>
                      <SelectItem value="creators">Creators</SelectItem>
                      <SelectItem value="students">Students</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Variations: {params.numberOfVariations[0]}</Label>
                  <Slider
                    value={params.numberOfVariations}
                    onValueChange={(v) => onParamsChange({ numberOfVariations: v })}
                    min={1}
                    max={5}
                    step={1}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Hashtags: {params.hashtagCount[0]}</Label>
                  <Slider
                    value={params.hashtagCount}
                    onValueChange={(v) => onParamsChange({ hashtagCount: v })}
                    min={0}
                    max={15}
                    step={1}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Enhancements */}
          <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4 text-primary" />
              Enhancements
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Hashtags", key: "includeHashtags" as const, state: params.includeHashtags },
                { label: "Emojis", key: "includeEmojis" as const, state: params.includeEmojis },
                { label: "CTA", key: "includeCTA" as const, state: params.includeCTA },
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

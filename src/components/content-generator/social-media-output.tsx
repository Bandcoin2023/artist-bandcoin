"use client"

import { useState } from "react"
import { Button } from "~/components/shadcn/ui/button"
import { Card } from "~/components/shadcn/ui/card"
import { Badge } from "~/components/shadcn/ui/badge"
import { Copy, Check, Share2, Twitter, Linkedin, Instagram, Facebook } from "lucide-react"
import { cn } from "~/lib/utils"
import { ShareModal } from "../modal/share-modal"

interface SocialMediaOutputProps {
    content: string
    platform: string
}

const platformIcons = {
    twitter: Twitter,
    linkedin: Linkedin,
    instagram: Instagram,
    facebook: Facebook,
}

const platformColors = {
    twitter: "bg-black dark:bg-neutral-800",
    linkedin: "bg-[#0A66C2]",
    instagram: "bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
    facebook: "bg-[#1877F2]",
}

const platformLimits = {
    twitter: 280,
    linkedin: 3000,
    instagram: 2200,
    facebook: 63206,
}

export function SocialMediaOutput({ content, platform }: SocialMediaOutputProps) {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
    const [shareModalOpen, setShareModalOpen] = useState(false)
    const [selectedPost, setSelectedPost] = useState<{ id: number; title: string; content: string } | null>(null)

    const posts = content
        .split(/(?:--------+|\n\s*Variation\s+\d+:?\s*\n)/gi)
        .map((post) => post.trim())
        .filter((post) => post.length > 0)

    const PlatformIcon = platformIcons[platform as keyof typeof platformIcons] || Share2
    const platformColor = platformColors[platform as keyof typeof platformColors] || "bg-primary"
    const charLimit = platformLimits[platform as keyof typeof platformLimits] || 2000

    const handleCopyPost = async (postContent: string, index: number) => {
        await navigator.clipboard.writeText(postContent)
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 2000)
    }

    const handleSharePost = (postContent: string, index: number) => {
        setSelectedPost({
            id: index,
            title: `Variation ${index + 1}`,
            content: postContent,
        })
        setShareModalOpen(true)
    }

    const formatForPlatform = (content: string, targetPlatform: string) => {
        const limit = platformLimits[targetPlatform as keyof typeof platformLimits] || 2000
        return content.length > limit ? content.substring(0, limit - 3) + "..." : content
    }

    const handleShare = (targetPlatform: string) => {
        if (!selectedPost) return

        const formattedContent = formatForPlatform(selectedPost.content, targetPlatform)

        const urls: Record<string, string> = {
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(formattedContent)}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodeURIComponent(formattedContent)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(formattedContent)}`,
        }

        if (urls[targetPlatform]) {
            window.open(urls[targetPlatform], "_blank", "width=600,height=400")
        }
    }

    const handleCopyForPlatform = async (targetPlatform: string) => {
        if (!selectedPost) return
        const formattedContent = formatForPlatform(selectedPost.content, targetPlatform)
        await navigator.clipboard.writeText(formattedContent)
    }

    const getCharacterCount = (text: string) => {
        return text.length
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center text-white", platformColor)}>
                    <PlatformIcon className="h-4 w-4" />
                </div>
                <div>
                    <h3 className="text-sm font-medium capitalize">{platform} Posts</h3>
                    <p className="text-xs text-muted-foreground">
                        {posts.length} variation{posts.length !== 1 ? "s" : ""} generated
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {posts.map((post, index) => {
                    const charCount = getCharacterCount(post)
                    const isOverLimit = charCount > charLimit
                    const isCopied = copiedIndex === index

                    return (
                        <Card key={index} className="p-4 bg-card border-border hover:border-primary/50 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                                <Badge variant="secondary" className="text-xs">
                                    Variation {index + 1}
                                </Badge>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={() => handleCopyPost(post, index)}>
                                        {isCopied ? (
                                            <>
                                                <Check className="h-3 w-3 text-green-600" />
                                                <span className="text-xs text-green-600">Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3 w-3" />
                                                <span className="text-xs">Copy</span>
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 gap-1.5"
                                        onClick={() => handleSharePost(post, index)}
                                    >
                                        <Share2 className="h-3 w-3" />
                                        <span className="text-xs">Share</span>
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-secondary/30 rounded-lg p-3 mb-2">
                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{post}</p>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                                <span className={cn("font-medium", isOverLimit ? "text-destructive" : "text-muted-foreground")}>
                                    {charCount} / {charLimit} characters
                                    {isOverLimit && " (exceeds limit)"}
                                </span>
                                <span className="text-muted-foreground">{post.split(/\s+/).length} words</span>
                            </div>
                        </Card>
                    )
                })}
            </div>

            <ShareModal
                open={shareModalOpen}
                onOpenChange={setShareModalOpen}
                post={selectedPost}
                onShare={handleShare}
                onCopyForPlatform={handleCopyForPlatform}
                formatForPlatform={formatForPlatform}
            />
        </div>
    )
}

"use client"

import { useState } from "react"
import { Button } from "~/components/shadcn/ui/button"
import { Card } from "~/components/shadcn/ui/card"
import { Copy, Check, Download, Share2, FileText } from "lucide-react"
import { MarkdownRenderer } from "../markdown-renderer"

interface SEOOutputProps {
    content: string
}

export function SEOOutput({ content }: SEOOutputProps) {
    const [copied, setCopied] = useState(false)
    console.log("content", content)
    const handleCopy = async () => {
        await navigator.clipboard.writeText(content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDownload = () => {
        const blob = new Blob([content], { type: "text/markdown" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `seo-content-${Date.now()}.md`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "SEO Content",
                    text: content,
                })
            } catch (err) {
                // User cancelled or share failed
                console.log("Share cancelled")
            }
        } else {
            // Fallback to copy
            handleCopy()
        }
    }

    return (
        <Card className="p-6 bg-card border-border">
            {/* Action Bar */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">SEO Content</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-transparent" onClick={handleCopy}>
                        {copied ? (
                            <>
                                <Check className="h-3.5 w-3.5 text-green-600" />
                                <span className="text-green-600">Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="h-3.5 w-3.5" />
                                Copy All
                            </>
                        )}
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-transparent" onClick={handleShare}>
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-transparent" onClick={handleDownload}>
                        <Download className="h-3.5 w-3.5" />
                        Download
                    </Button>
                </div>
            </div>

            {/* Markdown Content */}
            <div className="">
                <MarkdownRenderer content={content} />
            </div>
        </Card>
    )
}

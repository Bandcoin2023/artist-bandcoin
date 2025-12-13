"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/shadcn/ui/dialog"
import { Button } from "~/components/shadcn/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/shadcn/ui/tabs"
import { Copy, Check, FileText, Code, Globe } from "lucide-react"
import { useToast } from "~/hooks/use-toast"

interface CopyDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    content: string
}

// Convert markdown to plain text
function markdownToPlainText(markdown: string): string {
    return markdown
        .replace(/^#{1,6}\s+/gm, "") // Remove headers
        .replace(/\*\*\*(.+?)\*\*\*/g, "$1") // Remove bold+italic
        .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold
        .replace(/\*(.+?)\*/g, "$1") // Remove italic
        .replace(/_(.+?)_/g, "$1") // Remove italic underscore
        .replace(/~~(.+?)~~/g, "$1") // Remove strikethrough
        .replace(/`(.+?)`/g, "$1") // Remove inline code
        .replace(/\[(.+?)\]$$.+?$$/g, "$1") // Remove links, keep text
        .replace(/!\[(.+?)\]$$.+?$$/g, "") // Remove images
        .replace(/^[-*+]\s+/gm, "• ") // Convert list items to bullets
        .replace(/^\d+\.\s+/gm, "") // Remove numbered list markers
        .replace(/^>\s+/gm, "") // Remove blockquotes
        .replace(/```[\s\S]+?```/g, "") // Remove code blocks
        .replace(/\n{3,}/g, "\n\n") // Remove excessive newlines
        .trim()
}

// Convert markdown to HTML
function markdownToHTML(markdown: string): string {
    return markdown
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/_(.+?)_/g, "<em>$1</em>")
        .replace(/~~(.+?)~~/g, "<del>$1</del>")
        .replace(/`(.+?)`/g, "<code>$1</code>")
        .replace(/\[(.+?)\]$$(.+?)$$/g, '<a href="$2">$1</a>')
        .replace(/^[-*+]\s+(.+)$/gm, "<li>$1</li>")
        .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
        .replace(/<\/li>\n?<li>/g, "</li><li>")
        .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
        .replace(/^>\s+(.+)$/gm, "<blockquote>$1</blockquote>")
        .replace(/\n/g, "<br/>")
}

export function CopyDialog({ open, onOpenChange, content }: CopyDialogProps) {
    const [copiedFormat, setCopiedFormat] = useState<string | null>(null)
    const { toast } = useToast()

    const formats = {
        plain: markdownToPlainText(content),
        html: markdownToHTML(content),
        markdown: content,
    }

    const handleCopy = async (format: keyof typeof formats, formatName: string) => {
        try {
            await navigator.clipboard.writeText(formats[format])
            setCopiedFormat(format)
            toast({
                title: "Copied!",
                description: `Content copied as ${formatName}`,
            })
            setTimeout(() => setCopiedFormat(null), 2000)
        } catch (error) {
            toast({
                title: "Failed to copy",
                description: "Please try again",
                variant: "destructive",
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Copy Content</DialogTitle>
                    <DialogDescription>Choose a format to copy your content without markup</DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="plain" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="plain" className="gap-2">
                            <FileText className="h-4 w-4" />
                            Plain Text
                        </TabsTrigger>
                        <TabsTrigger value="html" className="gap-2">
                            <Code className="h-4 w-4" />
                            HTML
                        </TabsTrigger>
                        <TabsTrigger value="markdown" className="gap-2">
                            <Globe className="h-4 w-4" />
                            Markdown
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="plain" className="space-y-4">
                        <div className="rounded-lg border bg-muted/50 p-4 max-h-[400px] overflow-auto">
                            <pre className="text-sm whitespace-pre-wrap font-sans">{formats.plain}</pre>
                        </div>
                        <Button onClick={() => handleCopy("plain", "Plain Text")} className="w-full" size="lg">
                            {copiedFormat === "plain" ? (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Plain Text
                                </>
                            )}
                        </Button>
                    </TabsContent>

                    <TabsContent value="html" className="space-y-4">
                        <div className="rounded-lg border bg-muted/50 p-4 max-h-[400px] overflow-auto">
                            <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">{formats.html}</pre>
                        </div>
                        <Button onClick={() => handleCopy("html", "HTML")} className="w-full" size="lg">
                            {copiedFormat === "html" ? (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy HTML
                                </>
                            )}
                        </Button>
                    </TabsContent>

                    <TabsContent value="markdown" className="space-y-4">
                        <div className="rounded-lg border bg-muted/50 p-4 max-h-[400px] overflow-auto">
                            <pre className="text-sm whitespace-pre-wrap font-mono">{formats.markdown}</pre>
                        </div>
                        <Button onClick={() => handleCopy("markdown", "Markdown")} className="w-full" size="lg">
                            {copiedFormat === "markdown" ? (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Markdown
                                </>
                            )}
                        </Button>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}

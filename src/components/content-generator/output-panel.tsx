"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "~/components/shadcn/ui/button"
import { FileText, Copy, Check, Download, Sparkles, Loader2, Share2, ChevronDown, ChevronUp } from "lucide-react"
import { MarkdownRenderer } from "~/components/markdown-renderer"
import { ShareModal } from "~/components/modal/share-modal"
import { useContentGenerator } from "~/hooks/use-content-generator"

const platformIcons = {
  twitter: () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  linkedin: () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  instagram: () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
    </svg>
  ),
  facebook: () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
}

// Parse content into individual posts
function parsePostsFromContent(content: string): { id: number; title: string; content: string }[] {
  if (!content) return []

  // Split by "Post X:" pattern
  const postPattern = /Post\s+(\d+):/gi
  const parts = content.split(postPattern)

  const posts: { id: number; title: string; content: string }[] = []

  // parts[0] is content before first "Post X:", parts[1] is the number, parts[2] is content, etc.
  for (let i = 1; i < parts.length; i += 2) {
    const postNumber = Number.parseInt(parts[i], 10)
    const postContent = parts[i + 1]?.trim()

    if (postContent) {
      posts.push({
        id: postNumber,
        title: `Post ${postNumber}`,
        content: postContent,
      })
    }
  }

  // If no posts found with "Post X:" pattern, treat the entire content as a single post
  if (posts.length === 0 && content.trim()) {
    posts.push({
      id: 1,
      title: "Post 1",
      content: content.trim(),
    })
  }

  return posts
}

// Format content for different platforms
function formatForPlatform(content: string, platform: string): string {
  // Remove markdown formatting for social media
  let formatted = content
    .replace(/#{1,6}\s/g, "") // Remove headers
    .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
    .replace(/\*(.*?)\*/g, "$1") // Remove italic
    .replace(/`(.*?)`/g, "$1") // Remove inline code
    .replace(/\[([^\]]+)\]$$[^)]+$$/g, "$1") // Convert links to text
    .replace(/^\s*[-*+]\s/gm, "• ") // Convert list items to bullets
    .trim()

  switch (platform) {
    case "twitter":
      // Twitter has 280 char limit, truncate if needed
      if (formatted.length > 280) {
        formatted = formatted.substring(0, 277) + "..."
      }
      break
    case "linkedin":
      // LinkedIn supports longer posts, keep as is but ensure proper line breaks
      formatted = formatted.replace(/\n{3,}/g, "\n\n")
      break
    case "instagram":
      // Instagram caption limit is 2200 chars
      if (formatted.length > 2200) {
        formatted = formatted.substring(0, 2197) + "..."
      }
      break
    case "facebook":
      // Facebook has high limit, keep as is
      break
  }

  return formatted
}

// Get share URL for each platform
function getShareUrl(content: string, platform: string): string {
  const encodedContent = encodeURIComponent(content)

  switch (platform) {
    case "twitter":
      return `https://twitter.com/intent/tweet?text=${encodedContent}`
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodedContent}`
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?quote=${encodedContent}`
    default:
      return "#"
  }
}

interface PostCardProps {
  post: { id: number; title: string; content: string }
  onCopy: (content: string) => void
  onShare: (post: { id: number; title: string; content: string }) => void
  copiedId: number | null
}

function PostCard({ post, onCopy, onShare, copiedId }: PostCardProps) {
  const isCopied = copiedId === post.id

  return (
    <div className="group relative bg-card border border-border rounded-xl p-6 mb-6 transition-all hover:shadow-md">
      {/* Post Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
          {post.title}
        </span>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onCopy(post.content)}>
            {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            <span className="sr-only">Copy post</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onShare(post)}>
            <Share2 className="h-4 w-4" />
            <span className="sr-only">Share post</span>
          </Button>
        </div>
      </div>

      {/* Post Content */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <MarkdownRenderer content={post.content} />
      </div>
    </div>
  )
}

// SEO content section parser
interface SEOSection {
  id: string
  type: "metadata" | "content" | "faq" | "images"
  title: string
  content: string
  rawContent: string
}

function parseSEOContent(content: string): SEOSection[] {
  if (!content) return []

  const sections: SEOSection[] = []
  let sectionId = 0

  // Extract frontmatter metadata
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (frontmatterMatch) {
    sections.push({
      id: `section-${sectionId++}`,
      type: "metadata",
      title: "SEO Metadata",
      content: frontmatterMatch[1],
      rawContent: frontmatterMatch[0],
    })
  }

  // Remove frontmatter for further processing
  const contentWithoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n*/, "").trim()

  // Check for FAQ section
  const faqMatch = contentWithoutFrontmatter.match(/###?\s*FAQ\s*Section[\s\S]*?(?=##\s*Image|$)/i)
  const imageMatch = contentWithoutFrontmatter.match(/##?\s*Image\s*Suggestions[\s\S]*$/i)

  // Get main content (everything before FAQ or Images)
  let mainContent = contentWithoutFrontmatter
  if (faqMatch) {
    mainContent = contentWithoutFrontmatter.substring(0, contentWithoutFrontmatter.indexOf(faqMatch[0]))
  } else if (imageMatch) {
    mainContent = contentWithoutFrontmatter.substring(0, contentWithoutFrontmatter.indexOf(imageMatch[0]))
  }

  // Parse main content into sections by ## headers
  const mainSections = mainContent.split(/(?=^##\s)/m).filter(Boolean)

  for (const section of mainSections) {
    const headerMatch = section.match(/^##\s*(.+?)(?:\n|$)/)
    const title = headerMatch ? headerMatch[1]?.trim() : "Introduction"
    sections.push({
      id: `section-${sectionId++}`,
      type: "content",
      title,
      content: section.trim(),
      rawContent: section.trim(),
    })
  }

  // Add FAQ section if exists
  if (faqMatch) {
    sections.push({
      id: `section-${sectionId++}`,
      type: "faq",
      title: "FAQ Section",
      content: faqMatch[0].trim(),
      rawContent: faqMatch[0].trim(),
    })
  }

  // Add Image suggestions if exists
  if (imageMatch) {
    sections.push({
      id: `section-${sectionId++}`,
      type: "images",
      title: "Image Suggestions",
      content: imageMatch[0].trim(),
      rawContent: imageMatch[0].trim(),
    })
  }

  return sections
}

// SEO Section Card component
interface SEOSectionCardProps {
  section: SEOSection
  onCopy: (content: string, id: string) => void
  onShare: (section: SEOSection) => void
  copiedId: string | null
  isExpanded: boolean
  onToggle: () => void
}

function SEOSectionCard({ section, onCopy, onShare, copiedId, isExpanded, onToggle }: SEOSectionCardProps) {
  const isCopied = copiedId === section.id

  const getTypeStyles = () => {
    switch (section.type) {
      case "metadata":
        return "border-l-blue-500 bg-blue-500/5"
      case "faq":
        return "border-l-amber-500 bg-amber-500/5"
      case "images":
        return "border-l-emerald-500 bg-emerald-500/5"
      default:
        return "border-l-primary bg-card"
    }
  }

  const getTypeBadge = () => {
    switch (section.type) {
      case "metadata":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400"
      case "faq":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      case "images":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      default:
        return "bg-secondary text-muted-foreground"
    }
  }

  return (
    <div
      className={`group relative border border-border rounded-xl mb-4 overflow-hidden border-l-4 ${getTypeStyles()}`}
    >
      {/* Section Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getTypeBadge()}`}>
            {section.type === "metadata"
              ? "META"
              : section.type === "faq"
                ? "FAQ"
                : section.type === "images"
                  ? "IMAGES"
                  : "SECTION"}
          </span>
          <h3 className="font-medium text-sm">{section.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation()
                onCopy(section.rawContent, section.id)
              }}
            >
              {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              <span className="sr-only">Copy section</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation()
                onShare(section)
              }}
            >
              <Share2 className="h-4 w-4" />
              <span className="sr-only">Share section</span>
            </Button>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Section Content */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-border/50">
          <div className="pt-4 prose prose-sm dark:prose-invert max-w-none">
            {section.type === "metadata" ? (
              <div className="font-mono text-xs space-y-2 bg-secondary/50 p-4 rounded-lg">
                {section.content.split("\n").map((line, i) => {
                  const [key, ...valueParts] = line.split(":")
                  const value = valueParts
                    .join(":")
                    .trim()
                    .replace(/^["']|["']$/g, "")
                  return (
                    <div key={i} className="flex gap-2">
                      <span className=" font-semibold">{key}:</span>
                      <span className="text-foreground">{value}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <MarkdownRenderer content={section.content} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function OutputPanel() {
  const { contentMode, socialParams, generatedContent, isGenerating, copied, copyToClipboard } = useContentGenerator()
  const outputRef = useRef<HTMLDivElement>(null)
  const [copiedPostId, setCopiedPostId] = useState<number | null>(null)
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<{ id: number; title: string; content: string } | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (outputRef.current && generatedContent) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [generatedContent])

  const posts = contentMode === "social" ? parsePostsFromContent(generatedContent || "") : []
  const seoSections = contentMode === "seo" ? parseSEOContent(generatedContent || "") : []

  useEffect(() => {
    if (seoSections.length > 0 && expandedSections.size === 0) {
      setExpandedSections(new Set(seoSections.map((s) => s.id)))
    }
  }, [seoSections.length])

  const handleCopyPost = async (content: string, postId: number) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedPostId(postId)
      setTimeout(() => setCopiedPostId(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleCopySection = async (content: string, sectionId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedSectionId(sectionId)
      setTimeout(() => setCopiedSectionId(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleSharePost = (post: { id: number; title: string; content: string }) => {
    setSelectedPost(post)
    setShareModalOpen(true)
  }

  const handleShareSection = (section: SEOSection) => {
    setSelectedPost({
      id: Number.parseInt(section.id.replace("section-", "")),
      title: section.title,
      content: section.rawContent,
    })
    setShareModalOpen(true)
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const handlePlatformShare = (platform: string) => {
    if (!selectedPost) return

    const formattedContent = formatForPlatform(selectedPost.content, platform)

    if (platform === "instagram") {
      navigator.clipboard.writeText(formattedContent)
      alert("Content copied! Open Instagram and paste in your caption.")
    } else {
      const shareUrl = getShareUrl(formattedContent, platform)
      window.open(shareUrl, "_blank", "width=600,height=400")
    }

    setShareModalOpen(false)
  }

  const handleCopyForPlatform = async (platform: string) => {
    if (!selectedPost) return

    const formattedContent = formatForPlatform(selectedPost.content, platform)
    try {
      await navigator.clipboard.writeText(formattedContent)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const PlatformIcon = platformIcons[socialParams.selectedPlatform as keyof typeof platformIcons]

  return (
    <div className="flex-1 flex flex-col bg-secondary/20">
      {/* Output Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg  flex items-center justify-center">
            {contentMode === "seo" ? (
              <FileText className="h-4 w-4 " />
            ) : PlatformIcon ? (
              <PlatformIcon />
            ) : (
              <FileText className="h-4 w-4 " />
            )}
          </div>
          <div>
            <h2 className="text-sm font-medium">Generated Content</h2>
            <p className="text-xs text-muted-foreground">
              {contentMode === "seo"
                ? `SEO-optimized article${seoSections.length > 0 ? ` (${seoSections.length} sections)` : ""}`
                : `${socialParams.selectedPlatform} post${posts.length > 1 ? `s (${posts.length})` : ""}`}
            </p>
          </div>
        </div>
        {generatedContent && (
          <div className="flex items-center gap-2">
            {contentMode === "seo" && seoSections.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs bg-transparent"
                onClick={() => {
                  if (expandedSections.size === seoSections.length) {
                    setExpandedSections(new Set())
                  } else {
                    setExpandedSections(new Set(seoSections.map((s) => s.id)))
                  }
                }}
              >
                {expandedSections.size === seoSections.length ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {expandedSections.size === seoSections.length ? "Collapse All" : "Expand All"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs bg-transparent"
              onClick={copyToClipboard}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied All!" : "Copy All"}
            </Button>
            {/* <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs bg-transparent">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button> */}
          </div>
        )}
      </div>

      {/* Output Content */}
      <div ref={outputRef} className="flex-1 overflow-auto p-8">
        {generatedContent ? (
          <div className="max-w-3xl mx-auto">
            {contentMode === "seo" ? (
              seoSections.length > 0 ? (
                seoSections.map((section) => (
                  <SEOSectionCard
                    key={section.id}
                    section={section}
                    onCopy={handleCopySection}
                    onShare={handleShareSection}
                    copiedId={copiedSectionId}
                    isExpanded={expandedSections.has(section.id)}
                    onToggle={() => toggleSection(section.id)}
                  />
                ))
              ) : (
                // Fallback for SEO content without clear sections
                <div className="group relative bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-end mb-4 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => handleCopySection(generatedContent, "full")}
                    >
                      {copiedSectionId === "full" ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      <span className="text-xs">Copy</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() =>
                        handleShareSection({
                          id: "full",
                          type: "content",
                          title: "Content",
                          content: generatedContent,
                          rawContent: generatedContent,
                        })
                      }
                    >
                      <Share2 className="h-4 w-4" />
                      <span className="text-xs">Share</span>
                    </Button>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <MarkdownRenderer content={generatedContent} />
                  </div>
                </div>
              )
            ) : posts.length > 1 ? (
              // Multiple social posts - render as cards
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onCopy={(content) => handleCopyPost(content, post.id)}
                  onShare={handleSharePost}
                  copiedId={copiedPostId}
                />
              ))
            ) : (
              // Single social post
              <div className="group relative bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-end mb-4 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => posts[0] && handleCopyPost(posts[0].content, 1)}
                  >
                    {copiedPostId === 1 ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    <span className="text-xs">Copy</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => posts[0] && handleSharePost(posts[0])}
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="text-xs">Share</span>
                  </Button>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <MarkdownRenderer content={generatedContent} />
                </div>
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

        {isGenerating && (
          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>AI is generating your content...</span>
          </div>
        )}
      </div>

      {/* Share Modal */}
      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        post={selectedPost}
        onShare={handlePlatformShare}
        onCopyForPlatform={handleCopyForPlatform}
        formatForPlatform={formatForPlatform}
      />
    </div>
  )
}

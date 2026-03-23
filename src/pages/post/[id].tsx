"use client"

import { useState, useRef } from "react"
import { MoreHorizontal, Copy, Heart, Share2, Lock, CreditCard, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react"
import { Button } from "~/components/shadcn/ui/button"
import { useRouter } from "next/router"
import { motion, AnimatePresence } from "framer-motion"
import { AddPostComment } from "~/components/post/comment/add-post-comment"
import { SinglePostCommentSection } from "~/components/post/comment/single-post-comment-section"
import { api } from "~/utils/api"
import { Card, CardContent, CardHeader } from "~/components/shadcn/ui/card"
import { Skeleton } from "~/components/shadcn/ui/skeleton"
import type { Media, Post, PostGroup } from "@prisma/client"
import { getAssetBalanceFromBalance } from "~/lib/stellar/marketplace/test/acc"
import { useSession } from "next-auth/react"
import MediaGallery from "~/components/post/media-gallary"
import CustomAvatar from "~/components/common/custom-avatar"
import { toast } from "~/hooks/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/shadcn/ui/dropdown-menu"
import { Preview } from "~/components/common/quill-preview"
import Link from "next/link"
import { cn } from "~/lib/utils"

const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays === 0) {
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
        if (diffHours === 0) {
            const diffMinutes = Math.floor(diffTime / (1000 * 60))
            return `${diffMinutes}m ago`
        }
        return `${diffHours}h ago`
    } else if (diffDays < 7) {
        return `${diffDays}d ago`
    }
    return date.toLocaleDateString()
}

function SinglePostPage() {
    const router = useRouter()
    const postId = router.query?.id
    if (typeof postId === "string") return <PostViewCheck postId={postId} />
    return null
}

const PostViewCheck = ({ postId }: { postId: string }) => {
    const session = useSession()
    const router = useRouter()

    const { data, error, isLoading } = api.fan.post.getAPost.useQuery(Number(postId), {
        refetchOnWindowFocus: false,
        enabled: !!postId,
    })
    const accBalances = api.wallate.acc.getUserPubAssetBallances.useQuery(undefined, {
        enabled: !!session.data?.user?.id,
    })

    const locked = !!data?.subscription
    let hasAccess = !locked

    if (locked && data?.subscription) {
        let pageAssetCode: string | undefined
        let pageAssetIssuer: string | undefined
        const customPageAsset = data.creator.customPageAssetCodeIssuer
        const pageAsset = data.creator.pageAsset
        if (pageAsset) {
            pageAssetCode = pageAsset.code
            pageAssetIssuer = pageAsset.issuer
        } else if (customPageAsset) {
            const [code, issuer] = customPageAsset.split("-")
            pageAssetCode = code
            pageAssetIssuer = issuer
        }
        const bal = getAssetBalanceFromBalance({ balances: accBalances.data, code: pageAssetCode, issuer: pageAssetIssuer })
        hasAccess = data.subscription.price <= (bal || 0) || data.creatorId === session.data?.user?.id
    }

    if (isLoading) return <SinglePostSkeleton />

    if (data) {
        return (
            <SinglePostView
                key={data.id}
                post={data}
                creator={data.creator}
                likeCount={data._count.likes}
                commentCount={data._count.comments}
                locked={locked}
                show={hasAccess}
                media={data.medias}
            />
        )
    }

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-sm px-6">
                <div className="text-5xl mb-4">{`(╯°□°)╯︵ ┻━┻`}</div>
                <h2 className="text-xl font-bold mb-2">Post Not Found</h2>
                <p className="text-muted-foreground text-sm mb-6">We couldn{"'"}t find a post with this URL.</p>
                <Button variant="outline" onClick={() => router.push("/home")}>Go to Feed</Button>
            </div>
        </div>
    )
}

interface PostCardProps {
    post: PostGroup & {
        medias: Media[]
        subscription?: { id: number; name: string; price: number } | null
        creator: {
            id: string
            name: string
            profileUrl: string | null
            pageAsset?: { code: string; issuer: string } | null
            customPageAssetCodeIssuer?: string | null
        }
    }
    creator: {
        id: string
        name: string
        profileUrl: string | null
        pageAsset?: { code: string; issuer: string } | null
        customPageAssetCodeIssuer?: string | null
    }
    likeCount: number
    commentCount: number
    locked: boolean
    show: boolean
    media: Media[]
}

const SinglePostView = ({ post, creator, likeCount: initialLikeCount, commentCount, locked, show, media }: PostCardProps) => {
    const router = useRouter()
    const [showAllMedia, setShowAllMedia] = useState(false)
    const [isLiked, setIsLiked] = useState(false)
    const [likeCount, setLikeCount] = useState(initialLikeCount)

    const likeMutation = api.fan.post.likeApost.useMutation({
        onSuccess: () => { setIsLiked(true); setLikeCount(p => p + 1) },
    })
    const unlikeMutation = api.fan.post.unLike.useMutation({
        onSuccess: () => { setIsLiked(false); setLikeCount(p => Math.max(0, p - 1)) },
    })

    const toggleLike = () => {
        if (isLiked) unlikeMutation.mutate(post.id)
        else likeMutation.mutate(post.id)
    }

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({ title: post?.heading || "Check out this post", url: window.location.href })
            } else {
                await navigator.clipboard.writeText(window.location.href)
                toast({ title: "Link copied", description: "Post link copied to clipboard" })
            }
        } catch (e) { console.error(e) }
    }

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href)
            toast({ title: "Link copied", description: "Post link copied to clipboard" })
        } catch {
            toast({ title: "Error", description: "Failed to copy link", variant: "destructive" })
        }
    }

    const displayMedia = showAllMedia ? media : media?.slice(0, 3)
    const hasLotsOfMedia = media && media.length > 3

    if (!creator) return <div className="flex items-center justify-center">No creator found</div>

    return (
        // Full-viewport centered layout
        <div className=" flex flex-col ">

            {/* ── Back nav bar (mobile) ── */}
            <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b sticky top-0 bg-background z-10">
                <button onClick={() => router.back()} className="rounded-full p-1.5 hover:bg-muted transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <span className="font-semibold text-sm">Post</span>
            </div>

            {/* ── Main layout ── */}
            <div className="flex-1 flex flex-col md:flex-row md:items-stretch w-full md:max-w-6xl mx-auto md:h-[calc(100vh-11.5vh)]">

                {/* ══ LEFT: Media panel ══════════════════════════════════════ */}
                <div className="bg-black md:flex-1 md:sticky md:top-0 md:h-[calc(100vh-11vh)] w-full flex flex-col">
                    {show ? (
                        media && media.length > 0 ? (
                            <div className="flex flex-col h-full">
                                <div className="flex-1 min-h-0 overflow-hidden">
                                    <MediaGallery
                                        media={displayMedia}
                                        autoPlay={false}
                                        fillHeight
                                    />
                                </div>
                                {hasLotsOfMedia && (
                                    <div className="px-3 py-2 border-t border-white/10 flex-shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-white/60 hover:text-white hover:bg-white/10 gap-1.5 text-xs"
                                            onClick={() => setShowAllMedia(v => !v)}
                                        >
                                            {showAllMedia
                                                ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                                                : <><ChevronDown className="h-3.5 w-3.5" /> Show all {media.length} items</>
                                            }
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <p className="text-white/40 text-sm">No media available</p>
                            </div>
                        )
                    ) : (
                        <LockedMediaPlaceholder
                            price={post.subscription?.price ?? 0}
                            assetCode={creator.pageAsset?.code ?? creator.customPageAssetCodeIssuer?.split("-")[0] ?? ""}
                        />
                    )}
                </div>

                {/* ══ RIGHT: Details panel ══════════════════════════════════ */}
                <div className="w-full md:w-[380px] md:flex-shrink-0 flex flex-col md:h-[calc(100vh-11vh)] md:overflow-hidden border-l border-border/60">

                    {/* Header */}
                    <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
                        <Link href={`/${creator.id}`} className="flex items-center gap-2.5 group">
                            <CustomAvatar url={creator.profileUrl} />
                            <div>
                                <p className="font-semibold text-sm group-hover:underline leading-tight">{creator.name || "User"}</p>
                                <p className="text-[11px] text-muted-foreground">{formatDate(post.createdAt.toString())}</p>
                            </div>
                        </Link>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={copyLink}>
                                    <Copy className="mr-2 h-4 w-4" />Copy link
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Post heading + caption */}
                    {show && (post.heading || post.content) && (
                        <div className="px-4 py-3 border-b flex-shrink-0 space-y-1">
                            {post.heading && post.heading !== "Heading" && (
                                <h1 className="font-bold text-base leading-snug">{post.heading}</h1>
                            )}
                            {post.content && (
                                <div className="text-sm text-muted-foreground leading-relaxed">
                                    <Preview value={post.content} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Comments — scrollable */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                        <SinglePostCommentSection postId={post?.id || 1} initialCommentCount={commentCount || 0} />
                    </div>

                    {/* Action bar */}
                    <div className="border-t flex-shrink-0 bg-background">
                        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn("h-9 w-9 rounded-full transition-colors", isLiked && "text-red-500")}
                                    onClick={toggleLike}
                                    disabled={likeMutation.isLoading || unlikeMutation.isLoading}
                                >
                                    {likeMutation.isLoading || unlikeMutation.isLoading
                                        ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        : <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                                    }
                                </Button>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={handleShare}>
                                    <Share2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-sm font-semibold tabular-nums">{likeCount.toLocaleString()} likes</p>
                        </div>

                        {/* Comment input */}
                        <div className="px-4 pb-4">
                            <AddPostComment postGroupId={post?.id || 1} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Locked content placeholder for the media panel
function LockedMediaPlaceholder({ price, assetCode }: { price: number; assetCode: string }) {
    return (
        <Link href="/marketplace?tab=PAGE%20ASSETS" className="flex-1 flex items-center justify-center w-full h-full">
            <div className="flex flex-col items-center gap-4 text-center px-8 max-w-xs">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Lock className="h-7 w-7 text-amber-500" />
                </div>
                <div>
                    <p className="text-white font-semibold text-lg mb-1">Locked Content</p>
                    <p className="text-white/50 text-sm">
                        Requires {price} {assetCode} to unlock
                    </p>
                </div>
                <Button className="gap-2 mt-1">
                    <CreditCard className="h-4 w-4" />
                    Get Access
                </Button>
            </div>
        </Link>
    )
}

export default SinglePostPage

// ── Skeletons ──────────────────────────────────────────────────────────────────

function MediaGallerySkeleton() {
    return (
        <div className="w-full h-full flex flex-col bg-black min-h-[300px] md:min-h-0">
            <Skeleton className="flex-1 w-full bg-gray-800/60 rounded-none" />
            <div className="h-14 bg-gray-900/80 flex items-center gap-2 px-3">
                <Skeleton className="h-6 w-6 rounded-full bg-gray-700" />
                <Skeleton className="h-1 flex-1 bg-gray-700 rounded" />
                <Skeleton className="h-6 w-6 rounded-full bg-gray-700" />
                <Skeleton className="h-6 w-6 rounded-full bg-gray-700" />
            </div>
        </div>
    )
}

export function SinglePostSkeleton() {
    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row md:max-w-6xl mx-auto">
            {/* Media skeleton */}
            <div className="bg-black md:flex-1 md:sticky md:top-0 md:h-screen flex flex-col">
                <MediaGallerySkeleton />
            </div>

            {/* Details skeleton */}
            <div className="w-full md:w-[380px] flex flex-col border-l border-border/60">
                {/* Header */}
                <div className="p-4 border-b flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex flex-col gap-1.5 flex-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                </div>

                {/* Caption */}
                <div className="p-4 border-b space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>

                {/* Comments */}
                <div className="flex-1 p-4 space-y-5">
                    {[48, 64, 32].map((h, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-3.5 w-24" />
                                <Skeleton className={`h-${h === 32 ? "4" : h === 48 ? "8" : "10"} w-full`} />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="border-t p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <Skeleton className="h-4 w-20 ml-auto" />
                    </div>
                    <Skeleton className="h-10 w-full rounded-full" />
                </div>
            </div>
        </div>
    )
}
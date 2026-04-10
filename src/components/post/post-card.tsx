"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "~/components/shadcn/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "~/components/shadcn/ui/card"
import { Badge } from "~/components/shadcn/ui/badge"
import {
    Heart, MessageCircle, Share2, Lock, Globe,
    CreditCard, Loader2, LockOpen
} from 'lucide-react'
import { cn } from "~/lib/utils"
import MediaGallery from "./media-gallary"
import QRCode from "react-qr-code"
import type { Media, Post, PostGroup } from "@prisma/client"
import { api } from "~/utils/api"
import CustomAvatar from "../common/custom-avatar"
import { useShareModalStore } from "../store/share-modal-store"
import { CommentSection } from "./comment/post-comment-section"
import { Preview } from "../common/quill-preview"
import { PostContextMenu } from "../common/post-context-menu"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "../shadcn/ui/avatar"

interface PostCardProps {
    post: PostGroup & {
        medias: Media[]
        subscription?: {
            id: number
            name: string
            price: number
        } | null
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
    unCollectedPostId?: number | null
}

export default function PostCard({ post, creator, likeCount, commentCount, locked, show, media, unCollectedPostId }: PostCardProps) {
    const [expanded, setExpanded] = useState(false)
    const [showAllMedia, setShowAllMedia] = useState(false)
    const [showComments, setShowComments] = useState(false)
    const [deletePostId, setDeletePostId] = useState<number | null>(null)
    const [showFullscreenQR, setShowFullscreenQR] = useState(false)

    const postUrl = `/post/${post.id}`
    const fullPostUrl = typeof window !== "undefined" ? `${window.location.origin}${postUrl}` : postUrl

    const { data: liked } = api.fan.post.isLiked.useQuery(post.id)
    const { setIsOpen: setShareModalOpen, setData } = useShareModalStore()

    const deleteLike = api.fan.post.unLike.useMutation()
    const likeMutation = api.fan.post.likeApost.useMutation()

    const toggleLike = () => {
        if (liked) deleteLike.mutate(post.id)
        else likeMutation.mutate(post.id)
    }

    const hasLotsOfMedia = media && media.length > 3
    const displayMedia = showAllMedia ? media : media?.slice(0, 3)

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

    return (
        <Card
            className={cn(
                "overflow-hidden rounded-none border-x-0 border-t-0 border-b border-zinc-200 bg-white shadow-none transition-colors dark:border-zinc-800 dark:bg-zinc-950",
                deletePostId === post.id && "animate-pulse border-red-300"
            )}
        >
            <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between">
                    <div className="flex w-full items-start gap-3">
                        <Link href={`/${creator.id}`}>
                            <Avatar className="h-11 w-11 border border-zinc-200 dark:border-zinc-700">
                                <AvatarImage src={creator.profileUrl ?? undefined} alt={creator.name} />
                                <AvatarFallback>{creator.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </Link>
                        <div className="flex w-full justify-between gap-2 pt-0.5">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 leading-none">
                                    <Link href={`/${creator.id}`}>
                                        <span className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">{creator.name}</span>
                                    </Link>
                                    <Badge variant={locked ? "outline" : "secondary"} className={cn("h-5 rounded px-1 text-[11px]")}>
                                        {locked
                                            ? show
                                                ? <LockOpen className="w-3 h-3 mr-1" />
                                                : <Lock className="w-3 h-3 mr-1" />
                                            : <Globe className="w-3 h-3 mr-1" />}
                                        {locked ? (show ? "Unlocked" : "Locked") : "Public"}
                                    </Badge>
                                </div>
                                <p className="mt-1 flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
                                    {formatDate(post.createdAt.toString())}
                                </p>
                            </div>
                            {
                                post.medias && post.medias.length > 0 && (
                                    <button
                                        onClick={() => setShowFullscreenQR(true)}
                                    className="flex cursor-pointer flex-col items-center gap-1 transition-opacity hover:opacity-80"
                                    aria-label="View QR code fullscreen"
                                >
                                        <QRCode
                                            value={`${window.location.origin}/action/qr?postId=${unCollectedPostId}`}
                                            size={60}
                                            bgColor="#ffffff"
                                            fgColor="#000000"
                                            level="H"
                                        className="rounded-sm border-2 border-white"
                                    />
                                    <span className="text-center text-[11px] text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
                                        Scan to Collect
                                    </span>
                                </button>
                                )
                            }
                        </div>
                    </div>
                    <PostContextMenu creatorId={creator.id} postId={post.id} setDeletePostId={setDeletePostId} />
                </div>
            </CardHeader>

            <CardContent className="space-y-4 px-4 pb-3 pt-1 overflow-hidden">
                <div className="space-y-3">
                    {!show ? (
                        <LockedContent
                            price={post.subscription?.price ?? 0}
                            assetCode={creator.pageAsset?.code ?? creator.customPageAssetCodeIssuer?.split("-")[0] ?? ""}
                        />
                    ) : (
                        <>
                            {post.heading && post.heading !== "Heading" && (
                                <Link href={postUrl}>
                                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{post.heading}</h2>
                                </Link>
                            )}
                            <div className="text-zinc-700 dark:text-zinc-300">
                                {post.content && post.content.length > 400 && !expanded ? (
                                    <>
                                        <Link href={postUrl}>
                                            <p className="cursor-pointer">
                                                <Preview value={post.content.substring(0, 400)} />
                                            </p>
                                        </Link>
                                        <Button variant="link" size="sm" className="px-0 h-auto" onClick={() => setExpanded(true)}>
                                            See more
                                        </Button>
                                    </>
                                ) : (
                                    <Link href={postUrl}>
                                        <p className="cursor-pointer"><Preview value={post.content} /></p>
                                    </Link>
                                )}
                                {expanded && post.content && post.content.length > 150 && (
                                    <Button variant="link" size="sm" className="px-0 h-auto" onClick={() => setExpanded(false)}>
                                        See less
                                    </Button>
                                )}
                            </div>

                            {media && media.length > 0 && (
                                <div className="space-y-2">
                                    <MediaGallery media={displayMedia} hideTypeBadge hideCounter autoHeightImage />
                                    {hasLotsOfMedia && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full mt-2 gap-1"
                                            onClick={() => setShowAllMedia(!showAllMedia)}
                                        >
                                            {showAllMedia
                                                ? "Show less"
                                                : `Show all ${media.length} items`}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </CardContent>

            <CardFooter className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <div className="flex w-full items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-8 w-auto justify-start gap-1.5 rounded-md px-2.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
                            liked && "text-red-500 dark:text-red-400 font-medium",
                        )}
                        onClick={toggleLike}
                        disabled={deleteLike.isLoading ?? likeMutation.isLoading}
                    >
                        {likeMutation.isLoading ?? deleteLike.isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Heart className={cn("h-4 w-4", liked && "fill-current")} />
                        )}
                        <span className="text-xs">{likeCount}</span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-auto justify-start gap-1.5 rounded-md px-2.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        onClick={() => setShowComments(!showComments)}
                    >
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-xs">{commentCount}</span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-auto justify-start gap-1.5 rounded-md px-2.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        onClick={() => { setShareModalOpen(true); setData(postUrl) }}
                    >
                        <Share2 className="h-4 w-4" />
                        <span className="text-xs">Share</span>
                    </Button>

                </div>
            </CardFooter>

            {showComments && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-4 pb-4"
                >
                    <CommentSection postId={post.id} initialCommentCount={commentCount} />
                </motion.div>
            )}

            {/* Fullscreen QR Code Modal */}
            {showFullscreenQR && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
                    onClick={() => setShowFullscreenQR(false)}
                >
                    <div
                        className="rounded-lg p-8 flex flex-col items-center gap-6 max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-semibold">Collect {post.creator.name}{"'"}s Post</h2>
                        <div className="p-4 bg-white rounded-lg">
                            <QRCode
                                value={`${window.location.origin}/action/qr?postId=${unCollectedPostId}`}
                                size={250}
                                bgColor="#ffffff"
                                fgColor="#000000"
                                level="H"
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setShowFullscreenQR(false)}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            )}
        </Card>

    )
}

function LockedContent({ price, assetCode }: { price: number; assetCode: string }) {
    return (
        <Link href={`/marketplace?tab=PAGE%20ASSETS`}>
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3">
                        <Lock className="h-6 w-6 text-amber-600 dark:text-amber-500" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Locked Content</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            This content requires {price} {assetCode} to view.
                        </p>
                    </div>
                    <Button className="gap-2">
                        <CreditCard className="h-4 w-4" />
                        Get Access
                    </Button>
                </div>
            </div>
        </Link>
    )
}
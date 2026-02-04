"use client"

import type React from "react"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { api } from "~/utils/api"
import { Button } from "~/components/shadcn/ui/button"
import { Badge } from "~/components/shadcn/ui/badge"
import {
    Loader2,
    Music,
    Link,
    XCircle,
    CheckCircle,
    SearchIcon,
    Gift,
    Trash2,
    Plus,
} from "lucide-react"
import Image from "next/image"
import { Skeleton } from "~/components/shadcn/ui/skeleton"
import type { LastFMSearchTrack, LastFmTrack } from "~/lib/lastfm/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/shadcn/ui/dialog"
import { useRouter } from "next/router"
import { Input } from "~/components/shadcn/ui/input"
import { ScrollArea } from "~/components/shadcn/ui/scroll-area"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/shadcn/ui/tabs"
import { Separator } from "~/components/shadcn/ui/separator"
import { useAddRewardModalStore } from "~/components/store/add-spotify-reward-modal-store"
import { useAddLastFMRewardModalStore } from "~/components/store/add-lastfm-reward-modal-store"
import { LastFMTrack } from "@prisma/client"

const LastFmTracksPage = () => {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [isDisconnecting, setIsDisconnecting] = useState(false)
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [showLovedTracksModal, setShowLovedTracksModal] = useState(false)
    const [selectedLovedTrackIndex, setSelectedLovedTrackIndex] = useState(0)

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const {
        data: lastFmAccount,
        isLoading: isLoadingAccount,
        refetch: refetchAccount,
    } = api.lastfm.getlastFMAccount.useQuery(undefined, {
        enabled: status === "authenticated",
    })

    const { data: recentTracks, isLoading: isLoadingRecentTracks } = api.lastfm.getRecentTracks.useQuery(
        { limit: 10 },
        {
            enabled: !!lastFmAccount,
        },
    )

    const { data: topTracks, isLoading: isLoadingTopTracks } = api.lastfm.getTopTracks.useQuery(
        { limit: 10, period: "overall" },
        {
            enabled: !!lastFmAccount,
        },
    )

    const { data: lovedTracks, isLoading: isLoadingLovedTracks } = api.lastfm.getLovedTracks.useQuery(
        { limit: 50 },
        {
            enabled: !!lastFmAccount,
        },
    )

    const { data: searchResults, isLoading: isLoadingSearchResults } = api.lastfm.searchTracks.useQuery(
        { query: debouncedSearchQuery, limit: 10 },
        {
            enabled: debouncedSearchQuery.length > 2,
        },
    )
    console.log("Search Results:", searchResults)
    const disconnectMutation = api.lastfm.disconnectLastFm.useMutation({
        onMutate: () => {
            setIsDisconnecting(true)
        },
        onSuccess: () => {
            refetchAccount()
            setIsDisconnecting(false)
            router.push("/artist/lastfm?status=disconnected")
        },
        onError: (error) => {
            console.error("Failed to disconnect:", error)
            setIsDisconnecting(false)
            router.push("/artist/lastfm?status=disconnect_failed")
        },
    })

    useEffect(() => {
        if (router.query.status) {
            console.log("Last.fm connection status:", router.query.status)
            router.replace("/artist/lastfm", undefined, { shallow: true })
        }
    }, [router.query.status])

    if (status === "loading" || isLoadingAccount) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        )
    }

    if (status === "unauthenticated") {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold">Last.fm Creator Dashboard</h1>
                    <p className="text-muted-foreground">Please sign in to continue</p>
                    <Button onClick={() => router.push("/api/auth/signin")}>Sign In</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <div className="w-80 border-r bg-muted/30 p-6">
                <div className="space-y-6">
                    {/* Header */}
                    <div>
                        <h1 className="text-xl font-semibold flex items-center gap-2">
                            <Music className="h-5 w-5" />
                            Last.fm Dashboard
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">Manage your music rewards</p>
                    </div>

                    <Separator />

                    {/* Account Status */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium">Account Status</h3>
                        {lastFmAccount ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Image
                                        src={lastFmAccount.image ?? "/images/logo.png"}
                                        alt="Profile"
                                        width={40}
                                        height={40}
                                        className="rounded-full"
                                        onError={(e) => {
                                            e.currentTarget.src = "/images/logo.png"
                                        }
                                        }
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{lastFmAccount.username}</p>
                                        <p className="text-xs text-muted-foreground truncate">{lastFmAccount.realName}</p>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Connected
                                    </Badge>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => disconnectMutation.mutate()}
                                    disabled={isDisconnecting}
                                    className="w-full text-xs"
                                >
                                    {isDisconnecting ? (
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    ) : (
                                        <XCircle className="w-3 h-3 mr-1" />
                                    )}
                                    Disconnect
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">Connect your Last.fm account to get started</p>
                                <Button size="sm" className="w-full" disabled>
                                    <Link className="w-3 h-3 mr-1" />
                                    Connect Last.fm
                                </Button>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Account Stats */}
                    {lastFmAccount && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium">Account Stats</h3>
                            <div className="space-y-2">
                                {/* <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">Total Scrobbles</span>
                                    <span className="text-sm font-semibold">{lastFmAccount.playCount}</span>
                                </div> */}
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">Country</span>
                                    <span className="text-sm font-semibold">{lastFmAccount.country}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                {lastFmAccount ? (
                    <Tabs defaultValue="search" className="h-full flex flex-col">
                        <div className="border-b px-6 py-4">
                            <TabsList>
                                <TabsTrigger value="search">Search & Add</TabsTrigger>
                                <TabsTrigger value="library">Your Music</TabsTrigger>
                                <TabsTrigger value="rewards">Rewards</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {/* Search & Add Tab */}
                            <TabsContent value="search" className="h-full p-6 space-y-4">
                                <div className="space-y-4">
                                    <div>
                                        <h2 className="text-lg font-semibold">Search Songs</h2>
                                        <p className="text-sm text-muted-foreground">Find and add songs to your rewards program</p>
                                    </div>

                                    <div className="relative">
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search for songs (artist - track)..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>

                                    <ScrollArea className="h-[calc(100vh-200px)]">
                                        {debouncedSearchQuery.length === 0 ? (
                                            <div className="text-center py-8">
                                                <p className="text-muted-foreground">Start typing to search for tracks</p>
                                            </div>
                                        ) : isLoadingSearchResults ? (
                                            <TrackSkeleton />
                                        ) : searchResults && searchResults.length > 0 ? (
                                            <div className="space-y-2">
                                                {searchResults.map((track: LastFMSearchTrack, index: number) => (
                                                    <div
                                                        key={`${track.artist}-${track.name}-${index}`}
                                                        className="flex items-center gap-3 p-3 border rounded hover:bg-muted/50"
                                                    >
                                                        {track.image && track.image.length > 0 && (
                                                            <Image
                                                                src={track.image[track.image.length - 1]?.["#text"] ?? "/images/logo.png"}
                                                                alt={track.name}
                                                                width={48}
                                                                height={48}
                                                                className="rounded h-8 w-8"
                                                                onError={(e) => {
                                                                    e.currentTarget.src = "/images/logo.png"
                                                                }}
                                                            />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium truncate">{track.name}</p>
                                                            <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                                                        </div>
                                                        <AddRewardButton track={{
                                                            name: track.name,
                                                            artist: {
                                                                name: track.artist,
                                                                url: "",
                                                            },
                                                            url: track.url,
                                                            image: track.image,
                                                        }} />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <p className="text-muted-foreground">No tracks found</p>
                                            </div>
                                        )}
                                    </ScrollArea>
                                </div>
                            </TabsContent>

                            {/* Library Tab */}
                            <TabsContent value="library" className="h-full p-6 space-y-4">
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
                                    {/* Recent Tracks */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold">Recent Tracks</h3>
                                        <ScrollArea className="h-[calc(100vh-50vh)] xl:h-[calc(100vh-30vh)]">
                                            {isLoadingRecentTracks ? (
                                                <TrackSkeleton />
                                            ) : recentTracks && recentTracks.length > 0 ? (
                                                <div className="space-y-2">
                                                    {recentTracks.map((track: LastFmTrack, index: number) => (
                                                        <div
                                                            key={`recent-${track.artist.name}-${track.name}-${index}`}
                                                            className="flex items-center gap-3 p-2 border rounded hover:bg-muted/50"
                                                        >
                                                            {track.image && track.image.length > 0 && (
                                                                <Image
                                                                    src={track.image[track.image.length - 1]?.["#text"] ?? "/images/logo.png"}
                                                                    alt={track.name}
                                                                    width={40}
                                                                    height={40}
                                                                    className="rounded h-8 w-8"
                                                                    onError={(e) => {
                                                                        e.currentTarget.src = "/images/logo.png"
                                                                    }}
                                                                />
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate">{track.name}</p>
                                                                <p className="text-xs text-muted-foreground truncate">{track.artist.name}</p>
                                                                {track.playcount && (
                                                                    <p className="text-xs text-muted-foreground">{track.playcount} plays</p>
                                                                )}
                                                            </div>
                                                            <AddRewardButton track={track} />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-4">
                                                    <p className="text-xs text-muted-foreground">No recent tracks</p>
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </div>

                                    {/* Top Tracks */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold">Your Top Tracks</h3>
                                        <ScrollArea className="h-[calc(100vh-50vh)] xl:h-[calc(100vh-30vh)]">
                                            {isLoadingTopTracks ? (
                                                <TrackSkeleton />
                                            ) : topTracks && topTracks.length > 0 ? (
                                                <div className="space-y-2">
                                                    {topTracks.map((track: LastFmTrack, index: number) => (
                                                        <div
                                                            key={`top-${track.artist.name}-${track.name}-${index}`}
                                                            className="flex items-center gap-3 p-2 border rounded hover:bg-muted/50"
                                                        >
                                                            {track.image && track.image.length > 0 && (
                                                                <Image
                                                                    src={track.image[track.image.length - 1]?.["#text"] ?? "/images/logo.png"}
                                                                    alt={track.name}
                                                                    width={40}
                                                                    height={40}
                                                                    className="rounded h-8 w-8"
                                                                    onError={(e) => {
                                                                        e.currentTarget.src = "/images/logo.png"
                                                                    }}

                                                                />
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate">{track.name}</p>
                                                                <p className="text-xs text-muted-foreground truncate">{track.artist.name}</p>

                                                            </div>
                                                            <AddRewardButton track={track} />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-4">
                                                    <p className="text-xs text-muted-foreground">No top tracks</p>
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Loved Tracks Tab */}
                            <TabsContent value="loved-tracks" className="h-full p-6 space-y-4">
                                <div className="space-y-4">
                                    <h2 className="text-lg font-semibold">Your Loved Tracks</h2>
                                    <ScrollArea className="h-[calc(100vh-150px)]">
                                        {isLoadingLovedTracks ? (
                                            <TrackSkeleton />
                                        ) : lovedTracks && lovedTracks.length > 0 ? (
                                            <div className="space-y-2">
                                                {lovedTracks.map((track: LastFmTrack, index: number) => (
                                                    <div
                                                        key={`loved-${track.artist.name}-${track.name}-${index}`}
                                                        className="flex items-center gap-3 p-3 border rounded hover:bg-muted/50 cursor-pointer"
                                                        onClick={() => {
                                                            setSelectedLovedTrackIndex(index)
                                                            setShowLovedTracksModal(true)
                                                        }}
                                                    >
                                                        {track.image && track.image.length > 0 && (
                                                            <Image
                                                                src={track.image[track.image.length - 1]?.["#text"] ?? "/images/logo.png"}
                                                                alt={track.name}
                                                                width={48}
                                                                height={48}
                                                                className="rounded h-8 w-8"
                                                                onError={(e) => {
                                                                    e.currentTarget.src = "/images/logo.png"
                                                                }}
                                                            />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium truncate">{track.name}</p>
                                                            <p className="text-sm text-muted-foreground truncate">{track.artist.name}</p>
                                                        </div>
                                                        <Badge variant="outline">Loved</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <p className="text-muted-foreground">No loved tracks</p>
                                            </div>
                                        )}
                                    </ScrollArea>
                                </div>

                                {/* Loved Tracks Modal */}
                                {lovedTracks && lovedTracks.length > 0 && (
                                    <Dialog open={showLovedTracksModal} onOpenChange={setShowLovedTracksModal}>
                                        <DialogContent className="max-w-md">
                                            <DialogHeader>
                                                <DialogTitle>Loved Track Details</DialogTitle>
                                            </DialogHeader>
                                            {lovedTracks[selectedLovedTrackIndex] && (
                                                <div className="space-y-4">
                                                    <div className="flex gap-4">
                                                        {lovedTracks[selectedLovedTrackIndex].image &&
                                                            lovedTracks[selectedLovedTrackIndex].image.length > 0 && (
                                                                <Image
                                                                    src={
                                                                        lovedTracks[selectedLovedTrackIndex].image[
                                                                        lovedTracks[selectedLovedTrackIndex].image.length - 1
                                                                        ]?.["#text"] ?? "/images/logo.png"
                                                                    }
                                                                    alt={lovedTracks[selectedLovedTrackIndex].name}
                                                                    width={100}
                                                                    height={100}
                                                                    className="rounded h-8 w-8"
                                                                    onError={(e) => {
                                                                        e.currentTarget.src = "/images/logo.png"
                                                                    }}
                                                                />
                                                            )}
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-sm">{lovedTracks[selectedLovedTrackIndex].name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {lovedTracks[selectedLovedTrackIndex].artist.name}
                                                            </p>
                                                            <a
                                                                href={lovedTracks[selectedLovedTrackIndex].url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-primary hover:underline mt-2 inline-block"
                                                            >
                                                                View on Last.fm
                                                            </a>
                                                        </div>
                                                    </div>
                                                    <AddRewardButton track={lovedTracks[selectedLovedTrackIndex]} />
                                                </div>
                                            )}
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </TabsContent>

                            {/* Rewards Tab */}
                            <TabsContent value="rewards" className="h-full p-6 space-y-4">
                                <RewardedSongsList />
                            </TabsContent>
                        </div>
                    </Tabs>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-4">
                            <Music className="w-16 h-16 mx-auto text-muted-foreground" />
                            <h2 className="text-xl font-semibold">Connect Last.fm Account</h2>
                            <p className="text-muted-foreground max-w-sm">
                                Connect your Last.fm account to start managing your music and rewards
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// Add Reward Button Component
const AddRewardButton = ({ track }: { track: LastFmTrack }) => {
    const { openDialog } = useAddLastFMRewardModalStore()
    const { data: rewardStatus, isLoading } = api.lastfm.getRewardedTrackStatus.useQuery({
        lastFMTrackURL: track.url,
    })

    const isRewarded = !!rewardStatus

    if (isLoading) {
        return (
            <Button size="sm" variant="outline" disabled>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            </Button>
        )
    }

    if (isRewarded) {
        return (
            <Badge variant="default" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Rewarded
            </Badge>
        )
    }

    return (
        <Button
            size="sm"
            variant="outline"
            onClick={() => {
                openDialog({
                    name: track.name,
                    artist: {
                        name: track.artist.name,
                        url: track.artist.url
                    },
                    url: track.url,
                    image: track.image

                })
            }}
        >
            <Plus className="w-4 h-4 mr-1" />
            Add Reward
        </Button>
    )
}


const RewardedSongsList: React.FC = () => {
    const utils = api.useUtils()

    const removeRewardMutation = api.lastfm.removeRewardedTrack.useMutation({
        onSuccess: (data, variables) => {
            utils.lastfm.getCreatorRewardedTracks.setInfiniteData({ limit: 10 }, (oldData) => {
                if (!oldData) return oldData
                return {
                    ...oldData,
                    pages: oldData.pages.map((page) => ({
                        ...page,
                        items: page.items.filter((item) => item.id !== variables.id),
                    })),
                }
            })
            utils.lastfm.getCreatorRewardedTracks.invalidate()
            toast.success("Track removed from rewards!")
        },
        onError: () => {
            toast.error("Failed to remove track")
        },
    })

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
        api.lastfm.getCreatorRewardedTracks.useInfiniteQuery(
            { limit: 10 },
            { getNextPageParam: (lastPage) => lastPage.nextCursor },
        )

    const rewardedTracks = data?.pages.flatMap((page) => page.items) ?? []

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Rewarded Songs</h2>
                    <p className="text-sm text-muted-foreground">Manage your active reward tracks</p>
                </div>
                {rewardedTracks.length > 0 && <Badge variant="secondary">{rewardedTracks.length} active</Badge>}
            </div>

            <ScrollArea className="h-[calc(100vh-30vh)]">
                {isLoading && rewardedTracks.length === 0 ? (
                    <TrackSkeleton />
                ) : rewardedTracks.length > 0 ? (
                    <div className="space-y-2">

                        {rewardedTracks.map((reward: LastFMTrack) => (
                            <div key={reward.id} className="flex items-center gap-3 p-3 border rounded">
                                <Image
                                    src={reward.albumCoverUrl ?? "/images/logo.png"}
                                    alt={reward.trackName}
                                    width={48}
                                    height={48}
                                    className="rounded h-8 w-8"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{reward.trackName}</p>
                                    <p className="text-sm text-muted-foreground truncate">{reward.artistName}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-xs">
                                            {reward.rewardAmount} {reward.assetId}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">every {reward.rewardIntervalDays} days</span>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeRewardMutation.mutate({ id: Number(reward.id) })}
                                    disabled={removeRewardMutation.isLoading && reward.id === removeRewardMutation.variables?.id}
                                    className="text-xs"
                                >
                                    {removeRewardMutation.isLoading && reward.id === removeRewardMutation.variables?.id ? (
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-3 h-3 mr-1" />
                                    )}
                                    Remove
                                </Button>
                            </div>
                        ))}
                        {isFetchingNextPage && (
                            <div className="flex justify-center py-2">
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No Rewarded Songs</h3>
                        <p className="text-sm text-muted-foreground">Start by searching and adding songs to your rewards program</p>
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
// Track Skeleton Component
const TrackSkeleton = () => (
    <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2 border rounded">
                <Skeleton className="w-10 h-10 rounded" />
                <div className="flex-1 space-y-1">
                    <Skeleton className="w-24 h-4" />
                    <Skeleton className="w-20 h-3" />
                </div>
                <Skeleton className="w-16 h-6" />
            </div>
        ))}
    </div>
)
export default LastFmTracksPage

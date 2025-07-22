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
    ChevronDown,
    ArrowLeft,
    Gift,
    SearchIcon,
    Trash2,
    Plus,
    Play,
    Pause,
} from "lucide-react"
import Image from "next/image"
import { Skeleton } from "~/components/shadcn/ui/skeleton"
import type { SpotifyPlaylist, SpotifyTrack } from "~/types/spotify"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/shadcn/ui/dialog"
import { useRouter } from "next/router"
import type { SpotifyTrack as ServerSpotifyTrack } from "@prisma/client"
import { Input } from "~/components/shadcn/ui/input"
import { ScrollArea } from "~/components/shadcn/ui/scroll-area"
import { useAddRewardModalStore } from "~/components/store/add-spotify-reward-modal-store"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/shadcn/ui/tabs"
import { Separator } from "~/components/shadcn/ui/separator"

const SpotifyPage = () => {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [isConnecting, setIsConnecting] = useState(false)
    const [isDisconnecting, setIsDisconnecting] = useState(false)
    const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null)
    const [showPlaylistModal, setShowPlaylistModal] = useState(false)
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const {
        data: spotifyAccount,
        isLoading: isLoadingAccount,
        refetch: refetchAccount,
    } = api.spotify.spotifyRouter.getSpotifyAccount.useQuery(undefined, {
        enabled: status === "authenticated",
    })

    const { data: playlists, isLoading: isLoadingPlaylists } = api.spotify.spotifyRouter.getUserPlaylists.useQuery(
        undefined,
        {
            enabled: !!spotifyAccount,
        },
    )

    const { data: topTracks, isLoading: isLoadingTopTracks } = api.spotify.spotifyRouter.getUserTopTracks.useQuery(
        undefined,
        {
            enabled: !!spotifyAccount,
        },
    )

    const { data: currentlyPlaying, isLoading: isLoadingCurrentlyPlaying } =
        api.spotify.spotifyRouter.getUserCurrentlyPlaying.useQuery(undefined, {
            enabled: !!spotifyAccount,
            refetchInterval: 5000,
        })

    const {
        data: playlistTracksData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isLoadingPlaylistTracks,
    } = api.spotify.spotifyRouter.getPlaylistTracks.useInfiniteQuery(
        {
            playlistId: selectedPlaylist?.id ?? "",
            limit: 10,
        },
        {
            getNextPageParam: (lastPage) => {
                if (lastPage.next) {
                    const url = new URL(lastPage.next)
                    return Number(url.searchParams.get("offset"))
                }
                return undefined
            },
            enabled: !!selectedPlaylist && showPlaylistModal,
        },
    )

    const { data: searchResults, isLoading: isLoadingSearchResults } = api.spotify.spotifyRouter.searchTracks.useQuery(
        { query: debouncedSearchQuery, limit: 10 },
        { enabled: debouncedSearchQuery.length > 2 && !!spotifyAccount },
    )

    const playlistTracks = playlistTracksData?.pages.flatMap((page) => page.items) ?? []

    const disconnectMutation = api.spotify.spotifyRouter.disconnectSpotify.useMutation({
        onMutate: () => {
            setIsDisconnecting(true)
        },
        onSuccess: () => {
            refetchAccount()
            setIsDisconnecting(false)
            router.push("/artist/spotify?status=disconnected")
        },
        onError: (error) => {
            console.error("Failed to disconnect:", error)
            setIsDisconnecting(false)
            router.push("/artist/spotify?status=disconnect_failed")
        },
    })

    useEffect(() => {
        if (router.query.status) {
            console.log("Spotify connection status:", router.query.status)
            router.replace("/artist/spotify", undefined, { shallow: true })
        }
    }, [router.query.status])

    const handleConnectSpotify = () => {
        if (status !== "authenticated" || !session?.user?.id) {
            toast.error("You must be signed in to connect your Spotify account.")
            return
        }

        setIsConnecting(true)
        const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
        const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ?? ""
        const scopes = [
            "user-read-private",
            "user-read-email",
            "playlist-read-private",
            "user-read-recently-played",
            "user-follow-read",
            "user-top-read",
            "playlist-read-collaborative",
            "user-library-read",
            "user-read-currently-playing",
        ].join(" ")

        const state = `${session.user.id}_${encodeURIComponent(window.location.pathname)}`
        const authUrl =
            `https://accounts.spotify.com/authorize?` +
            `client_id=${clientId}&` +
            `response_type=code&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=${encodeURIComponent(scopes)}&` +
            `state=${state}&` +
            `show_dialog=true`

        window.location.href = authUrl
    }

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
                    <h1 className="text-2xl font-bold">Spotify Creator Dashboard</h1>
                    <p className="text-muted-foreground">Please sign in to continue</p>
                    <Button onClick={() => router.push("/api/auth/signin")}>Sign In</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-background ">
            {/* Sidebar */}
            <div className="w-80 border-r bg-muted/30 p-6">
                <div className="space-y-6">
                    {/* Header */}
                    <div>
                        <h1 className="text-xl font-semibold flex items-center gap-2">
                            <Music className="h-5 w-5" />
                            Spotify Dashboard
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">Manage your music rewards</p>
                    </div>

                    <Separator />

                    {/* Account Status */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium">Account Status</h3>
                        {spotifyAccount ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Image
                                        src={spotifyAccount.image ?? "/images/logo.png"}
                                        alt="Profile"
                                        width={40}
                                        height={40}
                                        className="rounded-full"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{spotifyAccount.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{spotifyAccount.email}</p>
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
                                <p className="text-sm text-muted-foreground">Connect your Spotify account to get started</p>
                                <Button onClick={handleConnectSpotify} disabled={isConnecting} size="sm" className="w-full">
                                    {isConnecting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Link className="w-3 h-3 mr-1" />}
                                    Connect Spotify
                                </Button>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Currently Playing */}
                    {spotifyAccount && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium">Now Playing</h3>
                            {isLoadingCurrentlyPlaying ? (
                                <div className="flex items-center gap-2">
                                    <Skeleton className="w-10 h-10 rounded" />
                                    <div className="space-y-1">
                                        <Skeleton className="w-24 h-3" />
                                        <Skeleton className="w-20 h-3" />
                                    </div>
                                </div>
                            ) : currentlyPlaying ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Image
                                            src={currentlyPlaying.item?.album?.images?.[0]?.url ?? "/placeholder.svg?height=40&width=40"}
                                            alt={currentlyPlaying.item?.name ?? ""}
                                            width={40}
                                            height={40}
                                            className="rounded"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">{currentlyPlaying.item?.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {currentlyPlaying.item?.artists?.[0]?.name}
                                            </p>
                                        </div>
                                        {currentlyPlaying.is_playing ? (
                                            <Play className="w-3 h-3 text-primary" />
                                        ) : (
                                            <Pause className="w-3 h-3 text-muted-foreground" />
                                        )}
                                    </div>
                                    {currentlyPlaying.item && <AddRewardButton track={currentlyPlaying.item} size="sm" />}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">Nothing playing</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                {spotifyAccount ? (
                    <Tabs defaultValue="search" className="h-full flex flex-col">
                        <div className="border-b px-6 py-4">
                            <TabsList>
                                <TabsTrigger value="search">Search & Add</TabsTrigger>
                                <TabsTrigger value="library">Your Music</TabsTrigger>
                                <TabsTrigger value="rewards">Rewards</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <TabsContent value="search" className="h-full p-6 space-y-4">
                                <div className="space-y-4">
                                    <div>
                                        <h2 className="text-lg font-semibold">Search Songs</h2>
                                        <p className="text-sm text-muted-foreground">Find and add songs to your rewards program</p>
                                    </div>

                                    <div className="relative">
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search for songs..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>

                                    <ScrollArea className="h-[calc(100vh-200px)]">
                                        {isLoadingSearchResults ? (
                                            <div className="space-y-2">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-3 border rounded">
                                                        <Skeleton className="w-12 h-12 rounded" />
                                                        <div className="flex-1 space-y-1">
                                                            <Skeleton className="w-32 h-4" />
                                                            <Skeleton className="w-24 h-3" />
                                                        </div>
                                                        <Skeleton className="w-16 h-6" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : searchResults && searchResults.length > 0 ? (
                                            <div className="space-y-2">
                                                {searchResults.map((track: SpotifyTrack) => (
                                                    <div key={track.id} className="flex items-center gap-3 p-3 border rounded hover:bg-muted/50">
                                                        <Image
                                                            src={track.album?.images?.[0]?.url ?? "/placeholder.svg?height=48&width=48"}
                                                            alt={track.name}
                                                            width={48}
                                                            height={48}
                                                            className="rounded"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium truncate">{track.name}</p>
                                                            <p className="text-sm text-muted-foreground truncate">{track.artists?.[0]?.name}</p>
                                                        </div>
                                                        <AddRewardButton track={track} />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : debouncedSearchQuery ? (
                                            <div className="text-center py-8">
                                                <p className="text-muted-foreground">No results found</p>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <p className="text-muted-foreground">Start typing to search</p>
                                            </div>
                                        )}
                                    </ScrollArea>
                                </div>
                            </TabsContent>

                            <TabsContent value="library" className="h-full p-6 space-y-4">
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
                                    {/* Top Tracks */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold">Your Top Tracks</h3>
                                        <ScrollArea className="h-[calc(100vh-50vh)] xl:h-[calc(100vh-30vh)]">
                                            {isLoadingTopTracks ? (
                                                <TrackSkeleton />
                                            ) : topTracks && topTracks.length > 0 ? (
                                                <div className="space-y-2">
                                                    {topTracks.map((track: SpotifyTrack) => (
                                                        <div
                                                            key={track.id}
                                                            className="flex items-center gap-3 p-2 border rounded hover:bg-muted/50"
                                                        >
                                                            <Image
                                                                src={track.album?.images?.[0]?.url ?? "/placeholder.svg?height=40&width=40"}
                                                                alt={track.name}
                                                                width={40}
                                                                height={40}
                                                                className="rounded"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate">{track.name}</p>
                                                                <p className="text-xs text-muted-foreground truncate">{track.artists?.[0]?.name}</p>
                                                            </div>
                                                            <AddRewardButton track={track} size="sm" />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">No top tracks found</p>
                                            )}
                                        </ScrollArea>
                                    </div>

                                    {/* Playlists */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold">Your Playlists</h3>
                                        <ScrollArea className="h-[calc(100vh-50vh)] xl:h-[calc(100vh-30vh)]">
                                            {isLoadingPlaylists ? (
                                                <PlaylistSkeleton />
                                            ) : playlists && playlists.length > 0 ? (
                                                <div className="space-y-2">
                                                    {playlists.map((playlist: SpotifyPlaylist) => (
                                                        <div
                                                            key={playlist.id}
                                                            className="flex items-center gap-3 p-2 border rounded cursor-pointer hover:bg-muted/50"
                                                            onClick={() => {
                                                                setSelectedPlaylist(playlist)
                                                                setShowPlaylistModal(true)
                                                            }}
                                                        >
                                                            <Image
                                                                src={playlist.images?.[0]?.url ?? "/placeholder.svg?height=40&width=40"}
                                                                alt={playlist.name}
                                                                width={40}
                                                                height={40}
                                                                className="rounded"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate">{playlist.name}</p>
                                                                <p className="text-xs text-muted-foreground">{playlist.tracks?.total} tracks</p>
                                                            </div>
                                                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">No playlists found</p>
                                            )}
                                        </ScrollArea>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="rewards" className="h-full p-6">
                                <RewardedSongsList />
                            </TabsContent>
                        </div>
                    </Tabs>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-4">
                            <Music className="w-12 h-12 text-muted-foreground mx-auto" />
                            <div>
                                <h2 className="text-lg font-semibold">Connect Your Spotify Account</h2>
                                <p className="text-sm text-muted-foreground">Get started by connecting your Spotify account</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Playlist Modal */}
            {selectedPlaylist && (
                <Dialog
                    open={showPlaylistModal}
                    onOpenChange={(open) => {
                        setShowPlaylistModal(open)
                        if (!open) setSelectedPlaylist(null)
                    }}
                >
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setShowPlaylistModal(false)
                                        setSelectedPlaylist(null)
                                    }}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                                <Image
                                    src={selectedPlaylist.images?.[0]?.url ?? "/placeholder.svg?height=48&width=48"}
                                    alt={selectedPlaylist.name}
                                    width={48}
                                    height={48}
                                    className="rounded"
                                />
                                <div>
                                    <DialogTitle>{selectedPlaylist.name}</DialogTitle>
                                    <DialogDescription>{selectedPlaylist.tracks?.total} tracks</DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                        <ScrollArea className="max-h-96">
                            {isLoadingPlaylistTracks && playlistTracks.length === 0 ? (
                                <TrackSkeleton />
                            ) : playlistTracks.length > 0 ? (
                                <div className="space-y-2">
                                    {playlistTracks.map((item: { track: SpotifyTrack }) => (
                                        <div key={item.track.id} className="flex items-center gap-3 p-2 border rounded">
                                            <Image
                                                src={item.track.album?.images?.[0]?.url ?? "/placeholder.svg?height=40&width=40"}
                                                alt={item.track.name}
                                                width={40}
                                                height={40}
                                                className="rounded"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{item.track.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{item.track.artists?.[0]?.name}</p>
                                            </div>
                                            <AddRewardButton track={item.track} size="sm" />
                                        </div>
                                    ))}
                                    {hasNextPage && (
                                        <Button
                                            onClick={() => fetchNextPage()}
                                            disabled={isFetchingNextPage}
                                            className="w-full mt-2"
                                            size="sm"
                                        >
                                            {isFetchingNextPage ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : "Load More"}
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No tracks found</p>
                            )}
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}

const AddRewardButton: React.FC<{ track: SpotifyTrack; size?: "sm" | "default" }> = ({ track, size = "default" }) => {
    const { openDialog: openAddRewardDialog } = useAddRewardModalStore()

    const { data: rewardedTrackStatus, isLoading: isLoadingStatus } =
        api.spotify.spotifyReward.getRewardedTrackStatus.useQuery({ spotifyTrackId: track.id }, { enabled: !!track.id })

    if (isLoadingStatus) {
        return <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
    }

    if (rewardedTrackStatus) {
        return (
            <Badge variant="secondary" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Added
            </Badge>
        )
    }

    return (
        <Button variant="outline" size={size} onClick={() => openAddRewardDialog(track)} className="text-xs">
            <Plus className="w-3 h-3 mr-1" />
            Add
        </Button>
    )
}

const RewardedSongsList: React.FC = () => {
    const utils = api.useUtils()

    const removeRewardMutation = api.spotify.spotifyReward.removeRewardedTrack.useMutation({
        onSuccess: (data, variables) => {
            utils.spotify.spotifyReward.getCreatorRewardedTracks.setInfiniteData({ limit: 10 }, (oldData) => {
                if (!oldData) return oldData
                return {
                    ...oldData,
                    pages: oldData.pages.map((page) => ({
                        ...page,
                        items: page.items.filter((item) => item.id !== variables.id),
                    })),
                }
            })
            utils.spotify.spotifyReward.getCreatorRewardedTracks.invalidate()
            toast.success("Track removed from rewards!")
        },
        onError: () => {
            toast.error("Failed to remove track")
        },
    })

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
        api.spotify.spotifyReward.getCreatorRewardedTracks.useInfiniteQuery(
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
                        {rewardedTracks.map((reward: ServerSpotifyTrack) => (
                            <div key={reward.id} className="flex items-center gap-3 p-3 border rounded">
                                <Image
                                    src={reward.albumCoverUrl ?? "/placeholder.svg?height=48&width=48"}
                                    alt={reward.trackName}
                                    width={48}
                                    height={48}
                                    className="rounded"
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

const PlaylistSkeleton = () => (
    <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2 border rounded">
                <Skeleton className="w-10 h-10 rounded" />
                <div className="flex-1 space-y-1">
                    <Skeleton className="w-24 h-3" />
                    <Skeleton className="w-16 h-3" />
                </div>
            </div>
        ))}
    </div>
)

const TrackSkeleton = () => (
    <div className="space-y-2">
        {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2 border rounded">
                <Skeleton className="w-10 h-10 rounded" />
                <div className="flex-1 space-y-1">
                    <Skeleton className="w-24 h-3" />
                    <Skeleton className="w-16 h-3" />
                </div>
                <Skeleton className="w-12 h-6" />
            </div>
        ))}
    </div>
)

export default SpotifyPage

"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { api } from "~/utils/api"
import { Button } from "~/components/shadcn/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/shadcn/ui/card"
import { Loader2, Music, Link, XCircle, CheckCircle, PlayCircle, ChevronDown, ArrowLeft } from "lucide-react"
import Image from "next/image"
import { Skeleton } from "~/components/shadcn/ui/skeleton"
import type { SpotifyPlaylist, SpotifyTrack } from "~/types/spotify"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/shadcn/ui/dialog" // Added Dialog imports
import { useRouter } from "next/router"

const SpotifyPage = () => {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [isConnecting, setIsConnecting] = useState(false)
    const [isDisconnecting, setIsDisconnecting] = useState(false)
    const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null)
    const [showPlaylistModal, setShowPlaylistModal] = useState(false) // New state for modal visibility

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
            enabled: !!selectedPlaylist && showPlaylistModal, // Only fetch if a playlist is selected AND modal is open
        },
    )

    const playlistTracks = playlistTracksData?.pages.flatMap((page) => page.items) ?? []

    const disconnectMutation = api.spotify.spotifyRouter.disconnectSpotify.useMutation({
        onMutate: () => {
            setIsDisconnecting(true)
        },
        onSuccess: () => {
            refetchAccount()
            setIsDisconnecting(false)
            router.push("/spotify?status=disconnected")
        },
        onError: (error) => {
            console.error("Failed to disconnect:", error)
            setIsDisconnecting(false)
            router.push("/spotify?status=disconnect_failed")
        },
    })

    useEffect(() => {
        if (router.query.status) {
            console.log('Spotify connection status:', router.query.status);
            router.replace('/spotify', undefined, { shallow: true });
        }
    }, [router.query.status]);

    const handleConnectSpotify = () => {
        if (status !== "authenticated" || !session?.user?.id) {
            alert("You must be signed in to connect your Spotify account.")
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
        const state = session.user.id
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
            <div className="flex items-center justify-center min-h-[calc(100vh-10vh)]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-lg">Loading Spotify integration...</span>
            </div>
        )
    }

    if (status === "unauthenticated") {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-10vh)] p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl">Spotify Integration</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Please sign in to connect your Spotify account.</p>
                        <Button onClick={() => router.push("/api/auth/signin")}>Sign In</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 py-8">
            <Card className="mb-8">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Music className="w-8 h-8 text-green-500" />
                        <CardTitle className="text-2xl">Spotify Integration</CardTitle>
                    </div>
                    {spotifyAccount ? (
                        <div className="flex items-center space-x-2 text-green-600">
                            <CheckCircle className="w-5 h-5" />
                            <span>Connected</span>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-2 text-red-600">
                            <XCircle className="w-5 h-5" />
                            <span>Disconnected</span>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    {spotifyAccount ? (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-4">
                                <Image
                                    src={spotifyAccount.image ?? "/placeholder.svg"}
                                    alt="Spotify Profile"
                                    width={80}
                                    height={80}
                                    className="rounded-full"
                                />
                                <div>
                                    <p className="text-xl font-semibold">{spotifyAccount.name}</p>
                                    <p className="text-muted-foreground">{spotifyAccount.email}</p>
                                </div>
                            </div>
                            <Button onClick={() => disconnectMutation.mutate()} disabled={isDisconnecting} variant="destructive">
                                {isDisconnecting ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <XCircle className="w-4 h-4 mr-2" />
                                )}
                                Disconnect Spotify
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-muted-foreground">
                                Connect your Spotify account to sync your music data and enhance your experience.
                            </p>
                            <Button onClick={handleConnectSpotify} disabled={isConnecting}>
                                {isConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link className="w-4 h-4 mr-2" />}
                                Connect with Spotify
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {spotifyAccount && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Currently Playing</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoadingCurrentlyPlaying ? (
                                <CurrentlyPlayingSkeleton />
                            ) : currentlyPlaying ? (
                                <div className="flex items-center space-x-4">
                                    <Image
                                        src={currentlyPlaying.item?.album?.images?.[0]?.url ?? "/placeholder.svg"}
                                        alt={currentlyPlaying.item?.name ?? "Currently Playing"}
                                        width={80}
                                        height={80}
                                        className="rounded-md"
                                    />
                                    <div>
                                        <p className="font-semibold">{currentlyPlaying.item?.name}</p>
                                        <p className="text-sm text-muted-foreground">{currentlyPlaying.item?.artists?.[0]?.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {currentlyPlaying.is_playing ? "Playing" : "Paused"}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-muted-foreground">Nothing currently playing.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Your Playlists</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoadingPlaylists ? (
                                <PlaylistSkeleton />
                            ) : playlists && playlists.length > 0 ? (
                                <div className="space-y-4">
                                    {playlists.map((playlist: SpotifyPlaylist) => (
                                        <div
                                            key={playlist.id}
                                            className="flex items-center space-x-4 cursor-pointer hover:bg-muted p-2 rounded-md"
                                            onClick={() => {
                                                setSelectedPlaylist(playlist)
                                                setShowPlaylistModal(true) // Open modal on playlist click
                                            }}
                                        >
                                            <Image
                                                src={playlist.images?.[0]?.url ?? "/placeholder.svg"}
                                                alt={playlist.name}
                                                width={60}
                                                height={60}
                                                className="rounded-md"
                                            />
                                            <div>
                                                <p className="font-semibold">{playlist.name}</p>
                                                <p className="text-sm text-muted-foreground">{playlist.tracks?.total} tracks</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground">No playlists found.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Your Top Tracks</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoadingTopTracks ? (
                                <TrackSkeleton />
                            ) : topTracks && topTracks.length > 0 ? (
                                <div className="space-y-4">
                                    {topTracks.map((track: SpotifyTrack) => (
                                        <div key={track.id} className="flex items-center space-x-4">
                                            <Image
                                                src={track.album?.images?.[0]?.url ?? "/placeholder.svg"}
                                                alt={track.name}
                                                width={60}
                                                height={60}
                                                className="rounded-md"
                                            />
                                            <div>
                                                <p className="font-semibold">{track.name}</p>
                                                <p className="text-sm text-muted-foreground">{track.artists?.[0]?.name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground">No top tracks found.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Playlist Tracks Modal */}
            {selectedPlaylist && (
                <Dialog
                    open={showPlaylistModal}
                    onOpenChange={(open) => {
                        setShowPlaylistModal(open)
                        if (!open) {
                            setSelectedPlaylist(null) // Clear selected playlist when modal closes
                        }
                    }}
                >
                    <DialogContent className="sm:max-w-[425px] md:max-w-2xl lg:max-w-3xl">
                        <DialogHeader>
                            <div className="flex items-center space-x-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setShowPlaylistModal(false)
                                        setSelectedPlaylist(null)
                                    }}
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                    <span className="sr-only">Back to playlists</span>
                                </Button>
                                <Image
                                    src={selectedPlaylist.images?.[0]?.url ?? "/placeholder.svg"}
                                    alt={selectedPlaylist.name}
                                    width={60}
                                    height={60}
                                    className="rounded-md"
                                />
                                <DialogTitle className="text-xl">{selectedPlaylist.name} Tracks</DialogTitle>
                            </div>
                            <DialogDescription className="text-muted-foreground">
                                {selectedPlaylist.tracks?.total} tracks
                            </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[70vh] overflow-y-auto pr-4">
                            {" "}
                            {/* Added scrollability */}
                            {isLoadingPlaylistTracks && playlistTracks.length === 0 ? (
                                <TrackSkeleton />
                            ) : playlistTracks.length > 0 ? (
                                <div className="space-y-4">
                                    {playlistTracks.map((item: {
                                        track: SpotifyTrack;
                                    }) => (
                                        <div key={item.track.id} className="flex items-center space-x-4">
                                            <Image
                                                src={item.track.album?.images?.[0]?.url ?? "/placeholder.svg"}
                                                alt={item.track.name}
                                                width={60}
                                                height={60}
                                                className="rounded-md"
                                            />
                                            <div>
                                                <p className="font-semibold">{item.track.name}</p>
                                                <p className="text-sm text-muted-foreground">{item.track.artists?.[0]?.name}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="ml-auto">
                                                <PlayCircle className="w-5 h-5" />
                                                <span className="sr-only">Play track</span>
                                            </Button>
                                        </div>
                                    ))}
                                    {hasNextPage && (
                                        <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="w-full mt-4">
                                            {isFetchingNextPage ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 mr-2" />
                                            )}
                                            Load More
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <p className="text-muted-foreground">No tracks found in this playlist.</p>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}

const PlaylistSkeleton = () => (
    <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
                <Skeleton className="w-16 h-16 rounded-md" />
                <div className="space-y-2">
                    <Skeleton className="w-32 h-4" />
                    <Skeleton className="w-24 h-3" />
                </div>
            </div>
        ))}
    </div>
)

const TrackSkeleton = () => (
    <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
                <Skeleton className="w-16 h-16 rounded-md" />
                <div className="space-y-2">
                    <Skeleton className="w-32 h-4" />
                    <Skeleton className="w-24 h-3" />
                </div>
            </div>
        ))}
    </div>
)

const CurrentlyPlayingSkeleton = () => (
    <div className="flex items-center space-x-4">
        <Skeleton className="w-20 h-20 rounded-md" />
        <div className="space-y-2">
            <Skeleton className="w-40 h-5" />
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-24 h-3" />
        </div>
    </div>
)

export default SpotifyPage

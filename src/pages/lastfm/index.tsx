"use client"

import type React from "react"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { api } from "~/utils/api"
import { Button } from "~/components/shadcn/ui/button"
import { Badge } from "~/components/shadcn/ui/badge"
import { Card, CardContent } from "~/components/shadcn/ui/card"
import {
    Loader2,
    Music,
    Link as LinkIcon,
    XCircle,
    CheckCircle,
    SearchIcon,
    Gift,
    Trash2,
    Plus,
    ChevronUp,
    ChevronDown,
    X,
    Youtube,
    Heart,
    Clock,
    TrendingUp,
} from "lucide-react"
import Image from "next/image"
import { Skeleton } from "~/components/shadcn/ui/skeleton"
import type { LastFMSearchTrack, LastFmTrack } from "~/lib/lastfm/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/shadcn/ui/dialog"
import { useRouter } from "next/router"
import { Input } from "~/components/shadcn/ui/input"
import { ScrollArea } from "~/components/shadcn/ui/scroll-area"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/shadcn/ui/tabs"
import { useAddLastFMRewardModalStore } from "~/components/store/add-lastfm-reward-modal-store"
import { LastFMTrack } from "@prisma/client"
import { env } from "~/env"
import { Icons } from "~/components/layout/Left-sidebar/icons"
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerClose,
} from "~/components/shadcn/ui/drawer"

const LastFmTracksPage = () => {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [isConnecting, setIsConnecting] = useState(false)
    const [isDisconnecting, setIsDisconnecting] = useState(false)
    const [showPanelDrawer, setShowPanelDrawer] = useState(false)
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [showLovedTracksModal, setShowLovedTracksModal] = useState(false)
    const [recentTracksLimit, setRecentTracksLimit] = useState(10)
    const [topTracksLimit, setTopTracksLimit] = useState(10)
    const [lovedTracksLimit, setLovedTracksLimit] = useState(50)
    const [mobileMusicView, setMobileMusicView] = useState<"recent" | "top">("recent")

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
        { limit: recentTracksLimit },
        {
            enabled: !!lastFmAccount,
        },
    )

    const { data: topTracks, isLoading: isLoadingTopTracks } = api.lastfm.getTopTracks.useQuery(
        { limit: topTracksLimit, period: "overall" },
        {
            enabled: !!lastFmAccount,
        },
    )

    const { data: lovedTracks, isLoading: isLoadingLovedTracks } = api.lastfm.getLovedTracks.useQuery(
        { limit: lovedTracksLimit },
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

    const saveAccountMutation = api.lastfm.saveLastFmAccount.useMutation({
        onSuccess: () => {
            refetchAccount()
            setIsConnecting(false)
            toast.success("Last.fm account connected successfully!")
            router.push("/lastfm?status=connected")
        },
        onError: (error) => {
            console.error("Failed to save Last.fm account:", error)
            setIsConnecting(false)
            toast.error("Failed to save Last.fm account")
        },
    })

    useEffect(() => {
        if (router.query.success === "true" && router.query.lastfmData) {
            try {
                const lastfmData = JSON.parse(decodeURIComponent(router.query.lastfmData as string)) as { profileUrl: string; image: string | null; username: string; realName: string; sessionKey: string; playCount: number; country: string; }
                saveAccountMutation.mutate(lastfmData)
                router.replace("/lastfm", undefined, { shallow: true })
            } catch (error) {
                console.error("Failed to parse Last.fm data:", error)
                router.replace("/lastfm", undefined, { shallow: true })
            }
        } else if (router.query.status) {
            router.replace("/lastfm", undefined, { shallow: true })
        }
    }, [router.query.success, router.query.lastfmData, router.query.status])

    const handleConnectLastFm = () => {
        if (status !== "authenticated" || !session?.user?.id) {
            toast.error("You must be signed in to connect your Last.fm account")
            return
        }

        setIsConnecting(true)
        const clientId = env.NEXT_PUBLIC_ARTIST_LASTFM_API_KEY
        const callbackUrl = env.NEXT_PUBLIC_ARTIST_LASTFM_CALLBACK_URL ?? ""
        const state = `${session.user.id}_${encodeURIComponent(window.location.pathname)}`

        if (!clientId) {
            toast.error("Last.fm API key is not configured")
            setIsConnecting(false)
            return
        }

        const authUrl =
            `http://www.last.fm/api/auth/?` +
            `api_key=${clientId}&` +
            `callback_url=${encodeURIComponent(callbackUrl)}&` +
            `state=${encodeURIComponent(state)}`

        window.location.href = authUrl
    }

    const disconnectMutation = api.lastfm.disconnectLastFm.useMutation({
        onMutate: () => {
            setIsDisconnecting(true)
        },
        onSuccess: () => {
            refetchAccount()
            setIsDisconnecting(false)
            toast.success("Last.fm account disconnected")
            router.push("/lastfm?status=disconnected")
        },
        onError: (error) => {
            console.error("Failed to disconnect:", error)
            setIsDisconnecting(false)
            toast.error("Failed to disconnect Last.fm account")
        },
    })

    if (status === "loading" || isLoadingAccount) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="font-medium text-sm">Loading your music dashboard...</span>
                </div>
            </main>
        )
    }

    if (status === "unauthenticated") {
        return (
            <main className="min-h-screen flex items-center justify-center p-3">
                <Card className="w-full max-w-md border-slate-200 shadow-lg">
                    <CardContent className="space-y-3 pt-6">
                        <div className="text-center space-y-2">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                                <Music className="h-6 w-6 text-blue-600" />
                            </div>
                            <h1 className="text-2xl font-bold">Last.fm Creator Dashboard</h1>
                            <p className="text-sm text-muted-foreground">Please sign in to continue</p>
                        </div>
                        <Button
                            onClick={() => router.push("/api/auth/signin")}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-9 text-sm"
                        >
                            Sign In to Continue
                        </Button>
                    </CardContent>
                </Card>
            </main>
        )
    }

    return (
        <main className="md:mx-auto md:w-[85vw] md:px-0 relative">
            {/* Header Section */}
            <div className="border-b border-slate-200">
                <div className="px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                                <Music className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold">Last.fm Dashboard</h1>
                                <p className="text-xs text-muted-foreground">Manage your music rewards</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className={`px-2 py-1 text-xs font-medium ${lastFmAccount ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                                <div className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: lastFmAccount ? '#10b981' : '#94a3b8' }} />
                                {lastFmAccount ? 'Connected' : 'Disconnected'}
                            </Badge>
                            {lastFmAccount && (
                                <Button
                                    onClick={() => setShowPanelDrawer(true)}
                                    variant="outline"
                                    size="sm"
                                    className="lg:hidden"
                                >
                                    {showPanelDrawer ? (
                                        <ChevronUp className="h-4 w-4" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-2">
                {/* Mobile Connect Prompt */}
                {!lastFmAccount && (
                    <div className="mb-4 lg:hidden">
                        <Card className="border-blue-200 bg-blue-50 shadow-sm">
                            <CardContent className="space-y-3 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                                        <Music className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm text-blue-900">Connect to Last.fm</p>
                                        <p className="text-xs text-blue-700">Start managing your music rewards</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleConnectLastFm}
                                    disabled={isConnecting}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                                >
                                    {isConnecting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <LinkIcon className="mr-2 h-4 w-4" />
                                    )}
                                    Connect Now
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <div className="grid lg:grid-cols-3 gap-2">
                    {/* Connection Panel - Desktop Only */}
                    <div className="hidden lg:block lg:col-span-1 h-[calc(100vh-25vh)]">
                        <Card className="border-slate-200 shadow-sm h-full">
                            <CardContent className="space-y-4 p-3">
                                {lastFmAccount ? (
                                    <div className="space-y-2 py-0">
                                        <div className="flex items-center gap-2">
                                            {lastFmAccount.image ? (
                                                <Image
                                                    src={lastFmAccount.image || "/placeholder.svg"}
                                                    alt="Last.fm Profile"
                                                    width={48}
                                                    height={48}
                                                    className="rounded-full border border-slate-200"
                                                />
                                            ) : (
                                                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
                                                    <Music className="h-5 w-5 text-slate-400" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-sm truncate">{lastFmAccount.username}</h3>
                                                <p className="text-xs text-muted-foreground">{lastFmAccount.realName}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2 pt-2 border-t border-slate-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-muted-foreground">Country</span>
                                                <span className="text-sm font-semibold">{lastFmAccount.country}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2 pt-2 border-t border-slate-200">
                                            <div className="space-y-1.5">
                                                <p className="text-xs font-semibold uppercase tracking-tight">Connect Platforms</p>
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    <Button
                                                        onClick={() => window.open('https://www.last.fm/about/trackmymusic', '_blank')}
                                                        className="bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 font-medium h-8 text-xs"
                                                        variant="outline"
                                                    >
                                                        <Icons.spotify className="mr-1 h-3 w-3" />
                                                        Spotify
                                                    </Button>
                                                    <Button
                                                        onClick={() => window.open('https://www.last.fm/about/trackmymusic', '_blank')}
                                                        className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-medium h-8 text-xs"
                                                        variant="outline"
                                                    >
                                                        <Youtube className="mr-1 h-3 w-3" />
                                                        YouTube
                                                    </Button>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => disconnectMutation.mutate()}
                                                disabled={isDisconnecting}
                                                className="w-full bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-medium h-8 text-xs"
                                                variant="outline"
                                            >
                                                {isDisconnecting ? (
                                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                ) : (
                                                    <XCircle className="mr-1 h-3 w-3" />
                                                )}
                                                Disconnect
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3 text-center py-1">
                                        <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-blue-100">
                                            <Music className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Not Connected</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Connect your Last.fm account to start</p>
                                        </div>
                                        <div className="flex justify-center">
                                            <Button
                                                onClick={handleConnectLastFm}
                                                disabled={isConnecting}
                                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium h-8 text-sm px-6"
                                            >
                                                {isConnecting ? (
                                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Music className="mr-1 h-3 w-3" />
                                                )}
                                                Connect Last.fm
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-2">
                        {lastFmAccount ? (
                            <Tabs defaultValue="search" className="overflow-hidden flex flex-col">
                                <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0">
                                    <TabsTrigger
                                        value="search"
                                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-2"
                                    >
                                        <SearchIcon className="h-4 w-4 mr-1.5" />
                                        Search
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="library"
                                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-2"
                                    >
                                        <Music className="h-4 w-4 mr-1.5" />
                                        Your Music
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="loved-tracks"
                                        className="hidden lg:flex rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-2"
                                    >
                                        <Heart className="h-4 w-4 mr-1.5" />
                                        Loved Tracks
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="rewards"
                                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 py-2"
                                    >
                                        <Gift className="h-4 w-4 mr-1.5" />
                                        Rewards
                                    </TabsTrigger>
                                </TabsList>

                                <div className="flex-1 overflow-y-auto pt-4">
                                    {/* Search Tab */}
                                    <TabsContent value="search" className="h-full m-0">
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

                                            <ScrollArea className="h-[calc(100vh-15vh)] lg:h-[calc(100vh-44vh)]">
                                                {debouncedSearchQuery.length === 0 ? (
                                                    <div className="text-center py-8">
                                                        <SearchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
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
                                                                        className="rounded h-10 w-10"
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

                                    {/* Library Tab - Different layout for mobile vs desktop */}
                                    <TabsContent value="library" className="h-full m-0">
                                        {/* Mobile View: Toggle buttons instead of nested tabs */}
                                        <div className="lg:hidden space-y-4">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant={mobileMusicView === "recent" ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setMobileMusicView("recent")}
                                                    className="flex-1"
                                                >
                                                    <Clock className="h-4 w-4 mr-1.5" />
                                                    Recent
                                                </Button>
                                                <Button
                                                    variant={mobileMusicView === "top" ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setMobileMusicView("top")}
                                                    className="flex-1"
                                                >
                                                    <TrendingUp className="h-4 w-4 mr-1.5" />
                                                    Top Tracks
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setShowLovedTracksModal(true)
                                                    }}
                                                >
                                                    <Heart className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            {mobileMusicView === "recent" ? (
                                                <div className="space-y-3">
                                                    <h3 className="font-semibold text-sm">Recent Tracks</h3>
                                                    <ScrollArea className="h-[calc(100vh-320px)]">
                                                        {isLoadingRecentTracks ? (
                                                            <TrackSkeleton />
                                                        ) : recentTracks && recentTracks.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {recentTracks.map((track: LastFmTrack, index: number) => (
                                                                    <TrackItem key={`recent-${track.artist.name}-${track.name}-${index}`} track={track} />
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-4">
                                                                <p className="text-xs text-muted-foreground">No recent tracks</p>
                                                            </div>
                                                        )}
                                                    </ScrollArea>
                                                    {recentTracks && recentTracks.length > 0 && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="w-full"
                                                            onClick={() => setRecentTracksLimit(prev => prev + 10)}
                                                            disabled={isLoadingRecentTracks}
                                                        >
                                                            {isLoadingRecentTracks && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                            Load More
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <h3 className="font-semibold text-sm">Your Top Tracks</h3>
                                                    <ScrollArea className="h-[calc(100vh-320px)]">
                                                        {isLoadingTopTracks ? (
                                                            <TrackSkeleton />
                                                        ) : topTracks && topTracks.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {topTracks.map((track: LastFmTrack, index: number) => (
                                                                    <TrackItem key={`top-${track.artist.name}-${track.name}-${index}`} track={track} />
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-4">
                                                                <p className="text-xs text-muted-foreground">No top tracks</p>
                                                            </div>
                                                        )}
                                                    </ScrollArea>
                                                    {topTracks && topTracks.length > 0 && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="w-full"
                                                            onClick={() => setTopTracksLimit(prev => prev + 10)}
                                                            disabled={isLoadingTopTracks}
                                                        >
                                                            {isLoadingTopTracks && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                            Load More
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Desktop View: Side by side layout */}
                                        <div className="hidden lg:grid lg:grid-cols-2 gap-6 h-full">
                                            {/* Recent Tracks */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    <h3 className="font-semibold">Recent Tracks</h3>
                                                </div>
                                                <ScrollArea className="h-[calc(100vh-15vh)] lg:h-[calc(100vh-42vh)]">
                                                    {isLoadingRecentTracks ? (
                                                        <TrackSkeleton />
                                                    ) : recentTracks && recentTracks.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {recentTracks.map((track: LastFmTrack, index: number) => (
                                                                <TrackItem key={`recent-${track.artist.name}-${track.name}-${index}`} track={track} />
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-4">
                                                            <p className="text-xs text-muted-foreground">No recent tracks</p>
                                                        </div>
                                                    )}
                                                </ScrollArea>
                                                {recentTracks && recentTracks.length > 0 && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-full"
                                                        onClick={() => setRecentTracksLimit(prev => prev + 10)}
                                                        disabled={isLoadingRecentTracks}
                                                    >
                                                        {isLoadingRecentTracks && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                        Load More Recent Tracks
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Top Tracks */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                                    <h3 className="font-semibold">Your Top Tracks</h3>
                                                </div>
                                                <ScrollArea className="h-[calc(100vh-15vh)] lg:h-[calc(100vh-42vh)]">
                                                    {isLoadingTopTracks ? (
                                                        <TrackSkeleton />
                                                    ) : topTracks && topTracks.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {topTracks.map((track: LastFmTrack, index: number) => (
                                                                <TrackItem key={`top-${track.artist.name}-${track.name}-${index}`} track={track} />
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-4">
                                                            <p className="text-xs text-muted-foreground">No top tracks</p>
                                                        </div>
                                                    )}
                                                </ScrollArea>
                                                {topTracks && topTracks.length > 0 && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-full"
                                                        onClick={() => setTopTracksLimit(prev => prev + 10)}
                                                        disabled={isLoadingTopTracks}
                                                    >
                                                        {isLoadingTopTracks && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                        Load More Top Tracks
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* Loved Tracks Tab (Desktop only) */}
                                    <TabsContent value="loved-tracks" className="h-full m-0 hidden lg:block">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <Heart className="h-4 w-4 text-red-500" />
                                                <h2 className="text-lg font-semibold">Your Loved Tracks</h2>
                                            </div>
                                            <ScrollArea className=" h-[calc(100vh-15vh)] lg:h-[calc(100vh-42vh)]">
                                                {isLoadingLovedTracks ? (
                                                    <TrackSkeleton />
                                                ) : lovedTracks && lovedTracks.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {lovedTracks.map((track: LastFmTrack, index: number) => (
                                                            <div
                                                                key={`loved-${track.artist.name}-${track.name}-${index}`}
                                                                className="flex items-center gap-3 p-3 border rounded hover:bg-muted/50"
                                                            >
                                                                {track.image && track.image.length > 0 && (
                                                                    <Image
                                                                        src={track.image[track.image.length - 1]?.["#text"] ?? "/images/logo.png"}
                                                                        alt={track.name}
                                                                        width={48}
                                                                        height={48}
                                                                        className="rounded h-10 w-10"
                                                                        onError={(e) => {
                                                                            e.currentTarget.src = "/images/logo.png"
                                                                        }}
                                                                    />
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium truncate">{track.name}</p>
                                                                    <p className="text-sm text-muted-foreground truncate">{track.artist.name}</p>
                                                                </div>
                                                                <AddRewardButton track={track} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8">
                                                        <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                                        <p className="text-muted-foreground">No loved tracks</p>
                                                    </div>
                                                )}
                                            </ScrollArea>
                                            {lovedTracks && lovedTracks.length > 0 && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={() => setLovedTracksLimit(prev => prev + 10)}
                                                    disabled={isLoadingLovedTracks}
                                                >
                                                    {isLoadingLovedTracks && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                    Load More Loved Tracks
                                                </Button>
                                            )}
                                        </div>
                                    </TabsContent>

                                    {/* Rewards Tab */}
                                    <TabsContent value="rewards" className="h-full m-0">
                                        <RewardedSongsList />
                                    </TabsContent>
                                </div>
                            </Tabs>
                        ) : (
                            <div className="flex items-center justify-center h-[60vh]">
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
            </div>

            {/* Mobile Connection Panel Drawer */}
            <Drawer open={showPanelDrawer} onOpenChange={setShowPanelDrawer}>
                <DrawerContent>
                    <DrawerHeader className="flex items-center justify-between">
                        <DrawerTitle>Connection Settings</DrawerTitle>
                        <DrawerClose asChild>
                            <Button variant="ghost" size="sm" onClick={() => setShowPanelDrawer(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </DrawerClose>
                    </DrawerHeader>
                    <div className="p-4 space-y-4">
                        {lastFmAccount && (
                            <>
                                <div className="flex items-center gap-3">
                                    {lastFmAccount.image ? (
                                        <Image
                                            src={lastFmAccount.image || "/placeholder.svg"}
                                            alt="Last.fm Profile"
                                            width={48}
                                            height={48}
                                            className="rounded-full border border-slate-200"
                                        />
                                    ) : (
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
                                            <Music className="h-5 w-5 text-slate-400" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-sm truncate">{lastFmAccount.username}</h3>
                                        <p className="text-xs text-muted-foreground">{lastFmAccount.realName}</p>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center py-2 border-t">
                                    <span className="text-xs text-muted-foreground">Country</span>
                                    <span className="text-sm font-semibold">{lastFmAccount.country}</span>
                                </div>

                                <div className="space-y-2 pt-2 border-t">
                                    <p className="text-xs font-semibold uppercase tracking-tight">Connect Platforms</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            onClick={() => window.open('https://www.last.fm/about/trackmymusic', '_blank')}
                                            className="bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 font-medium h-9 text-xs"
                                            variant="outline"
                                        >
                                            <Icons.spotify className="mr-1.5 h-4 w-4" />
                                            Spotify
                                        </Button>
                                        <Button
                                            onClick={() => window.open('https://www.last.fm/about/trackmymusic', '_blank')}
                                            className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-medium h-9 text-xs"
                                            variant="outline"
                                        >
                                            <Youtube className="mr-1.5 h-4 w-4" />
                                            YouTube
                                        </Button>
                                    </div>
                                </div>

                                <Button
                                    onClick={() => {
                                        disconnectMutation.mutate()
                                        setShowPanelDrawer(false)
                                    }}
                                    disabled={isDisconnecting}
                                    className="w-full bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-medium"
                                    variant="outline"
                                >
                                    {isDisconnecting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <XCircle className="mr-2 h-4 w-4" />
                                    )}
                                    Disconnect Account
                                </Button>
                            </>
                        )}
                    </div>
                </DrawerContent>
            </Drawer>

            {/* Loved Tracks Modal (Mobile) */}
            <Dialog open={showLovedTracksModal} onOpenChange={setShowLovedTracksModal}>
                <DialogContent className="max-w-md max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Heart className="h-5 w-5 text-red-500" />
                            Loved Tracks
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh]">
                        {isLoadingLovedTracks ? (
                            <TrackSkeleton />
                        ) : lovedTracks && lovedTracks.length > 0 ? (
                            <div className="space-y-2">
                                {lovedTracks.map((track: LastFmTrack, index: number) => (
                                    <TrackItem key={`loved-${track.artist.name}-${track.name}-${index}`} track={track} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">No loved tracks</p>
                            </div>
                        )}
                    </ScrollArea>
                    {lovedTracks && lovedTracks.length > 0 && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => setLovedTracksLimit(prev => prev + 10)}
                            disabled={isLoadingLovedTracks}
                        >
                            {isLoadingLovedTracks && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Load More
                        </Button>
                    )}
                </DialogContent>
            </Dialog>
        </main>
    )
}

// Track Item Component (reusable)
const TrackItem = ({ track }: { track: LastFmTrack }) => (
    <div className="flex items-center gap-3 p-2 border rounded hover:bg-muted/50">
        {track.image && track.image.length > 0 && (
            <Image
                src={track.image[track.image.length - 1]?.["#text"] ?? "/images/logo.png"}
                alt={track.name}
                width={40}
                height={40}
                className="rounded h-10 w-10"
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
)

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
                <Loader2 className="w-4 h-4 animate-spin" />
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
            Add
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

            <ScrollArea className=" h-[calc(100vh-15vh)] lg:h-[calc(100vh-44vh)]">
                {isLoading && rewardedTracks.length === 0 ? (
                    <TrackSkeleton />
                ) : rewardedTracks.length > 0 ? (
                    <div className="space-y-2">
                        {rewardedTracks.map((reward: LastFMTrack) => (
                            <div key={reward.id} className="flex items-center gap-3 p-3 border rounded">
                                <Image
                                    src={reward.trackImageUrl ?? "/images/logo.png"}
                                    alt={reward.trackName}
                                    width={48}
                                    height={48}
                                    className="rounded h-10 w-10"
                                    onError={(e) => {
                                        e.currentTarget.src = "/images/logo.png"
                                    }}
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

            {hasNextPage && (
                <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                >
                    {isFetchingNextPage && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Load More
                </Button>
            )}
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

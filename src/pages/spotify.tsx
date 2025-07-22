"use client"

import type React from "react"

import { useSession } from "next-auth/react"
import { useState, useEffect, useRef } from "react"
import { api } from "~/utils/api"
import { Button } from "~/components/shadcn/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/shadcn/ui/card"
import { Badge } from "~/components/shadcn/ui/badge"
import { Loader2, Music, Link, XCircle, CheckCircle, Gift, Info, Clock, Play, AlertTriangle } from "lucide-react"
import Image from "next/image"
import { Skeleton } from "~/components/shadcn/ui/skeleton"
import { useRouter } from "next/router"
import { ScrollArea } from "~/components/shadcn/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/shadcn/ui/tooltip"
import { toast } from "sonner"
import type { SpotifyTrack } from "@prisma/client"
import { Alert, AlertDescription } from "~/components/shadcn/ui/alert"
import { clientsign } from "package/connect_wallet"
import { clientSelect } from "~/lib/stellar/fan/utils"
import { WalletType } from "~/types/wallet/wallet-types"

const SpotifyPage = () => {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [isConnecting, setIsConnecting] = useState(false)
    const [isDisconnecting, setIsDisconnecting] = useState(false)

    const {
        data: spotifyAccount,
        isLoading: isLoadingAccount,
        refetch: refetchAccount,
    } = api.spotify.spotifyRouter.getSpotifyAccount.useQuery(undefined, {
        enabled: status === "authenticated",
    })

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
            console.log("Spotify connection status:", router.query.status)
            router.replace("/spotify", undefined, { shallow: true })
        }
    }, [router.query.status])

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
            <div className="flex items-center justify-center min-h-[calc(100vh-10vh)]">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-lg text-muted-foreground">Loading Spotify integration...</span>
                </div>
            </div>
        )
    }

    if (status === "unauthenticated") {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-10vh)] p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <Music className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Spotify Integration</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-muted-foreground">
                            Please sign in to connect your Spotify account and access music rewards.
                        </p>
                        <Button onClick={() => router.push("/api/auth/signin")} className="w-full">
                            Sign In to Continue
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 py-8 space-y-8">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                <Music className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl">Spotify Integration</CardTitle>
                                <p className="text-sm text-muted-foreground">Connect your account to earn music rewards</p>
                            </div>
                        </div>
                        {spotifyAccount ? (
                            <Badge
                                variant="default"
                                className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                            >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Connected
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                <XCircle className="w-4 h-4 mr-1" />
                                Disconnected
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {spotifyAccount ? (
                        <div className="space-y-6">
                            <div className="flex items-center space-x-4 p-4 rounded-lg bg-muted/50">
                                <div className="relative">
                                    <Image
                                        src={spotifyAccount.image ?? "/images/logo.png"}
                                        alt="Spotify Profile"
                                        width={80}
                                        height={80}
                                        className="rounded-full  border-2 border-border"
                                    />
                                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                                        <CheckCircle className="h-3 w-3 text-white" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold">{spotifyAccount.name}</h3>
                                    <p className="text-muted-foreground">{spotifyAccount.email}</p>
                                    <Badge variant="outline" className="mt-2">
                                        Premium Account
                                    </Badge>
                                </div>
                            </div>
                            <Button
                                onClick={() => disconnectMutation.mutate()}
                                disabled={isDisconnecting}
                                variant="outline"
                                className="w-full border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                                {isDisconnecting ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <XCircle className="w-4 h-4 mr-2" />
                                )}
                                Disconnect Spotify Account
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="text-center space-y-4">
                                <div className="mx-auto h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                                    <Music className="h-12 w-12 text-muted-foreground" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Connect Your Spotify Account</h3>
                                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                                        Link your Spotify account to sync your music data, discover new tracks, and earn rewards for
                                        listening to your favorite songs.
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={handleConnectSpotify}
                                disabled={isConnecting}
                                className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white"
                                size="lg"
                            >
                                {isConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link className="w-4 h-4 mr-2" />}
                                Connect with Spotify
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <RewardedSongsList spotifyAccountConnected={!!spotifyAccount} />
        </div>
    )
}

interface RewardedSongsListProps {
    spotifyAccountConnected: boolean
}

type RewardTrackWithStatus = SpotifyTrack & {
    isClaimed?: boolean
    canClaimAgain?: boolean
    lastClaimedAt?: Date
    nextClaimAvailable?: Date | null
}

const RewardedSongsList: React.FC<RewardedSongsListProps> = ({ spotifyAccountConnected }) => {
    const utils = api.useUtils()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const session = useSession()
    const [checkingTracks, setCheckingTracks] = useState<Set<number>>(new Set())
    const GetClaimXDR = api.spotify.spotifyReward.getClaimXDR.useMutation({
        onSuccess: async (data, variables) => {
            if (data) {
                const { xdr, needSign } = data
                try {
                    setIsSubmitting(true)
                    const clientResponse = await clientsign({
                        presignedxdr: xdr,
                        walletType: needSign ? session.data?.user?.walletType : WalletType.isAdmin,
                        pubkey: session.data?.user?.id,
                        test: clientSelect(),

                    })

                    if (clientResponse) {
                        claimRewardMutation.mutate({
                            rewardedTrackId: variables.rewardedTrackId
                        })
                        setIsSubmitting(false)
                    } else {
                        setIsSubmitting(false)

                        toast.error("Error in signing transaction")

                    }

                } catch (error) {
                    setIsSubmitting(false)
                    console.error("Error sending balance to bounty mother", error)

                }
            }
        },
        onError: (error) => {
            console.error("Failed to get claim XDR:", error)
            toast.error("Failed to prepare claim transaction. Please try again.")
        },
    })

    const claimRewardMutation = api.spotify.spotifyReward.claimRewardedTrack.useMutation({
        onSuccess: () => {
            utils.spotify.spotifyReward.getAllRewardedTracksForUsers.invalidate()
            toast.success("Reward claimed successfully!")
        },
        onError: (error) => {
            console.error("Failed to claim reward:", error)
            if (error.message.includes("connect your Spotify account")) {
                toast.error("Please connect your Spotify account to claim rewards.")
            } else if (error.message.includes("listen to this track on Spotify")) {
                toast.error("You must listen to this track on Spotify first!", {
                    description: "Play the song and try again in a few minutes.",
                    duration: 5000,
                })
            } else if (error.message.includes("can claim this reward again on")) {
                toast.error(error.message)
            } else {
                toast.error("Failed to claim reward. Please try again.")
            }
        },
    })

    const checkRecentTracksMutation = api.spotify.spotifyReward.checkUserRecentTracks.useMutation({
        onSuccess: (data, variables) => {
            setCheckingTracks((prev) => {
                const newSet = new Set<number>(prev)
                newSet.delete(Number(variables.spotifyTrackId)) // Remove from checking set
                return newSet
            })

            if (data.hasPlayedRecently) {
                toast.success("Track verified!", {
                    description: "You can now claim the reward for this track.",
                })
            } else {
                toast.warning("Track not found in recent history", {
                    description: "Please play this song on Spotify first, then try again.",
                    duration: 5000,
                })
            }
        },
        onError: (error, variables) => {
            setCheckingTracks((prev) => {
                const newSet = new Set<number>(prev)
                newSet.delete(Number(variables.spotifyTrackId))
                return newSet
            })

            toast.error("Failed to verify listening history", {
                description: error.message,
            })
        },
    })

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
        api.spotify.spotifyReward.getAllRewardedTracksForUsers.useInfiniteQuery(
            { limit: 10 },
            { getNextPageParam: (lastPage) => lastPage.nextCursor },
        )

    const rewardedTracks = data?.pages.flatMap((page) => page.items) ?? []
    const scrollAreaRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleScroll = () => {
            if (scrollAreaRef.current && hasNextPage && !isFetchingNextPage) {
                const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current
                if (scrollTop + clientHeight >= scrollHeight - 50) {
                    fetchNextPage()
                }
            }
        }

        const currentRef = scrollAreaRef.current
        if (currentRef) {
            currentRef.addEventListener("scroll", handleScroll)
        }

        return () => {
            if (currentRef) {
                currentRef.removeEventListener("scroll", handleScroll)
            }
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    // Helper function to format time remaining
    const formatTimeRemaining = (nextClaimDate: Date) => {
        const now = new Date()
        const diff = nextClaimDate.getTime() - now.getTime()

        if (diff <= 0) return "Available now"

        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

        if (days > 0) return `${days}d ${hours}h`
        if (hours > 0) return `${hours}h ${minutes}m`
        return `${minutes}m`
    }

    // Helper function to get button state and text
    const getButtonState = (reward: RewardTrackWithStatus) => {
        if (!spotifyAccountConnected) {
            return {
                disabled: true,
                text: "Connect Spotify",
                variant: "secondary" as const,
                icon: <Link className="w-4 h-4 mr-1" />,
            }
        }

        if (!reward.isClaimed) {
            return {
                disabled: false,
                text: "Claim Reward",
                variant: "default" as const,
                icon: <Gift className="w-4 h-4 mr-1" />,
            }
        }

        if (reward.canClaimAgain) {
            return {
                disabled: false,
                text: "Claim Again",
                variant: "default" as const,
                icon: <Gift className="w-4 h-4 mr-1" />,
            }
        }

        return {
            disabled: true,
            text: "Claimed",
            variant: "secondary" as const,
            icon: <CheckCircle className="w-4 h-4 mr-1" />,
        }
    }

    const handleCheckListeningHistory = (reward: RewardTrackWithStatus) => {
        setCheckingTracks((prev) => new Set(prev).add(reward.id))
        checkRecentTracksMutation.mutate({ spotifyTrackId: reward.spotifyTrackId })
    }

    const openSpotifyTrack = (spotifyTrackId: string) => {
        const spotifyUrl = `https://open.spotify.com/track/${spotifyTrackId}`
        window.open(spotifyUrl, "_blank")
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Gift className="h-5 w-5 text-primary" />
                            Rewarded Songs
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Listen to tracks on Spotify to claim rewards</p>
                    </div>
                    {rewardedTracks.length > 0 && <Badge variant="secondary">{rewardedTracks.length} available</Badge>}
                </div>
            </CardHeader>
            <CardContent>
                {!spotifyAccountConnected && (
                    <Alert className="mb-6 border-primary/20 bg-primary/5">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-primary">
                            Connect your Spotify account above to start claiming music rewards!
                        </AlertDescription>
                    </Alert>
                )}

                {spotifyAccountConnected && (
                    <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800 dark:text-amber-200">
                            <div className="space-y-1">
                                <p className="font-medium">How to claim rewards:</p>
                                <p className="text-sm">
                                    1. Play the song on Spotify first • 2. Wait a few minutes for sync • 3. Click {"'"}Claim Reward{"'"}
                                </p>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {isLoading && rewardedTracks.length === 0 ? (
                    <TrackSkeleton />
                ) : rewardedTracks.length > 0 ? (
                    <ScrollArea ref={scrollAreaRef} className="h-[400px] pr-4">
                        <div className="space-y-3">
                            {rewardedTracks.map((reward: RewardTrackWithStatus) => {
                                const buttonState = getButtonState(reward)
                                const isClaimLoading = GetClaimXDR.isLoading && GetClaimXDR.variables?.rewardedTrackId === reward.id
                                const isCheckingHistory = checkingTracks.has(reward.id)

                                return (
                                    <div
                                        key={reward.id}
                                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center space-x-4 flex-1">
                                            <div className="relative">
                                                <Image
                                                    src={reward.albumCoverUrl ?? "/placeholder.svg?height=60&width=60"}
                                                    alt={reward.trackName}
                                                    width={60}
                                                    height={60}
                                                    className="rounded-md border"
                                                />
                                                {reward.isClaimed && (
                                                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                                                        <CheckCircle className="h-3 w-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold truncate">{reward.trackName}</h4>
                                                <p className="text-sm text-muted-foreground truncate">{reward.artistName}</p>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <Badge variant="outline" className="text-xs">
                                                        {reward.rewardAmount} {reward.assetId}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">every {reward.rewardIntervalDays} days</span>

                                                    {/* Show next claim availability */}
                                                    {reward.isClaimed && reward.nextClaimAvailable && !reward.canClaimAgain && (
                                                        <div className="flex items-center gap-1 text-xs text-amber-600">
                                                            <Clock className="w-3 h-3" />
                                                            <span>Next: {formatTimeRemaining(reward.nextClaimAvailable)}</span>
                                                        </div>
                                                    )}

                                                    {reward.canClaimAgain && (
                                                        <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
                                                            Ready to claim!
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="ml-4 shrink-0 flex gap-2">
                                            {/* Play on Spotify Button */}
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openSpotifyTrack(reward.spotifyTrackId)}
                                                            className="bg-[#1DB954] hover:bg-[#1ed760] text-white border-[#1DB954]"
                                                        >
                                                            <Play className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Play on Spotify</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            {/* Check Listening History Button */}
                                            {spotifyAccountConnected && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleCheckListeningHistory(reward)}
                                                                disabled={isCheckingHistory}
                                                            >
                                                                {isCheckingHistory ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Music className="w-4 h-4" />
                                                                )}
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Check if you{"''"}ve listened to this track</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}

                                            {/* Claim Reward Button */}
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant={buttonState.variant}
                                                            size="sm"
                                                            onClick={() => GetClaimXDR.mutate({ rewardedTrackId: reward.id })}
                                                            disabled={buttonState.disabled || isClaimLoading}
                                                        >
                                                            {isClaimLoading ? (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                                    Claiming...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {buttonState.icon}
                                                                    {buttonState.text}
                                                                </>
                                                            )}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {!spotifyAccountConnected && <p>Connect Spotify to claim this reward</p>}
                                                        {reward.isClaimed && !reward.canClaimAgain && reward.nextClaimAvailable && (
                                                            <p>Next claim available: {reward.nextClaimAvailable.toLocaleDateString()}</p>
                                                        )}
                                                        {reward.canClaimAgain && <p>You can claim this reward again!</p>}
                                                        {spotifyAccountConnected && !reward.isClaimed && (
                                                            <p>Listen to this track on Spotify first, then claim your reward</p>
                                                        )}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </div>
                                )
                            })}
                            {isFetchingNextPage && (
                                <div className="flex justify-center py-4">
                                    <div className="flex items-center space-x-2 text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">Loading more rewards...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="text-center py-12">
                        <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Gift className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No Rewards Available</h3>
                        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                            No songs have been added to the rewards program yet. Check back later for new opportunities to earn
                            rewards!
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

const TrackSkeleton = () => (
    <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 rounded-lg border">
                <Skeleton className="w-16 h-16 rounded-md" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="w-48 h-4" />
                    <Skeleton className="w-32 h-3" />
                    <div className="flex space-x-2">
                        <Skeleton className="w-16 h-5 rounded-full" />
                        <Skeleton className="w-20 h-3" />
                    </div>
                </div>
                <Skeleton className="w-24 h-8 rounded-md" />
            </div>
        ))}
    </div>
)

export default SpotifyPage

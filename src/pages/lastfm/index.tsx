"use client"

import React from "react"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { api } from "~/utils/api"
import { Button } from "~/components/shadcn/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/shadcn/ui/card"
import { Badge } from "~/components/shadcn/ui/badge"
import {
    Loader2,
    Music,
    AlertTriangle,
    XCircle,
    CheckCircle,
    Youtube,
    Zap,
} from "lucide-react"
import Image from "next/image"
import { Skeleton } from "~/components/shadcn/ui/skeleton"
import { useRouter } from "next/router"
import { ScrollArea } from "~/components/shadcn/ui/scroll-area"
import { Alert, AlertDescription } from "~/components/shadcn/ui/alert"
import { env } from "~/env"
import { Gift, Link as LinkIcon } from "lucide-react"
import { clientsign } from "package/connect_wallet"
import { clientSelect } from "~/lib/stellar/fan/utils"
import { WalletType } from "~/types/wallet/wallet-types"
import toast from "react-hot-toast"
import useNeedSign from "~/lib/hook"
import { Icons } from "~/components/layout/Left-sidebar/icons"

type LastFmTrack = {
    name: string
    artist: {
        name: string
        url: string
    }
    url: string
    image: Array<{ "#text": string; size: string }>
    playcount?: string
    loved?: string
    date?: {
        uts: string
        "#text": string
    }
}

type RewardTrackWithStatus = {
    id: number
    isClaimed?: boolean
    canClaimAgain?: boolean
    lastClaimedAt?: Date
    nextClaimAvailable?: Date | null
    trackName: string
    artistName: string
    albumName?: string | null
    albumCoverUrl?: string | null
    trackImageUrl?: string | null
    trackurl: string
    spotifyURL?: string | null
    youtubeURL?: string | null
    rewardAmount: number
    assetId: string
    rewardIntervalDays: number
    alreadyGivenAmount: number
    maximumRewardAmount: number
}

const LastFMPage = () => {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [isConnecting, setIsConnecting] = useState(false)
    const [isDisconnecting, setIsDisconnecting] = useState(false)

    const {
        data: lastfmAccount,
        isLoading: isLoadingAccount,
        refetch: refetchAccount,
    } = api.lastfm.getlastFMAccount.useQuery(undefined, {
        enabled: status === "authenticated",
    })



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
        const clientId = env.NEXT_PUBLIC_LASTFM_API_KEY
        const callbackUrl = env.NEXT_PUBLIC_LASTFM_CALLBACK_URL ?? ""
        const state = `${session.user.id}_${encodeURIComponent(window.location.pathname)}`

        if (!clientId) {
            toast.error("Last.fm API key is not configured")
            setIsConnecting(false)
            return
        }

        const authUrl =
            `http://www.last.fm/api/auth/?` +
            `api_key=${clientId}`

        window.location.href = authUrl
    }

    if (status === "loading" || isLoadingAccount) {
        return (
            <main className="min-h-screen  flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className=" font-medium">Loading your music rewards...</span>
                </div>
            </main>
        )
    }

    if (status === "unauthenticated") {
        return (
            <main className="min-h-screen  flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-slate-200 shadow-lg">
                    <CardHeader className="text-center pb-6">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                            <Music className="h-8 w-8 text-blue-600" />
                        </div>
                        <CardTitle className="text-3xl font-bold ">Music Rewards</CardTitle>
                        <p className=" text-sm mt-2">Track your listening and earn rewards</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            onClick={() => router.push("/api/auth/signin")}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-11"
                        >
                            Sign In to Continue
                        </Button>
                        <p className="text-xs text-slate-500 text-center">
                            By signing in, you agree to our terms and privacy policy
                        </p>
                    </CardContent>
                </Card>
            </main>
        )
    }

    return (
        <main className="">
            {/* Header Section */}
            <div className="border-b border-slate-200 ">
                <div className="p-2">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                                <Music className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold ">Last.fm Rewards</h1>
                                <p className="text-sm ">Earn tokens from your listening history</p>
                            </div>
                        </div>
                        <Badge className={`px-3 py-1.5 font-medium ${lastfmAccount ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                            <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: lastfmAccount ? '#10b981' : '#94a3b8' }} />
                            {lastfmAccount ? 'Connected' : 'Disconnected'}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-2 ">
                <div className="grid lg:grid-cols-3 gap-2 ">
                    {/* Connection Panel */}
                    <div className="lg:col-span-1  h-[calc(100vh-20vh)]">
                        <Card className="border-slate-200 shadow-sm h-full">
                            <CardHeader>
                                <CardTitle className="text-lg ">Account</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {lastfmAccount ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            {lastfmAccount.image ? (
                                                <Image
                                                    src={lastfmAccount.image || "/placeholder.svg"}
                                                    alt="Last.fm Profile"
                                                    width={64}
                                                    height={64}
                                                    className="rounded-full border-2 border-slate-200"
                                                />
                                            ) : (
                                                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100">
                                                    <Music className="h-6 w-6 text-slate-400" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <h3 className="font-semibold  truncate">{lastfmAccount.username}</h3>
                                                <p className="text-sm ">{lastfmAccount.playCount.toLocaleString()} plays</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3 pt-4 border-t border-slate-200">
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold  uppercase tracking-wide">Connect Platforms</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button
                                                        onClick={() => window.open('https://www.last.fm/about/trackmymusic', '_blank')}
                                                        className="bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 font-medium h-10"
                                                        variant="outline"
                                                    >
                                                        <Icons.spotify className="mr-2 h-4 w-4" />
                                                        Spotify
                                                    </Button>
                                                    <Button
                                                        onClick={() => window.open('https://www.last.fm/about/trackmymusic', '_blank')}
                                                        className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-medium h-10"
                                                        variant="outline"
                                                    >
                                                        <Youtube className="mr-2 h-4 w-4" />
                                                        YouTube
                                                    </Button>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => disconnectMutation.mutate()}
                                                disabled={isDisconnecting}
                                                className="w-full bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-medium"
                                                variant="outline"
                                            >
                                                {isDisconnecting ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <XCircle className="mr-2 h-4 w-4" />
                                                )}
                                                Disconnect
                                            </Button>
                                        </div>

                                        {/* How to Claim Rewards */}
                                        <div className="space-y-3 pt-4 border-t border-slate-200">
                                            <div className="flex items-start gap-2">
                                                <Zap className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-semibold  mb-2">How to Claim</p>
                                                    <ol className="text-xs  space-y-1.5 list-decimal list-inside">
                                                        <li>Listen to tracks on Last.fm</li>
                                                        <li>Click Claim Reward button</li>

                                                    </ol>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 text-center">
                                        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-blue-100">
                                            <Music className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm  font-medium">Not Connected</p>
                                            <p className="text-xs text-slate-500 mt-1">Connect your Last.fm account to start</p>
                                        </div>
                                        <Button
                                            onClick={handleConnectLastFm}
                                            disabled={isConnecting}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-10"
                                        >
                                            {isConnecting ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Music className="mr-2 h-4 w-4" />
                                            )}
                                            Connect Last.fm
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content Area */}
                    <div className=" lg:col-span-2 space-y-8 ">
                        {/* Rewards Section */}
                        {lastfmAccount && (
                            <RewardedSongsList lastfmAccountConnected={!!lastfmAccount} />
                        )}
                    </div>
                </div>
            </div>
        </main>
    )
}

interface RewardedSongsListProps {
    lastfmAccountConnected: boolean
}

const RewardedSongsList: React.FC<RewardedSongsListProps> = ({ lastfmAccountConnected }) => {
    const utils = api.useUtils()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const session = useSession()
    const { needSign } = useNeedSign()
    const scrollAreaRef = React.useRef<HTMLDivElement>(null)

    const GetClaimXDR = api.lastfm.getClaimXDR.useMutation({
        onSuccess: async (data, variables) => {
            if (data) {

                try {
                    setIsSubmitting(true)
                    const clientResponse = await clientsign({
                        presignedxdr: data,
                        walletType: session.data?.user?.walletType,
                        pubkey: session.data?.user?.id,
                        test: clientSelect(),
                    })

                    if (clientResponse) {
                        claimRewardMutation.mutate({
                            rewardedTrackId: variables.rewardedTrackId,
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

    const claimRewardMutation = api.lastfm.claimRewardedTrack.useMutation({
        onSuccess: () => {
            utils.lastfm.getAllRewardedTracksForUsers.invalidate()
            toast.success("Reward claimed successfully!")
        },
        onError: (error) => {
            console.error("Failed to claim reward:", error)
            if (error.message.includes("connect your Last.fm account")) {
                toast.error("Please connect your Last.fm account to claim rewards.")
            } else if (error.message.includes("can claim this reward again on")) {
                toast.error(error.message)
            } else {
                toast.error("Failed to claim reward. Please try again.")
            }
        },
    })

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
        api.lastfm.getAllRewardedTracksForUsers.useInfiniteQuery(
            { limit: 10 },
            { getNextPageParam: (lastPage) => lastPage.nextCursor },
        )

    const rewardedTracks = data?.pages.flatMap((page) => page.items) ?? []

    React.useEffect(() => {
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

    const getButtonState = (reward: RewardTrackWithStatus, isInRecentTracks: boolean) => {
        if (!lastfmAccountConnected) {
            return {
                disabled: true,
                text: "Connect Last.fm",
                variant: "secondary" as const,
                icon: <LinkIcon className="w-4 h-4 mr-1" />,
                tooltip: "Please connect your Last.fm account"
            }
        }

        if (!isInRecentTracks) {
            return {
                disabled: true,
                text: "Not Played",
                variant: "secondary" as const,
                icon: <AlertTriangle className="w-4 h-4 mr-1" />,
                tooltip: "You must listen to this track on Last.fm first"
            }
        }

        if (!reward.isClaimed) {
            return {
                disabled: false,
                text: "Claim Reward",
                variant: "default" as const,
                icon: <Gift className="w-4 h-4 mr-1" />,
                tooltip: "Claim reward for this track"
            }
        }

        if (reward.canClaimAgain) {
            return {
                disabled: false,
                text: "Claim Again",
                variant: "default" as const,
                icon: <Gift className="w-4 h-4 mr-1" />,
                tooltip: "Claim reward again"
            }
        }

        return {
            disabled: true,
            text: "Claimed",
            variant: "secondary" as const,
            icon: <CheckCircle className="w-4 h-4 mr-1" />,
            tooltip: "You have already claimed this reward"
        }
    }

    return (
        <Card className="border-slate-200 shadow-sm  h-[calc(100vh-20vh)]">
            <CardHeader className="border-b border-slate-200 pb-6">
                <CardTitle className="text-xl ">Available Rewards</CardTitle>
                <p className="text-sm  mt-1">
                    {rewardedTracks.length} {rewardedTracks.length === 1 ? 'track' : 'tracks'} available to claim
                </p>
            </CardHeader>
            <CardContent className="pt-6">
                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full" />
                        ))}
                    </div>
                ) : rewardedTracks.length > 0 ? (
                    <ScrollArea ref={scrollAreaRef} className="h-[600px]">
                        <div className="space-y-3 pr-4">
                            {rewardedTracks.map((reward) => {
                                const buttonState = getButtonState(reward, reward.isInRecentTracks)
                                const trackImage = reward.albumCoverUrl ?? reward.trackImageUrl
                                return (
                                    <div
                                        key={reward.id}
                                        className="flex gap-4 rounded-lg border border-slate-200 p-4 bg-secondary hover:shadow-md hover:border-slate-300 transition-all group"
                                    >
                                        <div className="flex-shrink-0">
                                            <Image
                                                src={trackImage ?? "/images/logo.png"}
                                                alt={reward.trackName}
                                                width={80}
                                                height={80}
                                                className="rounded-lg h-20 w-20 object-cover shadow-sm"
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="font-semibold  text-sm group-hover:text-blue-600 transition-colors">{reward.trackName}</h4>
                                                    {reward.isInRecentTracks && (
                                                        <Badge className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Played
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs  mt-1">{reward.artistName}</p>
                                                {reward.albumName && (
                                                    <p className="text-xs text-slate-500">{reward.albumName}</p>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 flex-wrap">
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        onClick={() => window.open(reward.trackurl, "_blank")}
                                                        size="sm"

                                                        title="Open on Last.fm"
                                                    >
                                                        <Icons.lastfm className="w-4 h-4" />
                                                    </Button>

                                                    {reward.spotifyURL && (
                                                        <div className="flex items-center justify-center">
                                                            <div
                                                                className="w-px h-6 bg-slate-200 mx-2"
                                                            />
                                                            <Button
                                                                onClick={() => window.open(reward.spotifyURL ?? "", "_blank")}
                                                                size="sm"

                                                                title="Open on Spotify"
                                                            >
                                                                <Icons.spotify className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    )}

                                                    {reward.youtubeURL && (
                                                        <div className="flex items-center justify-center">
                                                            <div
                                                                className="w-px h-6 bg-slate-200 mx-2"
                                                            />
                                                            <Button
                                                                onClick={() => window.open(reward.youtubeURL ?? "", "_blank")}
                                                                size="sm"
                                                                title="Open on YouTube"
                                                            >
                                                                <Youtube className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4 text-xs ">
                                                    <div className="text-right">
                                                        <p className="text-slate-500 text-xs">Reward</p>
                                                        <p className="font-semibold ">{reward.rewardAmount} {reward.assetId}</p>
                                                    </div>
                                                    {reward.isClaimed && reward.nextClaimAvailable && (
                                                        <div className="text-right">
                                                            <p className="text-slate-500 text-xs">Next Claim</p>
                                                            <p className="font-semibold text-orange-600">{formatTimeRemaining(reward.nextClaimAvailable)}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            size="sm"
                                            disabled={buttonState.disabled || isSubmitting}
                                            onClick={() => GetClaimXDR.mutate({
                                                rewardedTrackId: reward.id,
                                                signWith: needSign(),
                                            })}
                                            className={`flex-shrink-0 font-medium whitespace-nowrap ${buttonState.disabled
                                                ? 'bg-slate-100 text-slate-500'
                                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                                                }`}
                                            title={buttonState.tooltip}
                                        >
                                            {isSubmitting ? (
                                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                            ) : (
                                                buttonState.icon
                                            )}
                                            {buttonState.text}
                                        </Button>
                                    </div>
                                )
                            })}
                            {isFetchingNextPage && (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="text-center py-16">
                        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-slate-100 mb-4">
                            <Gift className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold  mb-2">No Rewards Yet</h3>
                        <p className=" text-sm mb-4">
                            Rewards will appear once you listen to featured tracks
                        </p>
                        <p className="text-xs text-slate-500">
                            Check back soon for new music rewards to claim
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default LastFMPage

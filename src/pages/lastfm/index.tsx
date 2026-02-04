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
    Heart,
    HeartOff,
    Calendar,
    TrendingUp,
    Play,
    Disc3,
    AlertTriangle,
    XCircle,
    CheckCircle,
} from "lucide-react"
import Image from "next/image"
import { Skeleton } from "~/components/shadcn/ui/skeleton"
import { useRouter } from "next/router"
import { ScrollArea } from "~/components/shadcn/ui/scroll-area"
import { Alert, AlertDescription } from "~/components/shadcn/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/shadcn/ui/tabs"
import { env } from "~/env"
import { Gift, Info, Link as LinkIcon } from "lucide-react"
import { clientsign } from "package/connect_wallet"
import { clientSelect } from "~/lib/stellar/fan/utils"
import { WalletType } from "~/types/wallet/wallet-types"
import toast from "react-hot-toast"
import useNeedSign from "~/lib/hook"

type LastFmTrack = {
    name: string
    artist: string
    url: string
    image: string
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
            `https://www.last.fm/api/auth/?` +
            `api_key=${clientId}&` +
            `callback_url=${encodeURIComponent(callbackUrl)}&` +
            `state=${encodeURIComponent(state)}`

        window.location.href = authUrl
    }

    if (status === "loading" || isLoadingAccount) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-10vh)]">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-lg text-muted-foreground">Loading Last.fm integration...</span>
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
                        <CardTitle className="text-2xl">Last.fm Integration</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-muted-foreground">
                            Please sign in to connect your Last.fm account and track your music.
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
            {/* Connection Status Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                <Music className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl">Last.fm Integration</CardTitle>
                                <p className="text-sm text-muted-foreground">Track your music listening history</p>
                            </div>
                        </div>
                        {lastfmAccount ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                                <XCircle className="mr-1 h-4 w-4" />
                                Connected
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                <XCircle className="mr-1 h-4 w-4" />
                                Disconnected
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {lastfmAccount ? (
                        <div className="space-y-6">
                            <div className="flex items-center space-x-4 rounded-lg bg-muted/50 p-4">
                                <div className="relative">
                                    {lastfmAccount.image ? (
                                        <Image
                                            src={lastfmAccount.image || "/placeholder.svg"}
                                            alt="Last.fm Profile"
                                            width={80}
                                            height={80}
                                            className="rounded-full border-2 border-border"
                                        />
                                    ) : (
                                        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-border bg-muted">
                                            <Music className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-emerald-500">
                                        <XCircle className="h-3 w-3 text-white" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold">{lastfmAccount.username}</h3>
                                    {lastfmAccount.realName && (
                                        <p className="text-muted-foreground">{lastfmAccount.realName}</p>
                                    )}
                                    <div className="mt-2 flex items-center gap-2">
                                        <Badge variant="outline">{lastfmAccount.playCount} plays</Badge>
                                        {lastfmAccount.country && (
                                            <Badge variant="secondary">{lastfmAccount.country}</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Button
                                onClick={() => disconnectMutation.mutate()}
                                disabled={isDisconnecting}
                                variant="outline"
                                className="border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground w-full"
                            >
                                {isDisconnecting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <XCircle className="mr-2 h-4 w-4" />
                                )}
                                Disconnect Last.fm Account
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    Connect your Last.fm account to see your listening stats, loved tracks, and more.
                                </AlertDescription>
                            </Alert>
                            <Button
                                onClick={handleConnectLastFm}
                                disabled={isConnecting}
                                size="lg"
                                className="w-full"
                            >
                                {isConnecting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Music className="mr-2 h-4 w-4" />
                                )}
                                Connect Last.fm Account
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Rewarded Songs Section */}
            {lastfmAccount && (
                <RewardedSongsList lastfmAccountConnected={!!lastfmAccount} />
            )}
        </div>
    )
}

interface RewardedSongsListProps {
    lastfmAccountConnected: boolean
}

const RewardedSongsList: React.FC<RewardedSongsListProps> = ({ lastfmAccountConnected }) => {
    const utils = api.useUtils()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const session = useSession()
    const router = useRouter()
    const { needSign } = useNeedSign()

    const scrollAreaRef = React.useRef<HTMLDivElement>(null)

    const GetClaimXDR = api.lastfm.getClaimXDR.useMutation({
        onSuccess: async (data, variables) => {
            if (data) {
                const { xdr, needSign } = data
                console.log("Received claim XDR:", xdr, "Need sign:", needSign)
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

    const getButtonState = (reward: RewardTrackWithStatus) => {
        if (!lastfmAccountConnected) {
            return {
                disabled: true,
                text: "Connect Last.fm",
                variant: "secondary" as const,
                icon: <LinkIcon className="w-4 h-4 mr-1" />,
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

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Gift className="h-5 w-5 text-primary" />
                            Rewarded Songs
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Listen to tracks on Last.fm to claim rewards</p>
                    </div>
                    {rewardedTracks.length > 0 && <Badge variant="secondary">{rewardedTracks.length} available</Badge>}
                </div>
            </CardHeader>
            <CardContent>
                {!lastfmAccountConnected && (
                    <Alert className="mb-6 border-primary/20 bg-primary/5">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-primary">
                            Connect your Last.fm account above to start claiming music rewards!
                        </AlertDescription>
                    </Alert>
                )}

                {lastfmAccountConnected && (
                    <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800 dark:text-amber-200">
                            <div className="space-y-1">
                                <p className="font-semibold">How to claim rewards:</p>
                                <ol className="list-decimal list-inside text-sm space-y-1">
                                    <li>Listen to the tracks on Last.fm</li>
                                    <li>Click Claim Reward on the track</li>
                                    <li>Sign the transaction with your wallet</li>
                                    <li>Reward will be transferred to your wallet</li>
                                </ol>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full" />
                        ))}
                    </div>
                ) : rewardedTracks.length > 0 ? (
                    <ScrollArea ref={scrollAreaRef} className="h-[600px] border rounded-lg">
                        <div className="space-y-3 p-4">
                            {rewardedTracks.map((reward) => {
                                const buttonState = getButtonState(reward)
                                return (
                                    <div
                                        key={reward.id}
                                        className="flex flex-col gap-3 rounded-lg border p-4 bg-card hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-sm">{reward.trackName}</h4>
                                                    <Badge variant="outline" className="text-xs">
                                                        {reward.rewardAmount} {reward.assetId}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">{reward.artistName}</p>
                                                {reward.albumName && (
                                                    <p className="text-xs text-muted-foreground">{reward.albumName}</p>
                                                )}
                                            </div>
                                            {reward.albumCoverUrl && (
                                                <div className="ml-4">
                                                    <Image
                                                        src={reward.albumCoverUrl || "/placeholder.svg"}
                                                        alt={reward.trackName}
                                                        width={60}
                                                        height={60}
                                                        className="rounded h-8 w-8"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between gap-2 pt-2 border-t">
                                            <div className="flex items-center gap-4 text-xs">
                                                <div>
                                                    <p className="text-muted-foreground">Interval</p>
                                                    <p className="font-semibold">{reward.rewardIntervalDays} days</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Given</p>
                                                    <p className="font-semibold">
                                                        {reward.alreadyGivenAmount} / {reward.maximumRewardAmount}
                                                    </p>
                                                </div>
                                                {reward.isClaimed && reward.nextClaimAvailable && (
                                                    <div>
                                                        <p className="text-muted-foreground">Next Claim</p>
                                                        <p className="font-semibold text-orange-600">
                                                            {formatTimeRemaining(reward.nextClaimAvailable)}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                size="sm"
                                                disabled={buttonState.disabled || isSubmitting}
                                                onClick={() => GetClaimXDR.mutate({
                                                    rewardedTrackId: reward.id, signWith: needSign(),
                                                })}
                                                variant={buttonState.variant}
                                                className="whitespace-nowrap"
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                ) : (
                                                    buttonState.icon
                                                )}
                                                {buttonState.text}
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                            {isFetchingNextPage && (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="text-center py-12">
                        <Gift className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Rewards Available</h3>
                        <p className="text-muted-foreground text-sm">
                            Rewards will appear here once creators add them on Last.fm
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default LastFMPage

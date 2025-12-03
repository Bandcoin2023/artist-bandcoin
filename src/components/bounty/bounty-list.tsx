import React, { useState } from "react"
import Image from "next/image"
import { Award, Trophy, User, Users } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/shadcn/ui/card"
import { Badge } from "~/components/shadcn/ui/badge"
import type { BountyTypes } from "~/types/bounty/bounty-type"
import { PLATFORM_ASSET } from "~/lib/stellar/constant"
import DOMPurify from "isomorphic-dompurify"
import { useRouter } from "next/navigation"
import { Button } from "~/components/shadcn/ui/button"
import { useUserStellarAcc } from "~/lib/state/wallete/stellar-balances"
import { api } from "~/utils/api"
import { toast } from "~/hooks/use-toast"
import { addrShort } from "~/utils/utils"
import { Spinner } from "../shadcn/ui/spinner"
import { Preview } from "../common/quill-preview"

function SafeHTML({
    html,
}: {
    html: string
}) {
    return (
        <Preview

            value={html}
        />
    )
}

export default function BountyList({
    bounties,
}: {
    bounties: BountyTypes[]
}) {
    const router = useRouter()
    const { getAssetBalance, balances } = useUserStellarAcc();
    const [failedReasons, setFailedReasons] = useState<Record<number, string>>({})
    console.log("BountyList rendered with getAssetBalance:", balances);
    const isEligible = (bounty: BountyTypes) => {
        console.log("Checking eligibility for bounty:", bounty.requiredBalanceCode, bounty.requiredBalanceIssuer);
        const balance = getAssetBalance({
            code: bounty.requiredBalanceCode,
            issuer: bounty.requiredBalanceIssuer
        })
        console.log("Checking eligibility for balance:", balance)
        console.log("bounty.currentWinnerCount < bounty.totalWinner && bounty.requiredBalance <= getAssetBalance(bounty.requiredBalanceCode, bounty.requiredBalanceIssuer);")
        return bounty.currentWinnerCount < bounty.totalWinner && (bounty.requiredBalance <= Number(balance));
    }
    const joinBountyMutation = api.bounty.Bounty.joinBounty.useMutation({
        onSuccess: async (data, variables) => {
            toast({
                title: "Success",
                description: "You have successfully joined the bounty",

            })
            router.push(`/bounty/${variables?.BountyId}`)

        },
    });
    const handleJoinBounty = (id: number) => {
        joinBountyMutation.mutate({ BountyId: id });
    };

    // Helper: get current position as a Promise
    const getCurrentPosition = (): Promise<{ latitude: number; longitude: number }> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return reject(new Error("Geolocation is not supported by this browser."))
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                (err) => reject(err),
                { enableHighAccuracy: true, timeout: 10000 },
            )
        })
    }

    // Haversine - returns distance in meters
    const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const toRad = (v: number) => (v * Math.PI) / 180
        const R = 6371000 // meters
        const dLat = toRad(lat2 - lat1)
        const dLon = toRad(lon2 - lon1)
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }

    // Extract possible location fields from bounty; returns null if not location-based
    const getBountyLocation = (bounty: BountyTypes): { lat: number; lon: number; radiusMeters: number } | null => {
        // common field names tried
        const lat = bounty.latitude
        const lon = bounty.longitude
        const radius = bounty.radius

        if (lat == null || lon == null || radius == null) return null
        return { lat: Number(lat), lon: Number(lon), radiusMeters: Number(radius) }
    }

    // Attempt to join, checking location permission + distance if bounty requires location
    const handleJoinWithLocation = async (bounty: BountyTypes) => {
        // reset any previous reason
        setFailedReasons((s) => ({ ...s, [bounty.id]: "" }))

        // spots
        if (bounty.currentWinnerCount >= bounty.totalWinner) {
            const msg = "No spots left"
            setFailedReasons((s) => ({ ...s, [bounty.id]: msg }))
            return
        }

        // balance
        const balance = getAssetBalance({ code: bounty.requiredBalanceCode, issuer: bounty.requiredBalanceIssuer })
        if (bounty.requiredBalance > Number(balance)) {
            const msg = `${bounty.requiredBalance.toFixed(1)} ${bounty.requiredBalanceCode.toLocaleUpperCase()} required`
            setFailedReasons((s) => ({ ...s, [bounty.id]: msg }))
            return
        }

        // location check if bounty is location-based
        const loc = getBountyLocation(bounty)
        if (loc) {
            try {
                const pos = await getCurrentPosition()
                const dist = getDistanceMeters(pos.latitude, pos.longitude, loc.lat, loc.lon)
                if (dist > loc.radiusMeters) {
                    const km = (loc.radiusMeters / 1000).toFixed(2)
                    const msg = `You must be within ${km} km of the bounty location to join.`
                    setFailedReasons((s) => ({ ...s, [bounty.id]: msg }))
                    toast({ title: "Out of range", description: msg })
                    return
                }
            } catch (err) {
                const msg = "Unable to access location. Permission denied or unavailable."
                setFailedReasons((s) => ({ ...s, [bounty.id]: msg }))
                toast({ title: "Location required", description: msg })
                return
            }
        }

        // all checks passed; perform mutation
        joinBountyMutation.mutate({ BountyId: bounty.id })
    }
    if (bounties.length === 0) {
        return <div className="text-center text-xl flex h-full w-full items-center justify-center">No bounties found</div>
    }

    return (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3  ">
            {bounties.map((bounty) => {
                console.log("Rendering bounty:", bounty);
                return (
                    (
                        <Card
                            key={bounty.id}
                            className="flex h-full flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer    overflow-hidden justify-between"

                        >
                            <CardHeader className="relative p-0">
                                <Image
                                    src={bounty.imageUrls[0] ?? "/images/logo.png"}
                                    alt={bounty.title}
                                    width={400}
                                    height={200}
                                    className="h-48 w-full object-cover"
                                />
                                <div className="absolute top-0 right-0 m-4">
                                    <Badge variant="secondary" className="bg-primary ">
                                        {bounty.priceInUSD > 0 ? "USDC" : bounty.priceInBand > 0 ? PLATFORM_ASSET.code.toLocaleUpperCase() : "Free"}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="flex flex-col p-6">
                                <CardTitle className="mb-3 text-xl font-bold">{bounty.title}</CardTitle>
                                <div className="mb-4  min-h-[100px] max-h-[100px] line-clamp-3 overflow-y-auto scrollbar-hide">
                                    <SafeHTML html={bounty.description} />
                                </div>
                                <div className="flex items-center gap-4 text-sm ">
                                    <div className="flex items-center">
                                        <Users className="mr-1 h-4 w-4" />
                                        <span>{bounty._count.participants} participants</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Trophy className="mr-1 h-4 w-4" />
                                        <span>{bounty.totalWinner - bounty.currentWinnerCount} spots left</span>
                                    </div>
                                    <div className="flex items-center">
                                        <User className="mr-1 h-4 w-4" />
                                        <span>{addrShort(bounty.creatorId, 4)}</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-secondary p-4 flex flex-col items-center ">
                                <div className="flex items-center justify-between w-full mb-2">
                                    <div className="flex items-center text-sm">
                                        <Award className="mr-1 inline-block h-4 w-4" />
                                        <span className="font-semibold">
                                            {bounty.priceInBand > 0
                                                ? `${bounty.priceInBand.toFixed(0)} ${PLATFORM_ASSET.code.toLocaleUpperCase()}`
                                                : bounty.priceInUSD > 0 ?
                                                    `$${bounty.priceInUSD.toFixed(2)} USDC`
                                                    : "Free"}
                                        </span>
                                    </div>
                                    <Badge
                                        className="shadow-sm shadow-black rounded-sm"
                                        variant={bounty.currentWinnerCount === bounty.totalWinner ? "destructive" : "default"}
                                    >
                                        {bounty.currentWinnerCount === bounty.totalWinner ? "Completed" : "Active"}
                                    </Badge>
                                </div>
                                {bounty.isJoined || bounty.isOwner ? (
                                    <Button
                                        onClick={() => {
                                            router.push(`/bounty/${bounty.id}`)
                                        }}
                                        variant="default" className="w-full mt-2 shadow-sm shadow-foreground">
                                        View
                                    </Button>
                                ) : (
                                    <Button
                                        variant="default"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            void handleJoinWithLocation(bounty)
                                        }}
                                        className="w-full mt-2 shadow-sm shadow-foreground"
                                        disabled={!isEligible(bounty)}
                                    >
                                        {joinBountyMutation.isLoading && bounty.id === joinBountyMutation.variables?.BountyId ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <Spinner size="small" className="text-black" />
                                                Joining...
                                            </span>
                                        ) : (
                                            "Join"
                                        )}
                                    </Button>
                                )}
                                {
                                    // show per-bounty failed reason first (set when a join attempt fails)
                                    failedReasons[bounty.id] ? (
                                        <p className="text-xs text-red-500 mt-2">{failedReasons[bounty.id]}</p>
                                    ) : !isEligible(bounty) ? (
                                        <p className="text-xs text-red-500 mt-2">
                                            {bounty.currentWinnerCount >= bounty.totalWinner
                                                ? "No spots left"
                                                : `${bounty.requiredBalance.toFixed(1)} ${bounty.requiredBalanceCode.toLocaleUpperCase()} required`}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-green-500 mt-2">
                                            {bounty.currentWinnerCount >= bounty.totalWinner
                                                ? "No spots left"
                                                : bounty.isOwner
                                                    ? "You are the owner"
                                                    : bounty.isJoined
                                                        ? "You have already joined"
                                                        : "You are eligible to join"}
                                        </p>
                                    )
                                }
                            </CardFooter>
                        </Card>


                    ))
            })}
        </div>
    )
}


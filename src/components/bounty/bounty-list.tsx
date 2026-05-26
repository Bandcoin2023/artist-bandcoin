"use client";

import Image from "next/image";
import { Award, Trophy, User, Users, MapPin, Target } from "lucide-react";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "~/components/shadcn/ui/card";
import { Badge } from "~/components/shadcn/ui/badge";
import { type BountyTypes } from "~/types/bounty/bounty-type";
import { PLATFORM_ASSET } from "~/lib/stellar/constant";
import { useRouter } from "next/navigation";
import { Button } from "~/components/shadcn/ui/button";
import { useUserStellarAcc } from "~/lib/state/wallete/stellar-balances";
import { api } from "~/utils/api";
import { toast } from "~/hooks/use-toast";
import { addrShort } from "~/utils/utils";
import { Spinner } from "~/components/shadcn/ui/spinner";
import { Preview } from "../common/quill-preview";
import { Slider } from "../shadcn/ui/slider";
import { Progress } from "../shadcn/ui/progress";
import { useState } from "react";
import { ActivationModal } from "../modal/activation-modal";
export enum BountyTypeEnum {
    GENERAL = "GENERAL",
    LOCATION_BASED = "LOCATION_BASED",
    SCAVENGER_HUNT = "SCAVENGER_HUNT",
}
function SafeHTML({ html }: { html: string }) {
    return <Preview value={html} />;
}

// Helper function to get bounty type icon
const getBountyTypeIcon = (type: BountyTypeEnum) => {
    switch (type) {
        case BountyTypeEnum.LOCATION_BASED:
            return <MapPin className="h-4 w-4" />;
        case BountyTypeEnum.SCAVENGER_HUNT:
            return <Target className="h-4 w-4" />;
        default:
            return <Trophy className="h-4 w-4" />;
    }
};

// Helper function to get bounty type label
const getBountyTypeLabel = (type: BountyTypeEnum) => {
    switch (type) {
        case BountyTypeEnum.LOCATION_BASED:
            return "Location";
        case BountyTypeEnum.SCAVENGER_HUNT:
            return "Scavenger";
        default:
            return "General";
    }
};

export default function BountyList({ bounties,
    isActive,
    isActiveStatusLoading
}: {
    bounties: BountyTypes[],
    isActive: boolean,
    isActiveStatusLoading: boolean
}) {
    const router = useRouter();
    const [dialogOpen, setDialogOpen] = useState(false);
    const { getAssetBalance } = useUserStellarAcc();
    const [failedReasons, setFailedReasons] = useState<Record<number, string>>(
        {},
    );

    const isEligible = (bounty: BountyTypes) => {
        if (
            bounty.requiredBalanceCode == null ||
            bounty.requiredBalanceIssuer == null
        ) {
            return bounty.currentWinnerCount < bounty.totalWinner;
        }
        const balance = getAssetBalance({
            code: bounty.requiredBalanceCode,
            issuer: bounty.requiredBalanceIssuer,
        });

        return (
            bounty.currentWinnerCount < bounty.totalWinner &&
            bounty.requiredBalance <= Number(balance)
        );
    };
    const joinBountyMutation = api.bounty.Bounty.joinBounty.useMutation({
        onSuccess: async (data, variables) => {
            toast({
                title: "Success",
                description: "You have successfully joined the bounty",
            });
            router.push(`/bounty/${variables?.BountyId}`);
        },
    });

    const handleJoinBounty = (id: number) => {
        joinBountyMutation.mutate({ BountyId: id });
    };
    // Helper: get current position as a Promise
    const getCurrentPosition = (): Promise<{
        latitude: number;
        longitude: number;
    }> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return reject(
                    new Error("Geolocation is not supported by this browser."),
                );
            }
            navigator.geolocation.getCurrentPosition(
                (pos) =>
                    resolve({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                    }),
                (err) => reject(err),
                { enableHighAccuracy: true, timeout: 10000 },
            );
        });
    };

    // Haversine - returns distance in meters
    const getDistanceMeters = (
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number,
    ) => {
        const toRad = (v: number) => (v * Math.PI) / 180;
        const R = 6371000; // meters
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Extract possible location fields from bounty; returns null if not location-based
    const getBountyLocation = (
        bounty: BountyTypes,
    ): { lat: number; lon: number; radiusMeters: number } | null => {
        // common field names tried
        const lat = bounty.latitude;
        const lon = bounty.longitude;
        const radius = bounty.radius;

        if (lat == null || lon == null || radius == null) return null;
        return { lat: Number(lat), lon: Number(lon), radiusMeters: Number(radius) };
    };

    // Attempt to join, checking location permission + distance if bounty requires location
    const handleJoinWithLocation = async (bounty: BountyTypes) => {
        // reset any previous reason
        setFailedReasons((s) => ({ ...s, [bounty.id]: "" }));

        // spots
        if (bounty.currentWinnerCount >= bounty.totalWinner) {
            const msg = "No spots left";
            setFailedReasons((s) => ({ ...s, [bounty.id]: msg }));
            return;
        }

        // balance
        const balance = getAssetBalance({
            code: bounty.requiredBalanceCode,
            issuer: bounty.requiredBalanceIssuer,
        });
        if (bounty.requiredBalance > Number(balance)) {
            const msg = `${bounty.requiredBalance.toFixed(1)} ${bounty.requiredBalanceCode.toLocaleUpperCase()} required`;
            setFailedReasons((s) => ({ ...s, [bounty.id]: msg }));
            return;
        }

        // location check if bounty is location-based
        const loc = getBountyLocation(bounty);
        if (loc) {
            try {
                const pos = await getCurrentPosition();
                const dist = getDistanceMeters(
                    pos.latitude,
                    pos.longitude,
                    loc.lat,
                    loc.lon,
                );
                if (dist > loc.radiusMeters) {
                    const km = (loc.radiusMeters / 1000).toFixed(2);
                    const msg = `You must be within ${km} km of the bounty location to join.`;
                    setFailedReasons((s) => ({ ...s, [bounty.id]: msg }));
                    toast({ title: "Out of range", description: msg });
                    return;
                }
            } catch (err) {
                const msg =
                    "Unable to access location. Permission denied or unavailable.";
                setFailedReasons((s) => ({ ...s, [bounty.id]: msg }));
                toast({ title: "Location required", description: msg });
                return;
            }
        }

        // all checks passed; perform mutation
        joinBountyMutation.mutate({ BountyId: bounty.id });
    };
    if (bounties.length === 0) {
        return null; // Empty state is handled in the parent component
    }
    console.log("failedReasons", failedReasons);
    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {bounties.map((bounty, index) => {
                const priceNumber =
                    bounty.priceInBand > 0
                        ? bounty.priceInBand.toFixed(2)
                        : bounty.priceInUSD > 0
                            ? `$${bounty.priceInUSD.toFixed(2)}`
                            : "Free";
                const priceUnit =
                    bounty.priceInBand > 0
                        ? PLATFORM_ASSET.code.toLocaleUpperCase()
                        : bounty.priceInUSD > 0
                            ? "USDC"
                            : "";
                const isCompleted = bounty.currentWinnerCount === bounty.totalWinner;
                const eligibilityMessage = !isEligible(bounty)
                    ? (bounty.currentWinnerCount >= bounty.totalWinner
                        ? "No spots left"
                        : `${bounty.requiredBalance.toFixed(1)} ${bounty.requiredBalanceCode.toLocaleUpperCase()} required`)
                    : (bounty.currentWinnerCount >= bounty.totalWinner
                        ? "No spots left"
                        : bounty.isOwner
                            ? "You are the owner"
                            : bounty.isJoined
                                ? "You have already joined"
                                : failedReasons[bounty.id]
                                    ? failedReasons[bounty.id]
                                    : "You are eligible to join");
                const ctaLabel = bounty.isJoined || bounty.isOwner ? "View Details" : "Join Bounty";

                return (
                    <Card
                        key={index}
                        className="group relative h-full cursor-pointer overflow-hidden rounded-[0.95rem] border border-[#ddd9d0] bg-white shadow-[0_6px_18px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-none"
                    >
                        <CardHeader className="p-0">
                            <div className="relative h-44 w-full overflow-hidden rounded-t-[0.95rem] bg-[#d8c7bb] dark:bg-zinc-800">
                                <Image
                                    src={bounty.imageUrls[0] ?? "/images/logo.png"}
                                    alt={bounty.title}
                                    width={400}
                                    height={200}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                />
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
                            </div>
                        </CardHeader>

                        <CardContent className="relative flex flex-col p-0">
                            <div className="flex flex-1 flex-col gap-2 px-4 pb-3.5 pt-3">
                                <div className="flex items-center gap-2">
                                    <div className="inline-flex w-fit rounded-[2px] bg-[#f3f1ee] px-2 py-0.5 text-sm font-medium text-black/60 dark:bg-zinc-800 dark:text-zinc-300">
                                        <span className="mr-1 inline-flex items-center">
                                            {getBountyTypeIcon(bounty.bountyType as BountyTypeEnum)}
                                        </span>
                                        {getBountyTypeLabel(
                                            bounty.bountyType as BountyTypeEnum,
                                        )}
                                    </div>
                                    <div className="inline-flex w-fit rounded-[2px] bg-[#f3f1ee] px-2 py-0.5 text-sm font-medium text-black/60 dark:bg-zinc-800 dark:text-zinc-300">
                                        {bounty.currentWinnerCount === bounty.totalWinner ? "Completed" : "Active"}
                                    </div>
                                </div>

                                <div className="flex items-start justify-between gap-3">
                                    <CardTitle className="line-clamp-1 text-[0.98rem] font-semibold leading-tight text-black/90 dark:text-zinc-100">
                                        {bounty.title}
                                    </CardTitle>
                                    <p className="shrink-0 truncate font-mono text-sm text-foreground/70 dark:text-zinc-400">
                                        {addrShort(bounty.creatorId, 4)}
                                    </p>
                                </div>

                                <div className="space-y-0">
                                    <div className="flex items-center gap-1 text-sm font-medium text-black/88 dark:text-zinc-100">
                                        <Award className="h-4 w-4" />
                                        <span className="text-[#1f86ee] dark:text-sky-400">{priceNumber}</span>
                                        {priceUnit ? <span>{priceUnit}</span> : null}
                                    </div>
                                </div>

                                <div className="h-[80px] overflow-y-auto text-left text-sm text-black/55 dark:text-zinc-300 [&_*]:text-left scrollbar-thin">
                                    <SafeHTML html={bounty.description} />
                                </div>

                                <p className={`text-xs ${failedReasons[bounty.id] || !isEligible(bounty) ? "text-red-500" : "text-emerald-600"}`}>
                                    {eligibilityMessage}
                                </p>
                                <p className="text-sm text-black/52 dark:text-zinc-400">
                                    {`${bounty.totalWinner - bounty.currentWinnerCount} spots left · ${bounty._count.participants} participants`}
                                </p>
                            </div>

                            <div className="relative z-20 mt-3 md:pointer-events-none md:absolute md:inset-x-0 md:bottom-0 md:mt-0 md:translate-y-full md:opacity-0 md:transition-all md:duration-300 md:group-hover:pointer-events-auto md:group-hover:translate-y-0 md:group-hover:opacity-100">
                                <Button
                                    variant="default"
                                    className="h-12 w-full rounded-none border-0 bg-[#1f86ee] px-4 text-base font-semibold text-white shadow-none hover:bg-[#1877da] disabled:pointer-events-none disabled:bg-[#d9d9d9] disabled:text-black/45 disabled:opacity-100"
                                    disabled={
                                        !(bounty.isJoined || bounty.isOwner) &&
                                        isActive &&
                                        !isActiveStatusLoading &&
                                        (!isEligible(bounty) || joinBountyMutation.isLoading)
                                    }
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (bounty.isJoined || bounty.isOwner) {
                                            router.push(`/bounty/${bounty.id}`);
                                            return;
                                        }
                                        if (isActive && !isActiveStatusLoading) {
                                            await handleJoinWithLocation(bounty);
                                            return;
                                        }
                                        if (!isActive && !isActiveStatusLoading) {
                                            setDialogOpen(true);
                                        }
                                    }}
                                >
                                    {joinBountyMutation.isLoading &&
                                        bounty.id === joinBountyMutation.variables?.BountyId ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Spinner size="small" />
                                            Joining...
                                        </span>
                                    ) : (
                                        ctaLabel
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
            <ActivationModal
                dialogOpen={dialogOpen}
                setDialogOpen={setDialogOpen}
            />
        </div>
    );
}

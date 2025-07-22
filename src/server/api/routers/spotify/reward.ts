import { z } from "zod"
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc"
import { TRPCError } from "@trpc/server"
import { getClaimXDR, sendRewardAssetToStorage } from "~/lib/stellar/music/spotify"

export const spotifyRewardRouter = createTRPCRouter({
    addRewardedTrack: protectedProcedure
        .input(
            z.object({
                spotifyTrackId: z.string(),
                trackName: z.string(),
                artistName: z.string(),
                albumName: z.string().optional().nullable(),
                albumCoverUrl: z.string().optional().nullable(),
                rewardIntervalDays: z.number().int().positive(),
                rewardAmount: z.number().positive(),
                maximumRewardAmount: z.number().positive(),
                rewardCurrency: z.string({
                    required_error: "Currency is required",
                }),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const {
                spotifyTrackId,
                trackName,
                artistName,
                albumName,
                albumCoverUrl,
                rewardIntervalDays,
                rewardAmount,
                maximumRewardAmount,
                rewardCurrency,
            } = input
            console.log("Adding rewarded track:", input)
            const creatorId = ctx.session.user.id
            const [assetId, assetIssuer] = rewardCurrency.split("-")
            if (!assetId || !assetIssuer) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Invalid reward currency format. Expected 'assetId-assetIssuer'.",
                })
            }




            // Validate that maximumRewardAmount is greater than or equal to rewardAmount
            if (maximumRewardAmount < rewardAmount) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Maximum reward amount must be greater than or equal to reward amount.",
                })
            }

            const existingReward = await ctx.db.spotifyTrack.findUnique({
                where: {
                    spotifyTrackId_creatorId: {
                        spotifyTrackId,
                        creatorId,
                    },
                },
            })

            if (existingReward) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "This track is already added to your rewards.",
                })
            }

            return ctx.db.spotifyTrack.create({
                data: {
                    spotifyTrackId,
                    trackName,
                    artistName,
                    albumName,
                    albumCoverUrl,
                    rewardIntervalDays,
                    rewardAmount,
                    maximumRewardAmount,
                    assetId,
                    assetIssuer, // Placeholder, should be set later
                    creatorId,
                },
            })
        }),

    updateRewardedTrack: protectedProcedure
        .input(
            z.object({
                id: z.number(),
                rewardIntervalDays: z.number().int().positive(),
                rewardAmount: z.number().positive(),
                maximumRewardAmount: z.number().positive(),
                rewardCurrency: z.string({
                    required_error: "Currency is required",
                }),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { id, rewardIntervalDays, rewardAmount, maximumRewardAmount, rewardCurrency } = input
            const creatorId = ctx.session.user.id
            const [assetId, assetIssuer] = input.rewardCurrency.split("-")
            if (!assetId || !assetIssuer) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Invalid reward currency format. Expected 'assetId-assetIssuer'.",
                })
            }
            // Validate that maximumRewardAmount is greater than or equal to rewardAmount
            if (maximumRewardAmount < rewardAmount) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Maximum reward amount must be greater than or equal to reward amount.",
                })
            }

            // Check if the reward exists and belongs to the creator
            const existingReward = await ctx.db.spotifyTrack.findFirst({
                where: {
                    id,
                    creatorId,
                },
            })

            if (!existingReward) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Reward not found or you don't have permission to update it.",
                })
            }

            // Check if the new maximum is less than already given amount
            if (maximumRewardAmount < existingReward.alreadyGivenAmount) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: `Maximum reward amount cannot be less than already given amount (${existingReward.alreadyGivenAmount}).`,
                })
            }

            return ctx.db.spotifyTrack.update({
                where: { id },
                data: {
                    rewardIntervalDays,
                    rewardAmount,
                    maximumRewardAmount,
                    assetId: assetId ?? existingReward.assetId,
                    assetIssuer: assetIssuer ?? existingReward.assetIssuer,
                },
            })
        }),

    getRewardedTrackStatus: protectedProcedure
        .input(z.object({ spotifyTrackId: z.string() }))
        .query(async ({ ctx, input }) => {
            const creatorId = ctx.session.user.id
            const spotifyTrack = await ctx.db.spotifyTrack.findUnique({
                where: {
                    spotifyTrackId_creatorId: {
                        spotifyTrackId: input.spotifyTrackId,
                        creatorId,
                    },
                },
            })
            return spotifyTrack
        }),

    getCreatorRewardedTracks: protectedProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(10),
                cursor: z.number().nullish(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const { limit, cursor } = input
            const creatorId = ctx.session.user.id

            const items = await ctx.db.spotifyTrack.findMany({
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                where: { creatorId },
                orderBy: { createdAt: "desc" },
            })

            let nextCursor: typeof cursor | undefined = undefined
            if (items.length > limit) {
                const nextItem = items.pop()
                nextCursor = nextItem?.id
            }

            return {
                items,
                nextCursor,
            }
        }),

    removeRewardedTrack: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
        const creatorId = ctx.session.user.id
        return ctx.db.spotifyTrack.delete({
            where: {
                id: input.id,
                creatorId,
            },
        })
    }),

    getAllRewardedTracksForUsers: publicProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(10),
                cursor: z.number().nullish(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const { limit, cursor } = input

            const items = await ctx.db.spotifyTrack.findMany({
                take: limit + 1,
                skip: cursor ? 1 : undefined,
                ...(cursor && { cursor: { id: cursor } }),
                where: {
                    // Only show tracks that haven't reached their maximum reward amount
                    alreadyGivenAmount: {
                        lt: ctx.db.spotifyTrack.fields.maximumRewardAmount,
                    },
                },
                orderBy: { createdAt: "desc" },
            })

            let nextCursor: typeof cursor | undefined = undefined
            if (items.length > limit) {
                const nextItem = items.pop()
                nextCursor = nextItem?.id
            }

            // Check if the current user has claimed these rewards and when they last claimed
            const userClaimData = ctx.session?.user?.id
                ? await ctx.db.claimSpotifyReward.findMany({
                    where: {
                        userId: ctx.session.user.id,
                        spotifyTrackId: { in: items.map((item) => item.id) },
                    },
                    select: {
                        spotifyTrackId: true,
                        lastClaimedAt: true,
                        rewardAmount: true,
                    },
                    orderBy: { lastClaimedAt: "desc" },
                    distinct: ["spotifyTrackId"],
                })
                : []

            const claimDataMap = new Map(userClaimData.map((claim) => [claim.spotifyTrackId, claim]))

            const itemsWithClaimStatus = items.map((item) => {
                const userClaim = claimDataMap.get(item.id)
                // Determine if the user can claim this reward again
                // If the user has never claimed this track, they can claim it
                // If they have claimed it, check the last claimed date against the reward interval
                const canClaimAgain = userClaim
                    ? new Date().getTime() - userClaim.lastClaimedAt.getTime() >= item.rewardIntervalDays * 24 * 60 * 60 * 1000
                    : true

                return {
                    ...item,
                    isClaimed: !!userClaim,
                    canClaimAgain,
                    lastClaimedAt: userClaim?.lastClaimedAt,
                    nextClaimAvailable: userClaim
                        ? new Date(userClaim.lastClaimedAt.getTime() + item.rewardIntervalDays * 24 * 60 * 60 * 1000)
                        : null,
                }
            })

            return {
                items: itemsWithClaimStatus,
                nextCursor,
            }
        }),

    claimRewardedTrack: protectedProcedure
        .input(z.object({ rewardedTrackId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id

            // 1. Check if user is connected to Spotify
            const spotifyAccount = await ctx.db.spotifyAccount.findUnique({
                where: { userId },
            })

            if (!spotifyAccount) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Please connect your Spotify account first.",
                })
            }

            // 2. Check if the reward exists and hasn't reached maximum
            const rewardedTrack = await ctx.db.spotifyTrack.findUnique({
                where: { id: input.rewardedTrackId },
            })

            if (!rewardedTrack) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Rewarded track not found.",
                })
            }

            if (rewardedTrack.alreadyGivenAmount >= rewardedTrack.maximumRewardAmount) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "This reward has reached its maximum limit.",
                })
            }

            // 3. Check if enough reward amount is remaining
            if (rewardedTrack.alreadyGivenAmount + rewardedTrack.rewardAmount > rewardedTrack.maximumRewardAmount) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Insufficient reward amount remaining.",
                })
            }

            // 4. Check if the user has waited enough time since last claim
            const lastClaim = await ctx.db.claimSpotifyReward.findFirst({
                where: {
                    userId,
                    spotifyTrackId: input.rewardedTrackId,
                },
                orderBy: { lastClaimedAt: "desc" },
            })

            if (lastClaim) {
                const timeSinceLastClaim = new Date().getTime() - lastClaim.lastClaimedAt.getTime()
                const requiredInterval = rewardedTrack.rewardIntervalDays * 24 * 60 * 60 * 1000

                if (timeSinceLastClaim < requiredInterval) {
                    const nextClaimDate = new Date(lastClaim.lastClaimedAt.getTime() + requiredInterval)
                    throw new TRPCError({
                        code: "TOO_MANY_REQUESTS",
                        message: `You can claim this reward again on ${nextClaimDate.toLocaleDateString()}.`,
                    })
                }
            }

            // 5. TODO: Check if user has recently played this track on Spotify
            // This would require calling Spotify API to get user's recent tracks
            // For now, we'll skip this check but you should implement it

            // 6. Create the claim entry and update the track's given amount
            const [newClaim] = await ctx.db.$transaction([
                ctx.db.claimSpotifyReward.create({
                    data: {
                        userId,
                        spotifyTrackId: input.rewardedTrackId,
                        lastClaimedAt: new Date(),
                        rewardAmount: rewardedTrack.rewardAmount,
                    },
                }),
                ctx.db.spotifyTrack.update({
                    where: { id: input.rewardedTrackId },
                    data: {
                        alreadyGivenAmount: {
                            increment: rewardedTrack.rewardAmount,
                        },
                    },
                }),
            ])

            return {
                success: true,
                claim: newClaim,
                rewardAmount: rewardedTrack.rewardAmount,

            }
        }),
    checkUserRecentTracks: protectedProcedure
        .input(z.object({ spotifyTrackId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id

            // Get user's Spotify account
            const spotifyAccount = await ctx.db.spotifyAccount.findUnique({
                where: { userId },
            })

            if (!spotifyAccount?.accessToken) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Spotify account not connected or token expired.",
                })
            }

            try {
                const hasPlayedRecently = await checkUserRecentlyPlayedTrack(spotifyAccount, input.spotifyTrackId)

                return {
                    hasPlayedRecently,
                    message: hasPlayedRecently
                        ? "Track found in your recent listening history!"
                        : "Track not found in recent listening history. Please play the song on Spotify first.",
                }
            } catch (error) {
                console.error("Spotify API error:", error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to check recent tracks.",
                })
            }
        }),
    sendRewardsToStorage: protectedProcedure
        .input(
            z.object({
                rewardCurrency: z.string({
                    required_error: "Currency is required",
                }),
                maximumRewardAmount: z.number().positive(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { rewardCurrency, maximumRewardAmount } = input
            const creatorId = ctx.session.user.id
            const [assetId, assetIssuer] = rewardCurrency.split("-")
            if (!assetId || !assetIssuer) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Invalid reward currency format. Expected 'assetId-assetIssuer'.",
                })
            }
            const creator = await ctx.db.creator.findUnique({
                where: { id: creatorId },
            })
            if (!creator) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Creator not found.",
                })
            }

            // Validate that maximumRewardAmount is greater than 0
            if (maximumRewardAmount <= 0) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Maximum reward amount must be greater than 0.",
                })
            }

            console.log("Storage Secrat:", creator.storageSecret)
            return sendRewardAssetToStorage({
                assetCode: assetId,
                assetIssuer,
                maximumRewardAmount,
                storageSecret: creator.storageSecret,
                userId: creatorId,
            })
        }
        ),
    getClaimXDR: protectedProcedure
        .input(z.object({ rewardedTrackId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const { rewardedTrackId } = input
            const userId = ctx.session.user.id
            const spotifyTrack = await ctx.db.spotifyTrack.findUnique({
                where: { id: rewardedTrackId },
            })
            if (!spotifyTrack) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Rewarded track not found.",
                })
            }
            const creator = await ctx.db.creator.findUnique({
                where: { id: spotifyTrack.creatorId },
            })
            if (!creator) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Creator not found.",
                })
            }

            return getClaimXDR({
                assetCode: spotifyTrack.assetId,
                rewardAmount: spotifyTrack.rewardAmount,
                assetIssuer: spotifyTrack.assetIssuer,
                storageSecret: creator.storageSecret,
                userId,
            })

        })
})
type SpotifyAccount = {
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: Date | null;
};

type SpotifyTrackItem = {
    track: { id: string };
};

type RecentlyPlayedResponse = {
    items: SpotifyTrackItem[];
};

type TopTracksResponse = {
    items: { id: string }[];
};

type CurrentlyPlayingResponse = {
    item?: { id: string };
};

export async function checkUserRecentlyPlayedTrack(
    spotifyAccount: SpotifyAccount,
    trackId: string,
): Promise<boolean> {
    if (!spotifyAccount.accessToken) {
        throw new Error("No access token available");
    }

    const headers = {
        Authorization: `Bearer ${spotifyAccount.accessToken}`,
    };

    // 1. Recently Played Tracks
    try {
        const recentlyPlayedResponse = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=50", {
            headers,
        });

        if (recentlyPlayedResponse.ok) {
            const data = (await recentlyPlayedResponse.json()) as RecentlyPlayedResponse;
            const recentTrackIds = data.items?.map(item => item.track?.id) ?? [];
            if (recentTrackIds.includes(trackId)) {
                return true;
            }
        }
    } catch (error) {
        console.error("Error checking recently played tracks:", error);
    }

    // 2. Top Tracks (short_term)
    try {
        const topTracksResponse = await fetch("https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=short_term", {
            headers,
        });

        if (topTracksResponse.ok) {
            const data = (await topTracksResponse.json()) as TopTracksResponse;
            const topTrackIds = data.items?.map(track => track.id) ?? [];
            if (topTrackIds.includes(trackId)) {
                return true;
            }
        }
    } catch (error) {
        console.error("Error checking top tracks:", error);
    }

    // 3. Currently Playing
    try {
        const currentPlayingResponse = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
            headers,
        });

        if (currentPlayingResponse.ok && currentPlayingResponse.status !== 204) {
            const data = (await currentPlayingResponse.json()) as CurrentlyPlayingResponse;
            if (data.item?.id === trackId) {
                return true;
            }
        }
    } catch (error) {
        console.error("Error checking currently playing:", error);
    }

    return false;
}

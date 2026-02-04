import { z } from "zod"
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc"
import { TRPCError } from "@trpc/server"
import { createLastFmClient } from "~/lib/lastfm/api"
import { db } from "~/server/db"
import { getClaimXDR, sendRewardAssetToStorage } from "~/lib/stellar/music/spotify"
import { SignUser } from "~/lib/stellar/utils"

export const lastFMRouter = createTRPCRouter({
    getlastFMAccount: protectedProcedure.query(async ({ ctx }) => {
        return db.lastFMAccount.findUnique({
            where: { userId: ctx.session.user.id },
        })
    }),

    saveLastFmAccount: protectedProcedure
        .input(
            z.object({
                username: z.string(),
                realName: z.string(),
                sessionKey: z.string(),
                profileUrl: z.string(),
                image: z.string().nullable(),
                playCount: z.number(),
                country: z.string(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id

            await db.lastFMAccount.upsert({
                where: { userId: userId },
                update: {
                    username: input.username,
                    realName: input.realName,
                    sessionKey: input.sessionKey,
                    profileUrl: input.profileUrl,
                    image: input.image,
                    playCount: input.playCount,
                    country: input.country,
                },
                create: {
                    userId: userId,
                    username: input.username,
                    realName: input.realName,
                    sessionKey: input.sessionKey,
                    profileUrl: input.profileUrl,
                    image: input.image,
                    playCount: input.playCount,
                    country: input.country,
                },
            })

            return { success: true }
        }),

    disconnectLastFm: protectedProcedure.mutation(async ({ ctx }) => {
        await db.lastFMAccount.delete({
            where: { userId: ctx.session.user.id },
        })
        return { success: true }
    }),

    getRecentTracks: protectedProcedure
        .input(
            z.object({
                limit: z.number().int().min(1).max(200).default(10),
            }),
        )
        .query(async ({ ctx, input }) => {
            const account = await db.lastFMAccount.findUnique({
                where: { userId: ctx.session.user.id },
            })

            if (!account) {
                throw new Error("Last.fm account not connected")
            }

            const client = createLastFmClient()
            return client.getRecentTracks(account.username, input.limit)
        }),

    getTopTracks: protectedProcedure
        .input(
            z.object({
                period: z
                    .enum(["overall", "7day", "1month", "3month", "6month", "12month"])
                    .default("overall"),
                limit: z.number().int().min(1).max(200).default(10),
            }),
        )
        .query(async ({ ctx, input }) => {
            const account = await db.lastFMAccount.findUnique({
                where: { userId: ctx.session.user.id },
            })

            if (!account) {
                throw new Error("Last.fm account not connected")
            }

            const client = createLastFmClient()
            return client.getTopTracks(account.username, input.period, input.limit)
        }),

    getLovedTracks: protectedProcedure
        .input(
            z.object({
                limit: z.number().int().min(1).max(200).default(10),
            }),
        )
        .query(async ({ ctx, input }) => {
            const account = await db.lastFMAccount.findUnique({
                where: { userId: ctx.session.user.id },
            })

            if (!account) {
                throw new Error("Last.fm account not connected")
            }

            const client = createLastFmClient()
            return client.getLovedTracks(account.username, input.limit)
        }),

    searchTracks: protectedProcedure
        .input(
            z.object({
                query: z.string().min(1, "Search query cannot be empty."),
                limit: z.number().int().min(1).max(200).default(10),
            }),
        )
        .query(async ({ ctx, input }) => {
            try {
                const client = createLastFmClient()
                return await client.searchTracks(input.query, input.limit)
            } catch (error) {
                console.error(`Failed to search Last.fm tracks for query "${input.query}":`, error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to search Last.fm tracks.`,
                })
            }
        }),

    loveTrack: protectedProcedure
        .input(
            z.object({
                artist: z.string(),
                track: z.string(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const account = await db.lastFMAccount.findUnique({
                where: { userId: ctx.session.user.id },
            })

            if (!account) {
                throw new Error("Last.fm account not connected")
            }

            const client = createLastFmClient()
            return client.loveTrack(input.artist, input.track, account.sessionKey)
        }),

    unloveTrack: protectedProcedure
        .input(
            z.object({
                artist: z.string(),
                track: z.string(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const account = await db.lastFMAccount.findUnique({
                where: { userId: ctx.session.user.id },
            })

            if (!account) {
                throw new Error("Last.fm account not connected")
            }

            const client = createLastFmClient()
            return client.unloveTrack(input.artist, input.track, account.sessionKey)
        }),

    getNowPlaying: protectedProcedure.query(async ({ ctx }) => {
        const account = await db.lastFMAccount.findUnique({
            where: { userId: ctx.session.user.id },
        })

        if (!account) {
            throw new Error("Last.fm account not connected")
        }

        const client = createLastFmClient()
        return client.getNowPlaying(account.username)
    }),


    // Reward Features
    addRewardedTrack: protectedProcedure
        .input(
            z.object({
                lastFMTrackURL: z.string(),
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
                lastFMTrackURL,
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

            if (maximumRewardAmount < rewardAmount) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Maximum reward amount must be greater than or equal to reward amount.",
                })
            }

            const existingReward = await db.lastFMTrack.findUnique({
                where: {
                    trackurl_creatorId: {
                        trackurl: lastFMTrackURL,
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

            return db.lastFMTrack.create({
                data: {
                    trackurl: lastFMTrackURL,
                    trackName,
                    artistName,
                    albumName,
                    albumCoverUrl,
                    rewardIntervalDays,
                    rewardAmount,
                    maximumRewardAmount,
                    assetId,
                    assetIssuer,
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
            const [assetId, assetIssuer] = rewardCurrency.split("-")
            if (!assetId || !assetIssuer) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Invalid reward currency format. Expected 'assetId-assetIssuer'.",
                })
            }

            if (maximumRewardAmount < rewardAmount) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Maximum reward amount must be greater than or equal to reward amount.",
                })
            }

            const existingReward = await db.lastFMTrack.findFirst({
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

            if (maximumRewardAmount < existingReward.alreadyGivenAmount) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: `Maximum reward amount cannot be less than already given amount (${existingReward.alreadyGivenAmount}).`,
                })
            }

            return db.lastFMTrack.update({
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
        .input(z.object({ lastFMTrackURL: z.string() }))
        .query(async ({ ctx, input }) => {
            const creatorId = ctx.session.user.id
            const lastFmTrack = await db.lastFMTrack.findUnique({
                where: {
                    trackurl_creatorId: {
                        trackurl: input.lastFMTrackURL,
                        creatorId,
                    },
                },
            })
            return lastFmTrack
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

            const items = await db.lastFMTrack.findMany({
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
        return db.lastFMTrack.delete({
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

            const items = await db.lastFMTrack.findMany({
                take: limit + 1,
                skip: cursor ? 1 : undefined,
                ...(cursor && { cursor: { id: cursor } }),
                where: {
                    alreadyGivenAmount: {
                        lt: db.lastFMTrack.fields.maximumRewardAmount,
                    },
                },
                orderBy: { createdAt: "desc" },
            })

            let nextCursor: typeof cursor | undefined = undefined
            if (items.length > limit) {
                const nextItem = items.pop()
                nextCursor = nextItem?.id
            }

            const userClaimData = ctx.session?.user?.id
                ? await db.claimLastFMReward.findMany({
                    where: {
                        userId: ctx.session.user.id,
                        lastFMTrackId: { in: items.map((item) => item.id) },
                    },
                    select: {
                        lastFMTrackId: true,
                        lastClaimedAt: true,
                        rewardAmount: true,
                    },
                    orderBy: { lastClaimedAt: "desc" },
                    distinct: ["lastFMTrackId"],
                })
                : []

            const claimDataMap = new Map(userClaimData.map((claim) => [claim.lastFMTrackId, claim]))

            const itemsWithClaimStatus = items.map((item) => {
                const userClaim = claimDataMap.get(item.id)
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

            const lastFmAccount = await db.lastFMAccount.findUnique({
                where: { userId },
            })

            if (!lastFmAccount) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Please connect your Last.fm account first.",
                })
            }

            const rewardedTrack = await db.lastFMTrack.findUnique({
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

            if (rewardedTrack.alreadyGivenAmount + rewardedTrack.rewardAmount > rewardedTrack.maximumRewardAmount) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Insufficient reward amount remaining.",
                })
            }

            const lastClaim = await db.claimLastFMReward.findFirst({
                where: {
                    userId,
                    lastFMTrackId: input.rewardedTrackId,
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

            const [newClaim] = await db.$transaction([
                db.claimLastFMReward.create({
                    data: {
                        userId,
                        lastFMTrackId: input.rewardedTrackId,
                        lastClaimedAt: new Date(),
                        rewardAmount: rewardedTrack.rewardAmount,
                    },
                }),
                db.lastFMTrack.update({
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
            const creator = await db.creator.findUnique({
                where: { id: creatorId },
            })
            if (!creator) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Creator not found.",
                })
            }

            if (maximumRewardAmount <= 0) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Maximum reward amount must be greater than 0.",
                })
            }

            console.log("Storage Secret:", creator.storageSecret)
            return sendRewardAssetToStorage({
                assetCode: assetId,
                assetIssuer,
                maximumRewardAmount,
                storageSecret: creator.storageSecret,
                userId: creatorId,
            })
        }),

    getClaimXDR: protectedProcedure
        .input(z.object({
            rewardedTrackId: z.number(), signWith: SignUser,
        }))
        .mutation(async ({ ctx, input }) => {
            const { rewardedTrackId } = input
            const userId = ctx.session.user.id
            const lastFmTrack = await db.lastFMTrack.findUnique({
                where: { id: rewardedTrackId },
            })
            if (!lastFmTrack) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Rewarded track not found.",
                })
            }
            const creator = await db.creator.findUnique({
                where: { id: lastFmTrack.creatorId },
            })
            if (!creator) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Creator not found.",
                })
            }

            return getClaimXDR({
                assetCode: lastFmTrack.assetId,
                rewardAmount: lastFmTrack.rewardAmount,
                assetIssuer: lastFmTrack.assetIssuer,
                storageSecret: creator.storageSecret,
                userId,
                signWith: input.signWith,
            })
        }),
})

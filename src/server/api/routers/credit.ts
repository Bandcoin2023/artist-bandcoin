import { z } from "zod"
import { createTRPCRouter, protectedProcedure, adminProcedure } from "~/server/api/trpc"
import { TRPCError } from "@trpc/server"
import { SignUser } from "~/lib/stellar/utils"
import { XDR4BuyCreditsWithAsset, XDR4BuyCreditsWithUSDC } from "~/lib/stellar/music/trx/ai-credits-xdr"
import { getAssetToUSDCRate } from "~/lib/stellar/fan/get_token_price"

export const creditRouter = createTRPCRouter({
    // Get user's credit balance
    getBalance: protectedProcedure.query(async ({ ctx }) => {
        const balance = await ctx.db.creditBalance.findUnique({
            where: { userId: ctx.session.user.id },
        })

        if (!balance) {
            // Create initial balance if doesn't exist
            const newBalance = await ctx.db.creditBalance.create({
                data: {
                    userId: ctx.session.user.id,
                    balance: 0,
                },
            })
            return { balance: newBalance.balance }
        }

        return { balance: balance.balance }
    }),

    // Get credit transaction history
    getTransactions: protectedProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(50),
                cursor: z.string().optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const transactions = await ctx.db.creditTransaction.findMany({
                where: { userId: ctx.session.user.id },
                take: input.limit + 1,
                cursor: input.cursor ? { id: input.cursor } : undefined,
                orderBy: { createdAt: "desc" },
            })

            let nextCursor: string | undefined = undefined
            if (transactions.length > input.limit) {
                const nextItem = transactions.pop()
                nextCursor = nextItem?.id
            }

            return {
                transactions,
                nextCursor,
            }
        }),

    // Get available credit packages
    getPackages: protectedProcedure.query(async ({ ctx }) => {
        const packages = await ctx.db.creditPackage.findMany({
            where: { isActive: true },
            orderBy: { credits: "asc" },
        })
        return { packages }
    }),

    // Purchase credits
    purchaseCredits: protectedProcedure
        .input(
            z.object({
                packageId: z.string(),
                method: z.enum(["xlm", "asset", "usdc", "card"]),
                paymentAmount: z.number(),
                signWith: SignUser,

            }),
        )
        .mutation(async ({ ctx, input }) => {
            // Get the package
            const package_ = await ctx.db.creditPackage.findUnique({
                where: { id: input.packageId },
            })

            if (!package_) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Credit package not found",
                })
            }

            // Verify payment amount matches package price
            const expectedPrice = input.method === "asset" ? package_.priceBand : package_.priceUSDC

            if (Math.abs(input.paymentAmount - expectedPrice) > 0.01) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Payment amount does not match package price",
                })
            }

            const totalCredits = package_.credits + package_.bonus

            // Create or update credit balance
            const balance = await ctx.db.creditBalance.upsert({
                where: { userId: ctx.session.user.id },
                create: {
                    userId: ctx.session.user.id,
                    balance: totalCredits,
                },
                update: {
                    balance: {
                        increment: totalCredits,
                    },
                },
            })

            // Create transaction record
            const transaction = await ctx.db.creditTransaction.create({
                data: {
                    userId: ctx.session.user.id,
                    amount: totalCredits,
                    type: "PURCHASE",
                    description: `Purchased ${package_.name} - ${package_.credits} credits${package_.bonus > 0 ? ` + ${package_.bonus} bonus` : ""}`,
                    paymentMethod: input.method,
                    paymentAmount: input.paymentAmount,
                    metadata: {
                        packageId: input.packageId,
                        packageName: package_.name,
                    },
                },
            })

            return {
                success: true,
                balance: balance.balance,
                transaction,
            }
        }),

    // Consume credits (called internally by AI generation)
    consumeCredits: protectedProcedure
        .input(
            z.object({
                credits: z.number().min(1),
                description: z.string(),
                metadata: z.record(z.any()).optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // Get current balance
            const balance = await ctx.db.creditBalance.findUnique({
                where: { userId: ctx.session.user.id },
            })

            if (!balance ?? balance.balance < input.credits) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Insufficient credits",
                })
            }

            // Deduct credits
            const updatedBalance = await ctx.db.creditBalance.update({
                where: { userId: ctx.session.user.id },
                data: {
                    balance: {
                        decrement: input.credits,
                    },
                },
            })

            // Create transaction record
            await ctx.db.creditTransaction.create({
                data: {
                    userId: ctx.session.user.id,
                    amount: -input.credits,
                    type: "USAGE",
                    description: input.description,
                    metadata: input.metadata,
                },
            })

            return {
                success: true,
                remainingBalance: updatedBalance.balance,
            }
        }),


    // Get usage statistics
    getUsageStats: protectedProcedure.query(async ({ ctx }) => {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const [totalSpent, totalPurchased, recentGenerations] = await Promise.all([
            ctx.db.creditTransaction.aggregate({
                where: {
                    userId: ctx.session.user.id,
                    type: "USAGE",
                },
                _sum: { amount: true },
            }),
            ctx.db.creditTransaction.aggregate({
                where: {
                    userId: ctx.session.user.id,
                    type: "PURCHASE",
                },
                _sum: { amount: true },
            }),
            ctx.db.aiGeneratedContent.count({
                where: {
                    creatorId: ctx.session.user.id,
                    createdAt: { gte: thirtyDaysAgo },
                },
            }),
        ])
        console.log("totalSpent:", totalSpent);
        return {
            totalCreditsSpent: Math.abs(totalSpent._sum.amount ?? 0),
            totalCreditsPurchased: totalPurchased._sum.amount ?? 0,
            generationsLast30Days: recentGenerations,
        }
    }),

    adminGetAllPackages: adminProcedure.query(async ({ ctx }) => {
        const packages = await ctx.db.creditPackage.findMany({
            orderBy: { credits: "asc" },
        })
        return { packages }
    }),

    adminCreatePackage: adminProcedure
        .input(
            z.object({
                name: z.string().min(1),
                description: z.string().optional(),
                credits: z.number().min(1),
                bonus: z.number().min(0).default(0),
                priceBand: z.number().min(0),
                priceUSDC: z.number().min(0),
                isPopular: z.boolean().default(false),
                isActive: z.boolean().default(true),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const package_ = await ctx.db.creditPackage.create({
                data: input,
            })

            return {
                success: true,
                package: package_,
            }
        }),

    adminUpdatePackage: adminProcedure
        .input(
            z.object({
                id: z.string(),
                name: z.string().min(1).optional(),
                description: z.string().optional(),
                credits: z.number().min(1).optional(),
                bonus: z.number().min(0).optional(),
                priceBand: z.number().min(0).optional(),
                priceUSDC: z.number().min(0).optional(),
                isPopular: z.boolean().optional(),
                isActive: z.boolean().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...updateData } = input

            const package_ = await ctx.db.creditPackage.update({
                where: { id },
                data: updateData,
            })

            return {
                success: true,
                package: package_,
            }
        }),

    adminDeletePackage: adminProcedure
        .input(
            z.object({
                id: z.string(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            await ctx.db.creditPackage.delete({
                where: { id: input.id },
            })

            return {
                success: true,
            }
        }),

    adminGetUserBalances: adminProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(50),
                cursor: z.string().optional(),
                search: z.string().optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const users = await ctx.db.user.findMany({
                where: input.search
                    ? {
                        OR: [
                            { email: { contains: input.search, mode: "insensitive" } },
                            { name: { contains: input.search, mode: "insensitive" } },
                        ],
                    }
                    : undefined,
                take: input.limit + 1,
                cursor: input.cursor ? { id: input.cursor } : undefined,
                include: {
                    creditBalance: true,
                },
                orderBy: { joinedAt: "desc" },
            })

            let nextCursor: string | undefined = undefined
            if (users.length > input.limit) {
                const nextItem = users.pop()
                nextCursor = nextItem?.id
            }

            return {
                users,
                nextCursor,
            }
        }),

    adminGetSystemStats: adminProcedure.query(async ({ ctx }) => {
        const [totalUsers, totalCreditsInCirculation, totalTransactions, totalRevenueBand, totalRevenueUSDC] =
            await Promise.all([
                ctx.db.user.count(),
                ctx.db.creditBalance.aggregate({
                    _sum: { balance: true },
                }),
                ctx.db.creditTransaction.count(),
                ctx.db.creditTransaction.aggregate({
                    where: {
                        type: "PURCHASE",
                        paymentMethod: "asset",
                    },
                    _sum: { paymentAmount: true },
                }),
                ctx.db.creditTransaction.aggregate({
                    where: {
                        type: "PURCHASE",
                        paymentMethod: "usdc",
                    },
                    _sum: { paymentAmount: true },
                }),
            ])

        return {
            totalUsers,
            totalCreditsInCirculation: totalCreditsInCirculation._sum.balance ?? 0,
            totalTransactions,
            totalRevenueBand: totalRevenueBand._sum.paymentAmount ?? 0,
            totalRevenueUSDC: totalRevenueUSDC._sum.paymentAmount ?? 0,
        }
    }),
    generatePaymentXDR: protectedProcedure
        .input(
            z.object({
                packageId: z.string(),
                method: z.enum(["xlm", "asset", "usdc", "card"]),
                paymentAmount: z.number().positive(),
                signWith: SignUser,
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const pkg = await ctx.db.creditPackage.findUnique({
                where: { id: input.packageId },
            })

            if (!pkg) {
                throw new Error("Package not found")
            }
            const buyer = ctx.session.user.id; // customer pubkey
            switch (input.method) {

                case "asset": {
                    return await XDR4BuyCreditsWithAsset({
                        buyer,
                        totalPrice: input.paymentAmount.toString(7),
                        signWith: input.signWith,
                    });

                }
                case "usdc": {
                    const usdcRate = await getAssetToUSDCRate();

                    return await XDR4BuyCreditsWithUSDC({
                        buyer,
                        totalPrice: input.paymentAmount.toString(7),
                        signWith: input.signWith,
                        usdcRate: usdcRate,
                    });

                }
            }
        }),
})
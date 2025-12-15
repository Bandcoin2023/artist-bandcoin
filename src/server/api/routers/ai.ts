/* eslint-disable  */
import { z } from "zod"
import { env } from "~/env"
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc"
import { handleAgentChat } from "~/lib/agent"
import { MediaType } from "@prisma/client"

export const aiRouter = createTRPCRouter({
    createAiContent: protectedProcedure
        .input(
            z.object({
                prompt: z.string(),

                contentUrl: z.string(),
                contentType: z.enum([MediaType.IMAGE, MediaType.VIDEO]),
            })).mutation(async ({ ctx, input }) => {
                try {
                    const aiContent = await ctx.db.aiGeneratedContent.create({
                        data: {
                            creatorId: ctx.session.user.id,
                            prompt: input.prompt,
                            contentType: input.contentType,
                            contentUrl: input.contentUrl,
                        },
                    })
                    return { success: true, aiContent }
                } catch (error) {
                    console.error("AI Content Creation error:", error)
                }
            }),

    getAllAiContent: protectedProcedure
        .input(
            z.object({
                userId: z.string().optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            try {
                const aiContents = await ctx.db.aiGeneratedContent.findMany({
                    where: {
                        creatorId: input.userId || ctx.session.user.id,
                    },
                    orderBy: {
                        createdAt: "desc",
                    }

                })
                return { success: true, aiContents }
            } catch (error) {
                console.error("Error fetching AI content:", error)
            }
        }),

    deleteAiContent: protectedProcedure
        .input(z.object({ ids: z.array(z.number()) }))
        .mutation(async ({ ctx, input }) => {
            try {
                await ctx.db.aiGeneratedContent.deleteMany({
                    where: {
                        id: { in: input.ids },
                        creatorId: ctx.session.user.id,
                    },
                })
                return { success: true }
            } catch (error) {
                console.error("Error deleting AI content:", error)
            }
        })

})
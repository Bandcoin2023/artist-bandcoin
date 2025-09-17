import { addCustomDomain, deleteCustomDomain, } from "~/lib/custom-domain"
import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../../trpc"
import { type AmplifyError } from "~/lib/aws-error-types"

export const domainRouter = createTRPCRouter({
    add: protectedProcedure
        .input(
            z.object({
                domain: z.string(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { domain } = input

            try {
                // first check this user domain exist or not.
                const creatorDomain = await ctx.db.creatorCustomDomain.findFirst({
                    where: {
                        creatorId: ctx.session.user.id,
                    },
                })
                console.log(creatorDomain, ">>J")

                if (creatorDomain) {
                    throw new Error("Already exist a domain, First delete this prev entry")
                }

                // check the domain already added by another user
                const isDomainAlreadyExist = await ctx.db.creatorCustomDomain.findUnique({
                    where: {
                        domain: domain,
                    },
                })

                if (isDomainAlreadyExist) {
                    throw new Error("This domain is already requested by other one")
                }

                let awsResult
                try {
                    awsResult = await addCustomDomain(domain, [{ prefix: "", branch: "main" }])
                    console.log(`Domain ${domain} successfully added to AWS Amplify`)
                } catch (awsError: unknown) {
                    const typedError = awsError as AmplifyError
                    console.error(`AWS operation failed for domain ${domain}:`, typedError)

                    if (typedError.code === "RateLimitExceeded") {
                        throw new Error("AWS rate limit exceeded. Please wait a few minutes before trying again.")
                    }

                    const userMessage = typedError.message
                    throw new Error(userMessage)
                }

                const dbEntry = await ctx.db.creatorCustomDomain.create({
                    data: {
                        domain,
                        creatorId: ctx.session.user.id,
                    },
                })

                return awsResult
            } catch (error: unknown) {
                const typedError = error as Error
                console.error("Error in domain add mutation:", typedError)
                throw typedError
            }
        }),

    delete: protectedProcedure
        .input(
            z.object({
                dbOnly: z.boolean().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const domain = await ctx.db.creatorCustomDomain.findFirst({
                where: {
                    creatorId: ctx.session.user.id,
                },
            })

            if (domain) {
                if (input.dbOnly) {
                    await ctx.db.creatorCustomDomain.delete({
                        where: {
                            creatorId: ctx.session.user.id,
                        },
                    })
                    return
                }

                try {
                    const res = await deleteCustomDomain(domain.domain)
                    console.log(`Domain ${domain.domain} successfully deleted from AWS Amplify`)

                    await ctx.db.creatorCustomDomain.delete({
                        where: {
                            creatorId: ctx.session.user.id,
                        },
                    })

                    return res
                } catch (awsError: unknown) {
                    const typedError = awsError as AmplifyError
                    console.error(`AWS delete operation failed for domain ${domain.domain}:`, typedError)

                    // This prevents orphaned entries when AWS domain was already deleted
                    await ctx.db.creatorCustomDomain.delete({
                        where: {
                            creatorId: ctx.session.user.id,
                        },
                    })

                    const userMessage = typedError.message
                    throw new Error(userMessage)
                }
            }
        }),
})

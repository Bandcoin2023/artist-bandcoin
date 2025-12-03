"use client"

import type { DomainAssociation } from "@aws-sdk/client-amplify"
import { AlertCircle, Check, ChevronDown, Cog, Loader2, Trash2, Copy } from "lucide-react"
import type { GetServerSidePropsContext } from "next"
import React, { useState, useEffect } from "react"
import { getDomainAssociation } from "~/lib/custom-domain"
import { getServerAuthSession } from "~/server/auth"
import { db } from "~/server/db"
import { api } from "~/utils/api"
import { Button } from "~/components/shadcn/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/shadcn/ui/card"
import { Input } from "~/components/shadcn/ui/input"
import { Badge } from "~/components/shadcn/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "~/components/shadcn/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/shadcn/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "~/components/shadcn/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/shadcn/ui/tabs"
import { cn } from "~/lib/utils"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import toast from "react-hot-toast"
import type { Creator, VanitySubscription } from "@prisma/client"
import { format, formatDistanceToNow } from "date-fns"
import { env } from "~/env"
import { PLATFORM_ASSET } from "~/lib/stellar/constant"
import useNeedSign from "~/lib/hook"
import { clientsign } from "package/connect_wallet"
import { clientSelect } from "~/lib/stellar/fan/utils"
import { useSession } from "next-auth/react"
export type CreatorWithSubscription = Creator & {
    vanitySubscription: VanitySubscription | null;
};

const VanityURLSchema = z.object({
    vanityURL: z.string().min(2).max(30),
})

type VanityURLFormData = z.infer<typeof VanityURLSchema>



export default function VanityURLManager({ creator }: { creator: CreatorWithSubscription }) {
    const [subscriptionStatus, setSubscriptionStatus] = useState<"active" | "expired" | "none">("none")
    const changingCost = PLATFORM_ASSET.code.toLocaleLowerCase() === "wadzzo" ? 500 : 750
    const settingCost = PLATFORM_ASSET.code.toLocaleLowerCase() === "wadzzo" ? 200 : 300
    const session = useSession()
    const [loading, setLoading] = useState(false)
    const { needSign } = useNeedSign()
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null)

    const CreateOrUpdateVanityURL = api.fan.creator.createOrUpdateVanityURL.useMutation({
        onSuccess: (data, variables) => {
            if (variables.isChanging) {
                toast.success("Vanity URL changed successfully")
            } else {
                toast.success("Vanity URL set successfully")
            }
        },
        onError: (error) => {
            toast.error(`Error: ${error.message}`)
        },
    })

    const mutation = api.fan.creator.updateVanityURL.useMutation({
        onSuccess: async (data, variables) => {
            if (data) {
                try {
                    setLoading(true)
                    const clientResponse = await clientsign({
                        presignedxdr: data,
                        walletType: session.data?.user?.walletType,
                        pubkey: session.data?.user?.id,
                        test: clientSelect(),
                    })
                    if (clientResponse) {
                        setLoading(true)
                        CreateOrUpdateVanityURL.mutate({
                            amount: variables.cost,
                            isChanging: variables.isChanging,
                            vanityURL: variables.vanityURL,
                        })
                        setLoading(false)
                        reset()
                    } else {
                        setLoading(false)
                        reset()
                        toast.error("Error in signing transaction")
                    }
                } catch (error) {
                    setLoading(false)
                    console.error("", error)
                    reset()
                }
            }
        },
        onError: (error) => {
            toast.error(`Error: ${error.message}`)
        },
    })

    const { data: updatedCreator, refetch: refetchCreator } = api.fan.creator.meCreator.useQuery(undefined, {
        refetchInterval: false,
    })

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        watch,
        setValue,
    } = useForm<VanityURLFormData>({
        resolver: zodResolver(VanityURLSchema),
        defaultValues: {
            vanityURL: updatedCreator?.vanityURL ?? "",
        },
    })

    const checkAvailability = api.fan.creator.checkVanityURLAvailability.useMutation({
        onSuccess: (data) => {
            const current = watch("vanityURL")
            // If the vanity belongs to the current user, consider it available (useful for renew flow)
            if (!data.isAvailable && current && updatedCreator?.vanityURL && current === updatedCreator.vanityURL) {
                setIsAvailable(true)
                return
            }
            setIsAvailable(data.isAvailable)
        },
    })

    useEffect(() => {
        const subscription = watch((value, { name }) => {
            if (name === "vanityURL" && value.vanityURL && value.vanityURL !== updatedCreator?.vanityURL) {
                checkAvailability.mutate({ vanityURL: value.vanityURL })
            }
        })
        return () => subscription.unsubscribe()
    }, [watch, checkAvailability, updatedCreator?.vanityURL])

    useEffect(() => {
        if (creator?.vanitySubscription) {
            setSubscriptionStatus(creator.vanitySubscription.endDate >= new Date() ? "active" : "expired")
        } else {
            setSubscriptionStatus("none")
        }
        reset({ vanityURL: updatedCreator?.vanityURL ?? "" })
    }, [updatedCreator, reset, creator?.vanitySubscription])

    const onSubmit = (data: VanityURLFormData) => {
        if (data.vanityURL === updatedCreator?.vanityURL && subscriptionStatus === "active") {
            toast.error("No changes detected")
            return
        }
        if (data.vanityURL === "") {
            toast.error("Vanity URL cannot be empty")
            return
        }
        // Allow renewing the same vanity even if availability check returns false
        if (!isAvailable && data.vanityURL !== updatedCreator?.vanityURL) {
            toast.error("This vanity URL is not available")
            return
        }

        mutation.mutate({
            vanityURL:
                subscriptionStatus === "active" || subscriptionStatus === "none" ? data.vanityURL : updatedCreator?.vanityURL,
            cost: subscriptionStatus === "active" ? changingCost : settingCost,
            isChanging: subscriptionStatus === "active" ? true : false,
            signWith: needSign(),
        })
    }

    const copyToClipboard = () => {
        const vanityURL = `${env.NEXT_PUBLIC_ASSET_CODE.toLocaleLowerCase() === "wadzzo" ? "https://app.wadzzo.com" : "https://bandcoin.io"}/${watch("vanityURL")}`
        navigator.clipboard
            .writeText(vanityURL)
            .then(() => {
                toast.success("Vanity URL copied to clipboard")
            })
            .catch((err) => {
                console.error("Failed to copy: ", err)
                toast.error("Failed to copy Vanity URL")
            })
    }

    return (
        <div className="space-y-6 w-full">
            <div>
                <h3 className="text-lg font-semibold mb-1">Vanity URL Settings</h3>
                <p className="text-sm text-muted-foreground">Create a custom URL for your profile</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full">
                <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center justify-between">
                        <span>Your Vanity URL</span>
                        <button
                            type="button"
                            onClick={copyToClipboard}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-muted transition-colors"
                            aria-label="Copy Vanity URL"
                        >
                            <Copy className="h-3 w-3" />
                            Copy
                        </button>
                    </label>

                    <div className="flex items-center space-x-2 w-full">
                        <span className="text-sm text-muted-foreground font-mono">
                            {env.NEXT_PUBLIC_ASSET_CODE.toLocaleLowerCase() === "wadzzo" ? "app.wadzzo.com" : "bandcoin.io"}/
                        </span>
                        <div className="flex-1 flex flex-col relative">
                            <input
                                disabled={subscriptionStatus === "expired"}
                                type="text"
                                {...register("vanityURL")}
                                onInput={(e) => {
                                    const target = e.target as HTMLInputElement
                                    const lower = target.value.toLowerCase()
                                    if (target.value !== lower) {
                                        // update the visible input value
                                        target.value = lower
                                        // update react-hook-form state and trigger validation/dirty
                                        setValue("vanityURL", lower, { shouldValidate: true, shouldDirty: true })
                                    }
                                }}
                                className={`input input-bordered w-full text-sm ${isAvailable === true ? "border-green-500" : isAvailable === false ? "border-red-500" : ""
                                    }`}
                                placeholder="your-custom-url"
                            />
                            {isAvailable !== null && (
                                <span className={`text-xs mt-1 ${isAvailable ? "text-green-600" : "text-red-600"}`}>
                                    {isAvailable ? "✓ Available" : "✗ Not Available"}
                                </span>
                            )}
                        </div>
                    </div>

                    {errors.vanityURL && <p className="text-xs text-destructive">{errors.vanityURL.message}</p>}
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4">
                    {subscriptionStatus === "none" && (
                        <Button disabled={loading || mutation.isLoading} type="submit" className="col-span-3">
                            Set Vanity URL
                        </Button>
                    )}
                    {subscriptionStatus === "active" && (
                        <Button
                            type="submit"
                            disabled={loading || mutation.isLoading || updatedCreator?.vanityURL === ""}
                            className="col-span-3"
                        >
                            Change Vanity URL
                        </Button>
                    )}
                    {subscriptionStatus === "expired" && (
                        <Button
                            disabled={loading || mutation.isLoading || updatedCreator?.vanityURL === ""}
                            type="submit"
                            className="col-span-3"
                        >
                            Renew Vanity URL
                        </Button>
                    )}
                </div>
            </form>

            {/* Pricing and Status Info */}
            <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Pricing</h4>
                    <p className="text-sm font-medium">
                        {subscriptionStatus === "active"
                            ? `${PLATFORM_ASSET.code.toLocaleLowerCase() === "wadzzo" ? "500 Wadzzo" : "750 Bandcoin"} to change`
                            : `${PLATFORM_ASSET.code.toLocaleLowerCase() === "wadzzo" ? "200 Wadzzo" : "300 Bandcoin"}/month`}
                    </p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Status</h4>
                    <Badge
                        variant={
                            subscriptionStatus === "active"
                                ? "default"
                                : subscriptionStatus === "expired"
                                    ? "destructive"
                                    : "secondary"
                        }
                    >
                        {subscriptionStatus === "active"
                            ? "Active"
                            : subscriptionStatus === "expired"
                                ? "Expired"
                                : "No Subscription"}
                    </Badge>
                </div>
            </div>

            {subscriptionStatus !== "none" && creator.vanitySubscription && (
                <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                    <h4 className="font-semibold text-sm">Subscription Details</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                            <p className="font-mono text-xs">
                                {format(new Date(creator.vanitySubscription.startDate), "MMM dd, yyyy")}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">End Date</p>
                            <p className="font-mono text-xs">
                                {format(new Date(creator.vanitySubscription.endDate), "MMM dd, yyyy")}
                            </p>
                        </div>
                        {subscriptionStatus === "active" && (
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Time Remaining</p>
                                <p className="font-mono text-xs">{formatDistanceToNow(new Date(creator.vanitySubscription.endDate))}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Last Payment</p>
                            <p className="font-mono text-xs">
                                {creator.vanitySubscription.lastPaymentAmount} {PLATFORM_ASSET.code}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

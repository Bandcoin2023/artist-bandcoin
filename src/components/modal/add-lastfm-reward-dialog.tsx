"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "~/components/shadcn/ui/dialog"
import { Button } from "~/components/shadcn/ui/button"
import { Input } from "~/components/shadcn/ui/input"
import { Label } from "~/components/shadcn/ui/label"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "~/components/shadcn/ui/select"
import { Loader2, Gift, CheckCircle, AlertTriangle, Wallet } from "lucide-react"
import Image from "next/image"
import { api } from "~/utils/api"
import { useAddRewardModalStore } from "~/components/store/add-spotify-reward-modal-store"
import { toast } from "sonner"
import { Alert, AlertDescription } from "~/components/shadcn/ui/alert"
import { useCreatorStorageAcc, useUserStellarAcc } from "~/lib/state/wallete/stellar-balances"
import { PLATFORM_ASSET } from "~/lib/stellar/constant"
import { clientsign } from "package/connect_wallet"
import useNeedSign from "~/lib/hook"
import { useSession } from "next-auth/react"
import { clientSelect } from "~/lib/stellar/fan/utils"
import { useAddLastFMRewardModalStore } from "../store/add-lastfm-reward-modal-store"

const formSchema = z
    .object({
        lastFmUrl: z.string().url("Invalid Last.fm URL").optional(),
        spotifyUrl: z.union([z.string().url(), z.literal("")]).optional(),
        youtubeUrl: z.union([z.string().url(), z.literal("")]).optional(),
        rewardIntervalDays: z.coerce.number().int().positive().min(1, "Interval must be at least 1 day"),
        rewardAmount: z.coerce.number().positive().min(0.01, "Amount must be positive"),
        maximumRewardAmount: z.coerce.number().positive().min(0.01, "Maximum reward amount must be positive"),
        rewardCurrency: z.string({
            required_error: "Currency is required",
        }),
    })
    .refine((data) => data.maximumRewardAmount >= data.rewardAmount, {
        message: "Maximum reward amount must be greater than or equal to reward amount",
        path: ["maximumRewardAmount"],
    })

type AddRewardFormValues = z.infer<typeof formSchema>

export const AddLastFMRewardDialog: React.FC = () => {
    const { isOpen, trackData, setIsOpen } = useAddLastFMRewardModalStore()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const session = useSession()
    const { data: existingReward, isLoading: isLoadingExistingReward } =
        api.lastfm.getRewardedTrackStatus.useQuery(
            { lastFMTrackURL: trackData?.url ?? "" },
            { enabled: !!trackData?.url && isOpen },
        )

    const { getAssetBalance } = useUserStellarAcc()
    const { getAssetBalance: getPageAssetBalance } = useCreatorStorageAcc()
    const { data: pageAssetbal } = api.fan.creator.getCreatorPageAssetBalance.useQuery(undefined, {
        enabled: isOpen && !!session.data?.user?.id,
    })

    const sendRewardAssetToStorage = api.lastfm.sendRewardsToStorage.useMutation({
        onSuccess: async (data) => {
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
                        if (!trackData) {
                            toast.error("Track data is not available")
                            setIsSubmitting(false)
                            return
                        }
                        addRewardMutation.mutate({
                            lastFMTrackURL: trackData.url,
                            trackName: trackData.name,
                            artistName: trackData.artist.name ?? "Unknown Artist",
                            rewardIntervalDays: Number(form.watch("rewardIntervalDays")),
                            rewardAmount: Number(form.watch("rewardAmount")),
                            maximumRewardAmount: Number(form.watch("maximumRewardAmount")),
                            rewardCurrency: form.watch("rewardCurrency"),
                            spotifyUrl: form.watch("spotifyUrl"),
                            youtubeUrl: form.watch("youtubeUrl"),
                            trackImageUrl: trackData.image[trackData.image.length - 1]?.["#text"] ?? "https://bandfan.io/images/logo.png",
                        })
                        setIsSubmitting(false)
                    } else {
                        setIsSubmitting(false)

                        toast.error("Error in signing transaction")

                    }
                    setIsOpen(false)
                } catch (error) {
                    setIsSubmitting(false)
                    console.error("Error sending balance to bounty mother", error)

                }
            }
        },
        onError: (error) => {
            setIsSubmitting(false)
            toast.error("Failed to send reward asset", {
                description: error.message,
            })
        },
    })

    const addRewardMutation = api.lastfm.addRewardedTrack.useMutation({
        onMutate: () => setIsSubmitting(true),
        onSuccess: () => {
            toast.success("Track added to rewards!", {
                description: `"${trackData?.name}" will now reward your fans.`,
            })
            setIsOpen(false)
        },
        onError: (error) => {
            if (error.data?.code === "CONFLICT") {
                toast.warning("Already Added", {
                    description: `"${trackData?.name}" is already in your reward list.`,
                })
            } else {
                toast.error("Failed to add reward", {
                    description: error.message,
                })
            }
        },
        onSettled: () => setIsSubmitting(false),
    })




    const updateRewardMutation = api.spotify.spotifyReward.updateRewardedTrack.useMutation({
        onMutate: () => setIsSubmitting(true),
        onSuccess: () => {
            toast.success("Reward updated successfully!", {
                description: `"${trackData?.name}" reward settings have been updated.`,
            })
            setIsOpen(false)
        },
        onError: (error) => {
            toast.error("Failed to update reward", {
                description: error.message,
            })
        },
        onSettled: () => setIsSubmitting(false),
    })

    const form = useForm<AddRewardFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            lastFmUrl: trackData?.url ?? "",
            spotifyUrl: "",
            youtubeUrl: "",
            rewardIntervalDays: 7,
            rewardAmount: 1,
            maximumRewardAmount: 100,
            rewardCurrency: `${PLATFORM_ASSET.code}-${PLATFORM_ASSET.issuer}`,
        },
    })

    useEffect(() => {
        if (isOpen && existingReward) {
            form.reset({
                lastFmUrl: trackData?.url ?? "",
                spotifyUrl: "",
                youtubeUrl: "",
                rewardIntervalDays: existingReward.rewardIntervalDays,
                rewardAmount: existingReward.rewardAmount,
                maximumRewardAmount: existingReward.maximumRewardAmount,
                rewardCurrency: existingReward.assetId + "-" + existingReward.assetIssuer,
            })
        } else if (isOpen && !existingReward) {
            form.reset({
                lastFmUrl: trackData?.url ?? "",
                spotifyUrl: "",
                youtubeUrl: "",
                rewardIntervalDays: 7,
                rewardAmount: 1,
                maximumRewardAmount: 100,
                rewardCurrency: `${PLATFORM_ASSET.code}-${PLATFORM_ASSET.issuer}`,
            })
        }
    }, [isOpen, existingReward, trackData?.url, form])

    // Get selected asset balance
    const selectedCurrency = form.watch("rewardCurrency")
    const maximumRewardAmountRaw = form.watch("maximumRewardAmount")
    const rewardAmountRaw = form.watch("rewardAmount")
    const rewardIntervalDays = form.watch("rewardIntervalDays")

    // Ensure values are numbers
    const maximumRewardAmount = Number(maximumRewardAmountRaw) || 0
    const rewardAmount = Number(rewardAmountRaw) || 0

    const selectedAssetBalance = useMemo(() => {
        if (!selectedCurrency) return 0

        const [assetCode, assetIssuer] = selectedCurrency.split("-")
        if (assetCode === PLATFORM_ASSET.code && assetIssuer === PLATFORM_ASSET.issuer) {
            return Number(getAssetBalance({ code: PLATFORM_ASSET.code, issuer: PLATFORM_ASSET.issuer }) ?? 0)
        }

        if (pageAssetbal && assetCode === pageAssetbal.assetCode && assetIssuer === pageAssetbal.assetIssuer) {
            return Number(getPageAssetBalance({ code: pageAssetbal.assetCode, issuer: pageAssetbal.assetIssuer }) ?? 0)
        }

        return 0
    }, [selectedCurrency, getAssetBalance, getPageAssetBalance, pageAssetbal])

    // Check if balance is insufficient
    const isBalanceInsufficient = maximumRewardAmount > 0 && selectedAssetBalance < maximumRewardAmount
    const balanceError = isBalanceInsufficient
        ? `Insufficient balance. You have ${selectedAssetBalance.toFixed(2)} but need ${maximumRewardAmount.toFixed(2)}`
        : null

    const onSubmit = (values: AddRewardFormValues) => {
        if (!trackData) return

        // Additional validation for balance
        const maxRewardNum = Number(values.maximumRewardAmount)
        if (selectedAssetBalance < maxRewardNum) {
            toast.error("Insufficient Balance", {
                description: `You need at least ${maxRewardNum.toFixed(2)} ${selectedCurrency.split("-")[0]} to create this reward.`,
            })
            return
        }

        if (existingReward) {
            // Update existing reward
            updateRewardMutation.mutate({
                id: existingReward.id,
                ...values,
            })
        } else {

            const [assetCode, assetIssuer] = values.rewardCurrency.split("-")
            if (assetCode === PLATFORM_ASSET.code && assetIssuer === PLATFORM_ASSET.issuer) {
                sendRewardAssetToStorage.mutate({
                    rewardCurrency: values.rewardCurrency,
                    maximumRewardAmount: values.maximumRewardAmount,
                })
            }
            else {
                addRewardMutation.mutate({
                    lastFMTrackURL: trackData.url,
                    trackName: trackData.name,
                    artistName: trackData.artist.name ?? "Unknown Artist",
                    trackImageUrl: trackData.image[trackData.image.length - 1]?.["#text"] ?? "https://bandfan.io/images/logo.png",
                    ...values,
                })

            }


        }
    }

    const handleClose = () => {
        setIsOpen(false)
        form.reset()
    }

    const isAlreadyAdded = !!existingReward && !isLoadingExistingReward

    // Calculate potential claims
    const potentialClaims = maximumRewardAmount && rewardAmount ? Math.floor(maximumRewardAmount / rewardAmount) : 0
    const remainingAmount = existingReward
        ? existingReward.maximumRewardAmount - existingReward.alreadyGivenAmount
        : maximumRewardAmount
    const remainingClaims = existingReward && rewardAmount ? Math.floor(remainingAmount / rewardAmount) : potentialClaims

    // Safe currency display
    const currencyCode = selectedCurrency ? selectedCurrency.split("-")[0] : ""

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-purple-500" />
                        {isAlreadyAdded ? "Update Track Reward" : "Add Track to Rewards"}
                    </DialogTitle>
                </DialogHeader>
                {isLoadingExistingReward ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                        <p className="mt-2 text-muted-foreground">Checking reward status...</p>
                    </div>
                ) : (
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {trackData && (
                            <div className="flex items-center space-x-4 p-3 bg-muted/50 rounded-md">
                                <Image
                                    src={trackData.image[trackData.image.length - 1]?.["#text"] ?? "/images/logo.png"}
                                    alt={trackData.name}
                                    width={60}
                                    height={60}
                                    className="rounded-md"
                                    onError={(e) =>
                                        e.currentTarget.src = "/images/logo.png"

                                    }
                                />
                                <div className="flex-1">
                                    <p className="font-semibold">{trackData.name}</p>
                                    <p className="text-sm text-muted-foreground">{trackData.artist.name}</p>
                                </div>
                                {isAlreadyAdded && (
                                    <div className="text-right">
                                        <div className="flex items-center space-x-1 text-green-600">
                                            <CheckCircle className="h-4 w-4" />
                                            <span className="text-sm font-medium">Active</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Given: {existingReward.alreadyGivenAmount} / {existingReward.maximumRewardAmount}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Song URLs Section */}
                        <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-muted/50">
                            <h4 className="font-semibold text-sm">Song Links</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="lastFmUrl" className="text-xs font-medium">Last.fm</Label>
                                    <Input
                                        id="lastFmUrl"
                                        type="text"
                                        placeholder="Auto-filled"
                                        {...form.register("lastFmUrl")}
                                        disabled={true}
                                        className="bg-muted text-xs h-9"
                                    />
                                    <p className="text-xs text-muted-foreground">Auto-filled (read-only)</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="spotifyUrl" className="text-xs font-medium">Spotify <span className="text-muted-foreground">(Optional)</span></Label>
                                    <Input
                                        id="spotifyUrl"
                                        type="text"
                                        placeholder="spotify.com/track"
                                        {...form.register("spotifyUrl")}
                                        disabled={isSubmitting}
                                        className="text-xs h-9"
                                    />
                                    {form.formState.errors.spotifyUrl && (
                                        <p className="text-xs text-destructive">{form.formState.errors.spotifyUrl.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="youtubeUrl" className="text-xs font-medium">YouTube <span className="text-muted-foreground">(Optional)</span></Label>
                                    <Input
                                        id="youtubeUrl"
                                        type="text"
                                        placeholder="youtube.com/watch"
                                        {...form.register("youtubeUrl")}
                                        disabled={isSubmitting}
                                        className="text-xs h-9"
                                    />
                                    {form.formState.errors.youtubeUrl && (
                                        <p className="text-xs text-destructive">{form.formState.errors.youtubeUrl.message}</p>
                                    )}
                                </div>
                            </div>
                        </div>


                        {/* Maximum Limit Alert */}
                        {existingReward && existingReward.alreadyGivenAmount >= existingReward.maximumRewardAmount && (
                            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <AlertDescription className="text-amber-800 dark:text-amber-200">
                                    This reward has reached its maximum limit. Users can no longer claim rewards for this track.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Balance Insufficient Error */}
                        {isBalanceInsufficient && (
                            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                                <Wallet className="h-4 w-4 text-red-600" />
                                <AlertDescription className="text-red-800 dark:text-red-200">
                                    <div className="space-y-1">
                                        <p className="font-medium">Insufficient Balance</p>
                                        <p className="text-sm">
                                            You have {selectedAssetBalance.toFixed(2)} {currencyCode} but need{" "}
                                            {maximumRewardAmount.toFixed(2)} {currencyCode} for this reward.
                                        </p>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Reward Settings Section */}
                        <div className="space-y-4 p-4 bg-muted/20 rounded-lg border border-muted/50">
                            <h4 className="font-semibold text-sm">Reward Settings</h4>

                            <div className="space-y-2">
                                <Label htmlFor="rewardCurrency">Currency</Label>
                                <Select
                                    onValueChange={(value) => {
                                        form.setValue("rewardCurrency", value, { shouldValidate: true })
                                    }}
                                    value={form.watch("rewardCurrency")}
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger className="focus-visible:ring-0 focus-visible:ring-offset-0 h-9">
                                        <SelectValue placeholder="Select Asset" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Choose Asset</SelectLabel>
                                            <SelectItem value={`${PLATFORM_ASSET.code}-${PLATFORM_ASSET.issuer}`}>
                                                <div className="flex items-center gap-2">
                                                    <Image
                                                        src="/images/logo.png"
                                                        alt="Bandcoin"
                                                        width={16}
                                                        height={16}
                                                        className="rounded-full"
                                                    />
                                                    <span>Bandcoin</span>
                                                </div>
                                            </SelectItem>
                                            {pageAssetbal && (
                                                <SelectItem value={`${pageAssetbal.assetCode}-${pageAssetbal.assetIssuer}`}>
                                                    <span>{pageAssetbal.assetCode || "Page Asset"}</span>
                                                </SelectItem>
                                            )}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                {form.formState.errors.rewardCurrency && (
                                    <p className="text-xs text-destructive">{form.formState.errors.rewardCurrency.message}</p>
                                )}
                                {selectedCurrency && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                                        <Wallet className="h-3 w-3" />
                                        <span>Balance: {selectedAssetBalance.toFixed(2)} {currencyCode}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="rewardAmount" className="text-xs font-medium">Reward Amount</Label>
                                    <Input
                                        id="rewardAmount"
                                        type="number"
                                        step="0.01"
                                        {...form.register("rewardAmount")}
                                        disabled={isSubmitting}
                                        className="h-9"
                                    />
                                    {form.formState.errors.rewardAmount && (
                                        <p className="text-xs text-destructive">{form.formState.errors.rewardAmount.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="rewardIntervalDays" className="text-xs font-medium">Interval (Days)</Label>
                                    <Input
                                        id="rewardIntervalDays"
                                        type="number"
                                        {...form.register("rewardIntervalDays")}
                                        disabled={isSubmitting}
                                        className="h-9"
                                    />
                                    {form.formState.errors.rewardIntervalDays && (
                                        <p className="text-xs text-destructive">{form.formState.errors.rewardIntervalDays.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="maximumRewardAmount" className="text-xs font-medium">Maximum Total Reward</Label>
                                <Input
                                    id="maximumRewardAmount"
                                    type="number"
                                    step="0.01"
                                    {...form.register("maximumRewardAmount")}
                                    disabled={isSubmitting}
                                    className={`h-9 ${isBalanceInsufficient ? "border-red-300 focus:border-red-500" : ""}`}
                                />
                                {form.formState.errors.maximumRewardAmount && (
                                    <p className="text-xs text-destructive">{form.formState.errors.maximumRewardAmount.message}</p>
                                )}
                                {balanceError && <p className="text-xs text-destructive">{balanceError}</p>}
                                <p className="text-xs text-muted-foreground">
                                    Total amount distributable across all users
                                </p>
                            </div>
                        </div>

                        {/* Reward Summary */}
                        <div className="p-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-200/30 dark:border-purple-800/30">
                            <h4 className="font-semibold text-sm mb-3">Reward Summary</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Per Claim</p>
                                    <p className="font-semibold text-base">
                                        {rewardAmount.toFixed(2)} <span className="text-xs">{currencyCode}</span>
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Max Claims</p>
                                    <p className="font-semibold text-base">{potentialClaims}x</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Your Balance</p>
                                    <p className={`font-semibold text-base ${isBalanceInsufficient ? "text-red-600" : "text-green-600"}`}>
                                        {selectedAssetBalance.toFixed(2)} <span className="text-xs">{currencyCode}</span>
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Status</p>
                                    <p className={`font-semibold text-xs ${isBalanceInsufficient ? "text-red-600" : "text-green-600"}`}>
                                        {isBalanceInsufficient ? "⚠ Insufficient" : "✓ Sufficient"}
                                    </p>
                                </div>
                                {existingReward && (
                                    <>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">Remaining</p>
                                            <p className="font-semibold text-base">
                                                {remainingAmount.toFixed(2)} <span className="text-xs">{existingReward.assetId}</span>
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">Claims Left</p>
                                            <p className="font-semibold text-base">{remainingClaims}x</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleClose} type="button" disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || isBalanceInsufficient}
                                className={isBalanceInsufficient ? "opacity-50 cursor-not-allowed" : ""}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        {isAlreadyAdded ? "Updating..." : "Adding..."}
                                    </>
                                ) : (
                                    <>
                                        <Gift className="h-4 w-4 mr-2" />
                                        {isAlreadyAdded ? "Update Reward" : "Add to Rewards"}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}

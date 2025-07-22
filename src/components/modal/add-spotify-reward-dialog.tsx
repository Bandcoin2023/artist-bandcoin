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
import { set } from "date-fns"

interface CreditBalanceType {
    asset_code: string
    assetBalance: number
    asset_type: "credit_alphanum4" | "credit_alphanum12"
    asset_issuer: string
}

interface NativeBalanceType {
    asset_code: string
    assetBalance: number
    asset_type: "native"
    asset_issuer: string
}

type BalanceType = CreditBalanceType | NativeBalanceType

const formSchema = z
    .object({
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

export const AddSpotifyRewardDialog: React.FC = () => {
    const { isOpen, trackData, setIsOpen } = useAddRewardModalStore()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const session = useSession()
    const { data: existingReward, isLoading: isLoadingExistingReward } =
        api.spotify.spotifyReward.getRewardedTrackStatus.useQuery(
            { spotifyTrackId: trackData?.id ?? "" },
            { enabled: !!trackData?.id && isOpen },
        )

    const { getAssetBalance } = useUserStellarAcc()
    const { getAssetBalance: getPageAssetBalance } = useCreatorStorageAcc()
    const { data: pageAssetbal } = api.fan.creator.getCreatorPageAssetBalance.useQuery()

    const sendRewardAssetToStorage = api.spotify.spotifyReward.sendRewardsToStorage.useMutation({
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
                            spotifyTrackId: trackData.id,
                            trackName: trackData.name,
                            artistName: trackData.artists?.[0]?.name ?? "Unknown Artist",
                            albumName: trackData.album?.name ?? null,
                            albumCoverUrl: trackData.album?.images?.[0]?.url ?? null,
                            rewardIntervalDays: form.watch("rewardIntervalDays"),
                            rewardAmount: form.watch("rewardAmount"),
                            maximumRewardAmount: form.watch("maximumRewardAmount"),
                            rewardCurrency: form.watch("rewardCurrency"),
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

    const addRewardMutation = api.spotify.spotifyReward.addRewardedTrack.useMutation({
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
            rewardIntervalDays: 7,
            rewardAmount: 1,
            maximumRewardAmount: 100,
            rewardCurrency: `${PLATFORM_ASSET.code}-${PLATFORM_ASSET.issuer}`,
        },
    })

    useEffect(() => {
        if (isOpen && existingReward) {
            form.reset({
                rewardIntervalDays: existingReward.rewardIntervalDays,
                rewardAmount: existingReward.rewardAmount,
                maximumRewardAmount: existingReward.maximumRewardAmount,
                rewardCurrency: existingReward.assetId + "-" + existingReward.assetIssuer,
            })
        } else if (isOpen && !existingReward) {
            form.reset() // Reset to default values for new reward
        }
    }, [isOpen, existingReward, form])

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
                    spotifyTrackId: trackData.id,
                    trackName: trackData.name,
                    artistName: trackData.artists?.[0]?.name ?? "Unknown Artist",
                    albumName: trackData.album?.name ?? null,
                    albumCoverUrl: trackData.album?.images?.[0]?.url ?? null,
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
            <DialogContent className="sm:max-w-[500px]">
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
                                    src={trackData.album?.images?.[0]?.url ?? "/placeholder.svg?height=60&width=60"}
                                    alt={trackData.name}
                                    width={60}
                                    height={60}
                                    className="rounded-md"
                                />
                                <div className="flex-1">
                                    <p className="font-semibold">{trackData.name}</p>
                                    <p className="text-sm text-muted-foreground">{trackData.artists?.[0]?.name}</p>
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

                        <div className="space-y-2">
                            <Label htmlFor="rewardCurrency">Currency</Label>
                            <Select
                                onValueChange={(value) => {
                                    form.setValue("rewardCurrency", value, { shouldValidate: true })
                                }}
                                value={form.watch("rewardCurrency")}
                                disabled={isSubmitting}
                            >
                                <SelectTrigger className="focus-visible:ring-0 focus-visible:ring-offset-0">
                                    <SelectValue placeholder="Select Asset" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Choose Asset</SelectLabel>
                                        <SelectItem value={`${PLATFORM_ASSET.code}-${PLATFORM_ASSET.issuer}`}>
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-2">
                                                    <Image
                                                        src="/images/logo.png"
                                                        alt="Bandcoin"
                                                        width={20}
                                                        height={20}
                                                        className="rounded-full"
                                                    />
                                                    <span>Bandcoin</span>
                                                </div>
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    Balance:{" "}
                                                    {Number(
                                                        getAssetBalance({ code: PLATFORM_ASSET.code, issuer: PLATFORM_ASSET.issuer }) ?? "0",
                                                    ).toFixed(2)}
                                                </span>
                                            </div>
                                        </SelectItem>
                                        {pageAssetbal && (
                                            <SelectItem value={`${pageAssetbal.assetCode}-${pageAssetbal.assetIssuer}`}>
                                                <div className="flex items-center justify-between w-full">
                                                    <span>{pageAssetbal.assetCode || "Page Asset"}</span>
                                                    <span className="text-xs text-muted-foreground ml-2">
                                                        Balance:{" "}
                                                        {Number(
                                                            getPageAssetBalance({ code: pageAssetbal.assetCode, issuer: pageAssetbal.assetIssuer }) ??
                                                            "0",
                                                        ).toFixed(2)}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        )}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            {form.formState.errors.rewardCurrency && (
                                <p className="text-sm text-destructive">{form.formState.errors.rewardCurrency.message}</p>
                            )}
                            {/* Show selected asset balance */}
                            {selectedCurrency && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Wallet className="h-4 w-4" />
                                    <span>
                                        Available Balance: {selectedAssetBalance.toFixed(2)} {currencyCode}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="rewardAmount">Reward Amount</Label>
                                <Input
                                    id="rewardAmount"
                                    type="number"
                                    step="0.01"
                                    {...form.register("rewardAmount")}
                                    disabled={isSubmitting}
                                />
                                {form.formState.errors.rewardAmount && (
                                    <p className="text-sm text-destructive">{form.formState.errors.rewardAmount.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="rewardIntervalDays">Interval (Days)</Label>
                                <Input
                                    id="rewardIntervalDays"
                                    type="number"
                                    {...form.register("rewardIntervalDays")}
                                    disabled={isSubmitting}
                                />
                                {form.formState.errors.rewardIntervalDays && (
                                    <p className="text-sm text-destructive">{form.formState.errors.rewardIntervalDays.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="maximumRewardAmount">Maximum Total Reward</Label>
                            <Input
                                id="maximumRewardAmount"
                                type="number"
                                step="0.01"
                                {...form.register("maximumRewardAmount")}
                                disabled={isSubmitting}
                                className={isBalanceInsufficient ? "border-red-300 focus:border-red-500" : ""}
                            />
                            {form.formState.errors.maximumRewardAmount && (
                                <p className="text-sm text-destructive">{form.formState.errors.maximumRewardAmount.message}</p>
                            )}
                            {balanceError && <p className="text-sm text-destructive">{balanceError}</p>}
                            <p className="text-xs text-muted-foreground">
                                Total amount that can be distributed for this track across all users
                            </p>
                        </div>

                        {/* Reward Summary */}
                        <div className="p-3 bg-muted/30 rounded-md space-y-2">
                            <h4 className="font-medium text-sm">Reward Summary</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Per Claim</p>
                                    <p className="font-medium">
                                        {rewardAmount.toFixed(2)} {currencyCode}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Max Claims</p>
                                    <p className="font-medium">{potentialClaims} times</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Your Balance</p>
                                    <p className={`font-medium ${isBalanceInsufficient ? "text-red-600" : "text-green-600"}`}>
                                        {selectedAssetBalance.toFixed(2)} {currencyCode}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Status</p>
                                    <p className={`font-medium text-xs ${isBalanceInsufficient ? "text-red-600" : "text-green-600"}`}>
                                        {isBalanceInsufficient ? "Insufficient" : "Sufficient"}
                                    </p>
                                </div>
                                {existingReward && (
                                    <>
                                        <div>
                                            <p className="text-muted-foreground">Remaining</p>
                                            <p className="font-medium">
                                                {remainingAmount.toFixed(2)} {existingReward.assetId}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Claims Left</p>
                                            <p className="font-medium">{remainingClaims} times</p>
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

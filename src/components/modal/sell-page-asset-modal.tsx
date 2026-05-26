import { zodResolver } from "@hookform/resolvers/zod";
import { MediaType } from "@prisma/client";
import clsx from "clsx";
import { DollarSign, Package, PlusIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { clientsign } from "package/connect_wallet";
import { WalletType } from "package/connect_wallet/src/lib/enums";
import { ChangeEvent, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTrigger,
} from "~/components/shadcn/ui/dialog";
import { Glass } from "~/components/glass/glass";
import useNeedSign from "~/lib/hook";
import { useCreatorStorageAcc, useUserStellarAcc } from "~/lib/state/wallete/stellar-balances";
import { PLATFORM_ASSET, PLATFORM_FEE, TrxBaseFeeInPlatformAsset } from "~/lib/stellar/constant";
import { AccountSchema, clientSelect } from "~/lib/stellar/fan/utils";
import { api } from "~/utils/api";
import { BADWORDS } from "~/utils/banned-word";

import * as React from "react";

import { Button } from "../shadcn/ui/button";


import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "~/components/shadcn/ui/select";


import { Label } from "../shadcn/ui/label";
import { Input } from "../shadcn/ui/input";

import { Textarea } from "../shadcn/ui/textarea";
import { useSellPageAssetStore } from "../store/sell-page-asset-store";
// Remove the pageAsset reference from the schema
export const SellPageAssetSchema = z.object({
    title: z
        .string()
        .refine(
            (value) => {
                return !BADWORDS.some((word) => value.toLowerCase().includes(word.toLowerCase()))
            },
            {
                message: "Title contains banned words.",
            },
        ).optional(),
    description: z.string().optional(),
    amountToSell: z
        .number({
            required_error: "Amount to sell must be entered as a number",
            invalid_type_error: "Amount to sell must be entered as a number",
        })
        .int({ message: "Amount must be a whole number" })
        .positive({ message: "Amount must be greater than 0" }),
    price: z
        .number({
            required_error: "Price must be entered as a number",
            invalid_type_error: "Price must be entered as a number",
        })
        .positive({ message: "Price must be greater than 0" }),
    priceUSD: z
        .number({
            required_error: "USD price must be entered as a number",
            invalid_type_error: "USD price must be entered as a number",
        })
        .positive({ message: "USD price must be greater than 0" })
        .default(1),
    priceXLM: z
        .number({
            required_error: "XLM price must be entered as a number",
            invalid_type_error: "XLM price must be entered as a number",
        })
        .nonnegative({ message: "XLM price cannot be negative" })
        .default(0),
})

type SellPageAssetFormData = z.infer<typeof SellPageAssetSchema>

export default function SellPageAssetModal() {
    const session = useSession()
    const [submitLoading, setSubmitLoading] = useState(false)
    const [pageAsset, setPageAsset] = useState<string | null>(null)
    const { isOpen, setIsOpen } = useSellPageAssetStore()

    // Add this function inside the component after pageAsset state is declared
    const validateAmountToSell = (value: number) => {
        const availableBalance = pageAsset ? Number.parseInt(pageAsset) : 0
        if (value > availableBalance) {
            return "Amount exceeds available balance"
        }
        return true
    }

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isValid },
        setValue,
        watch,
    } = useForm<SellPageAssetFormData>({
        resolver: zodResolver(SellPageAssetSchema),
        mode: "onChange",
        defaultValues: {
            title: "",
            priceUSD: 1,
            priceXLM: 0,
        },
    })

    const pageAssetBalance = api.wallate.acc.getCreatorPageAssetBallances.useQuery(undefined, {
        onSuccess: (data) => {
            if (data) {
                setPageAsset(data.balance)
            }
        },
        onError: (error) => {
            console.log(error)
        },
        refetchOnWindowFocus: false,
    })

    const watchedAmountToSell = watch("amountToSell")
    const watchedPrice = watch("price")
    const watchedPriceUSD = watch("priceUSD")

    const createSellPageAsset = api.fan.asset.sellPageAsset.useMutation({
        onSuccess: () => {
            toast.success("Sell Page Asset Created Successfully", {
                position: "top-center",
                duration: 4000,
            })
            reset()
            setIsOpen(false)

        },
        onError: (error) => {
            toast.error(`Failed to create asset: ${error.message}`)
        },
        onSettled: () => {
            setSubmitLoading(false)
        },
    })

    const calculateRemaining = () => {
        const availableBalance = pageAsset ? Number.parseInt(pageAsset) : 0
        const amountToSell = watchedAmountToSell ?? 0
        return Math.max(0, availableBalance - amountToSell)
    }

    const availableBalance = pageAsset ? Number.parseInt(pageAsset) : 0

    const onSubmit = (data: SellPageAssetFormData) => {
        if (!session.data?.user?.id) {
            toast.error("You must be logged in to create an asset")
            return
        }

        setSubmitLoading(true)

        // Use the pageAssetBalance code as title if it exists
        const assetCode = `${data.amountToSell} ${pageAssetBalance.data?.code}` || "Unknown Asset";

        // Create a modified data object with the title set to the asset code
        const modifiedData = {
            ...data,
            title: assetCode
        };

        createSellPageAsset.mutate(modifiedData);
    }

    const handlePriceChange = (value: number) => {
        setValue("price", value)
        const usdValue = value * 0.5
        setValue("priceUSD", Number(usdValue.toFixed(2)))
    }
    const handleClose = () => {
        setIsOpen(false)
        reset()
    }
    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>


            <DialogContent className="flex max-h-[90vh] w-full max-w-[500px] flex-col overflow-hidden rounded-[0.9rem] border border-black/20 p-0">
                <div className="relative z-0 flex-1 overflow-hidden">
                <Glass
                    className={{
                        root: "pointer-events-none absolute inset-0 z-0 rounded-[0.9rem] *:rounded-[0.9rem]",
                        tint: "bg-[#f3f1ea]/60 transition-colors",
                        effect:
                            "backdrop-blur-[8px] bg-[radial-gradient(circle_at_20%_20%,rgba(255,251,242,0.24),rgba(248,243,232,0.08)_55%,rgba(245,240,230,0.03)_100%)] transition-all",
                        shine:
                            "shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.85),_inset_-1px_-1px_1px_1px_rgba(255,255,255,0.5)]",
                    }}
                />
                <div className="relative z-10 flex h-full flex-col">
                    <DialogHeader className="px-6 pt-5 pb-3">
                        <h2 className="text-lg font-semibold">Sell Page Asset</h2>
                        {pageAssetBalance.isLoading && (
                            <div className="rounded-lg bg-white/40 p-4 text-center text-sm">
                                <span className="loading loading-spinner mr-2"></span>
                                Loading your asset balance...
                            </div>
                        )}

                        {pageAssetBalance.isError && (
                            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-center text-xs text-red-600">
                                Failed to load asset balance. Please refresh and try again.
                            </div>
                        )}

                        {availableBalance === 0 && !pageAssetBalance.isLoading && (
                            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-center text-xs text-yellow-700">
                                You don{"'"}t have any page assets available to sell.
                            </div>
                        )}
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-6 pb-6">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                            {/* Asset Information Section */}
                            <div className="rounded-xl bg-white/40 p-4 space-y-4 border border-black/10">

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description </Label>
                                    <Textarea
                                        id="description"
                                        {...register("description")}
                                        placeholder="Enter asset description (optional)"
                                        rows={3}
                                    />
                                    {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="amountToSell">
                                        Amount to Sell {pageAssetBalance.data?.code} <span className="text-red-600">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="amountToSell"
                                            type="number"
                                            min="1"
                                            max={availableBalance}
                                            step="1"
                                            {...register("amountToSell", {
                                                valueAsNumber: true,
                                                validate: validateAmountToSell,
                                            })}
                                            placeholder="Enter quantity to sell"
                                            className={errors.amountToSell ? "border-red-500" : ""}
                                        />
                                        {pageAssetBalance.isLoading && (
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                <span className="loading loading-spinner loading-xs"></span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Balance Information */}
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">
                                            Available: <span className="font-medium text-foreground">{availableBalance}</span>
                                        </span>
                                        {watchedAmountToSell > 0 && (
                                            <span className="text-muted-foreground">
                                                Remaining:{" "}
                                                <span className={`font-medium ${calculateRemaining() === 0 ? "text-orange-500" : "text-green-600"}`}>
                                                    {calculateRemaining()}
                                                </span>
                                            </span>
                                        )}
                                    </div>

                                    {errors.amountToSell && <p className="text-red-500 text-sm">{errors.amountToSell.message}</p>}

                                    {/* Quick select buttons */}
                                    {availableBalance > 0 && (
                                        <div className="flex gap-2 mt-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setValue("amountToSell", Math.floor(availableBalance * 0.25))}
                                                className="text-xs"
                                            >
                                                25%
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setValue("amountToSell", Math.floor(availableBalance * 0.5))}
                                                className="text-xs"
                                            >
                                                50%
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setValue("amountToSell", Math.floor(availableBalance * 0.75))}
                                                className="text-xs"
                                            >
                                                75%
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setValue("amountToSell", availableBalance)}
                                                className="text-xs"
                                            >
                                                Max
                                            </Button>
                                        </div>
                                    )}

                                    <p className="text-xs text-muted-foreground">How many units of this asset do you want to sell?</p>
                                </div>
                            </div>

                            {/* Pricing Section */}
                            <div className="rounded-xl bg-white/40 p-4 space-y-4 border border-black/10">
                                <Label className="text-base font-bold">Pricing Information</Label>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="price">
                                            {PLATFORM_ASSET.code} Price <span className="text-red-600">*</span>
                                        </Label>
                                        <Input
                                            id="price"
                                            type="number"
                                            step="0.01"
                                            {...register("price", {
                                                valueAsNumber: true,
                                                onChange: (e: React.ChangeEvent<HTMLInputElement>) => handlePriceChange(Number(e.target.value)),
                                            })}
                                            placeholder="0.00"
                                            className={errors.price ? "border-red-500" : ""}
                                        />
                                        {errors.price && <p className="text-red-500 text-sm">{errors.price.message}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="priceXLM">Price in XLM</Label>
                                        <Input
                                            id="priceXLM"
                                            type="number"
                                            step="0.0000001"
                                            {...register("priceXLM", { valueAsNumber: true })}
                                            placeholder="0.00"
                                            className={errors.priceXLM ? "border-red-500" : ""}
                                        />
                                        {errors.priceXLM && <p className="text-red-500 text-sm">{errors.priceXLM.message}</p>}
                                    </div>
                                </div>

                                <div className="text-sm text-muted-foreground">
                                    <p>• Platform Price: Main pricing in your platform currency</p>
                                    <p>• XLM Price: Optional price in Stellar Lumens (0 = not available in XLM)</p>
                                </div>
                            </div>
                            {watchedPrice > 0 && (
                                <div className="rounded-xl bg-white/40 p-4 border border-black/10">
                                    <Label className="text-base font-bold mb-2 block">Preview</Label>
                                    <div className="space-y-2 text-sm">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p>
                                                    <strong>Available Balance:</strong> {availableBalance} units
                                                </p>
                                                <p>
                                                    <strong>Amount to Sell:</strong> {watchedAmountToSell ?? 0} units
                                                </p>
                                                <p className={`${calculateRemaining() === 0 ? "text-orange-500" : "text-green-600"}`}>
                                                    <strong>Remaining After Sale:</strong> {calculateRemaining()} units
                                                </p>
                                            </div>
                                            <div>
                                                <p>
                                                    <strong>Price per Unit:</strong> {watchedPrice ?? 0}
                                                </p>
                                                <p>
                                                    <strong>XLM Price per Unit:</strong> {watch("priceXLM") ?? 0} XLM
                                                </p>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}
                            {/* Submit Section */}
                            <div className="flex gap-2 pt-2">
                                <Button type="submit" disabled={!isValid || submitLoading} className="flex-1">
                                    {submitLoading && <span className="loading loading-spinner mr-2"></span>}
                                    Create Sell Page Asset
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
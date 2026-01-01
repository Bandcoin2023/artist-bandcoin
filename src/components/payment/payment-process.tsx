"use client"

import { useEffect, useState } from "react"
import { api } from "~/utils/api"
import { useSession } from "next-auth/react"
import { clientsign, WalletType } from "package/connect_wallet"
import toast from "react-hot-toast"
import { Button } from "~/components/shadcn/ui/button"
import { AlertCircle, Coins, Loader, TrendingDown, ArrowRight } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "~/components/shadcn/ui/alert"
import useNeedSign from "~/lib/hook"
import { useUserStellarAcc } from "~/lib/state/wallete/stellar-balances"
import { PLATFORM_ASSET, PLATFORM_FEE, TrxBaseFeeInPlatformAsset } from "~/lib/stellar/constant"
import { clientSelect } from "~/lib/stellar/fan/utils"
import { z } from "zod"
import clsx from "clsx"
import type { AssetType } from "~/lib/state/play/use-modal-store"
import { Card, CardContent } from "~/components/shadcn/ui/card"
import BuyWithSquire from "./buy-with-squire"
import RechargeLink from "./recharge-link"
import { Badge } from "../shadcn/ui/badge"
import type { MarketType } from "@prisma/client"
import type { RouterOutputs } from "~/utils/api"

type PaymentProcessProps = {
    item: AssetType
    placerId?: string | null
    price: number
    priceUSD: number
    marketItemId?: number
    setClose: () => void
    type?: MarketType
}
export const PaymentMethodEnum = z.enum(["asset", "xlm", "usdc", "card"])
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>

export default function PaymentProcessItem({
    item,
    placerId,
    price,
    priceUSD,
    marketItemId,
    setClose,
    type,
}: PaymentProcessProps) {
    const session = useSession()
    const { needSign } = useNeedSign()
    const { code, issuer } = item
    const { platformAssetBalance, active, getXLMBalance, hasTrust } = useUserStellarAcc()
    const walletType = session.data?.user.walletType

    // Fee calculations
    const requiredPlatformAssetForTrust = api.marketplace.steller.getRequiredPlatformAsset.useQuery(
        { xlm: 0.5 },

    )
    const hasTrustOnPlatformAsset = hasTrust(PLATFORM_ASSET.code, PLATFORM_ASSET.issuer) ?? false
    const hasTrustOnItemAsset = hasTrust(code, issuer) ?? false

    const totalPlatformFee =
        + Number(PLATFORM_FEE) + Number(TrxBaseFeeInPlatformAsset) + ((hasTrustOnItemAsset && hasTrustOnPlatformAsset) ? 0 : (hasTrustOnItemAsset || hasTrustOnPlatformAsset) ? requiredPlatformAssetForTrust.data ?? 0 : 2 * (requiredPlatformAssetForTrust.data ?? 0))

    // Conversion estimates
    const xlmToPlatformEstimate = api.marketplace.steller.estimateXlmForPlatform.useQuery(
        { platformAmount: price + totalPlatformFee },
        { enabled: true },
    )

    const platformToXlmEstimate = api.marketplace.steller.estimatePlatformForXlm.useQuery({ xlm: 0.5 }, { enabled: true })

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("asset")
    const [paymentSuccess, setPaymentSuccess] = useState(false)
    const [submitLoading, setSubmitLoading] = useState(false)

    const copy = api.marketplace.market.getMarketAssetAvailableCopy.useQuery(
        {
            id: marketItemId,
        },
        {
            enabled: !!marketItemId,
        },
    )

    const xdrMutation = api.marketplace.steller.buyFromMarketPaymentXDR.useMutation({
        onError: (e) => toast.error(e.message.toString()),
    })

    function handleXDR(method: PaymentMethod) {
        xdrMutation.mutate({
            placerId,
            assetCode: code,
            issuerPub: issuer,
            limit: 1,
            signWith: needSign(),
            method,
        })
    }

    const buyerUpdate = api.marketplace.market.createAssetBuyerInfo.useMutation({
        onSuccess: () => {
            toast.success("Item purchased successfully")
            setPaymentSuccess(true)
        },
    })

    const changePaymentMethod = (method: PaymentMethod) => {
        setPaymentMethod(method)
        handleXDR(method)
    }

    const handlePaymentConfirmation = () => {
        setSubmitLoading(true)
        if (!xdrMutation.data) {
            toast.error("XDR data is missing.")
            return
        }
        clientsign({
            presignedxdr: xdrMutation.data,
            pubkey: session.data?.user.id,
            walletType: session.data?.user.walletType,
            test: clientSelect(),
        })
            .then((res) => {
                if (res) {
                    buyerUpdate.mutate({
                        assetId: item.id,
                        isRoyalty: type === "ROYALTY",
                    })
                    toast.success("Payment Successful")
                    setClose()
                    setPaymentSuccess(true)
                }
            })
            .catch((e) => console.log(e))
            .finally(() => {
                setSubmitLoading(false)
            })
    }

    useEffect(() => {
        if (paymentMethod && active) {
            handleXDR(paymentMethod)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentMethod, active])

    if (!active)
        return (
            <div className="w-full  space-y-10">
                <Card>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <Alert
                                variant="destructive"
                                className="bg-destructive/10 border-destructive/20 text-destructive font-mono text-sm rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="h-5 w-5" />
                                    <div>
                                        <div className="font-medium">Stellar Account Not Activated</div>
                                        <div className="text-xs text-muted-foreground">
                                            To receive or transact assets on Stellar you must activate your account by funding it with XLM.
                                        </div>
                                    </div>
                                </div>
                            </Alert>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <Badge variant="outline">XLM Balance: {getXLMBalance() ?? "0"}</Badge>
                            <div className="flex-1" />
                            <RechargeLink />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )

    return (
        <div className="w-full   space-y-10">
            <div className="space-y-8">
                <div className="bg-muted/30 border border-border rounded-2xl p-8 space-y-6 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16" />

                    <div className="flex justify-between items-start border-b border-border/50 pb-6 relative z-10">
                        <div className="space-y-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">
                                Transaction Item
                            </span>
                            <p className="text-2xl font-black font-sans uppercase tracking-tight italic">{item.name}</p>
                        </div>
                        <div className="text-right space-y-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">
                                Total Amount
                            </span>
                            <div className="flex flex-col items-end">
                                <p className="text-2xl font-black font-mono  text-primary-foreground  italic">
                                    {price} <span className="text-xs">{PLATFORM_ASSET.code}</span>
                                </p>
                                <p className="text-[10px]  text-muted-foreground font-bold ">≈ ${priceUSD} USD</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 text-[10px] font-mono relative z-10">
                        <div className="space-y-1">
                            <span className="text-muted-foreground uppercase tracking-widest">Global Supply</span>
                            <p className="text-foreground/80 font-bold">{copy.data ?? "---"} Units Available</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <span className="text-muted-foreground uppercase tracking-widest">Network Protocol</span>
                            <p className="text-foreground/80 font-bold">Stellar Blockchain</p>
                        </div>
                    </div>
                </div>

                {copy.data !== undefined && copy.data < 1 && (
                    <Alert
                        variant="destructive"
                        className="bg-destructive/10 border-destructive/20 text-destructive font-mono text-[10px] uppercase tracking-widest py-4 rounded-xl"
                    >
                        <AlertCircle className="h-4 w-4" />
                        Stock Depleted: Insufficient units for acquisition.
                    </Alert>
                )}

                {copy.data && copy.data > 0 && (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.4em] text-center italic">
                                Select Settlement Method
                            </h3>
                            <PaymentOptions method={paymentMethod} setIsWallet={changePaymentMethod} />
                        </div>

                        {xdrMutation.isLoading ? (
                            <div className="flex justify-center py-4">
                                <Loader className="h-5 w-5 animate-spin" />
                            </div>
                        ) : (
                            <MethodDetails
                                paymentMethod={paymentMethod}
                                xdrMutation={xdrMutation}
                                requiredFee={totalPlatformFee}
                                price={price}
                                priceUSD={priceUSD}
                                platformAssetBalance={platformAssetBalance}
                                getXLMBalance={getXLMBalance}
                                hasTrust={hasTrust}
                                code={code}
                                issuer={issuer}
                                item={item}
                                marketItemId={marketItemId ?? -1}
                                onConfirmPayment={handlePaymentConfirmation}
                                submitLoading={submitLoading}
                                paymentSuccess={paymentSuccess}
                                xlmToPlatformEstimate={xlmToPlatformEstimate}
                                platformToXlmEstimate={platformToXlmEstimate}
                                requiredPlatformAssetForTrust={requiredPlatformAssetForTrust.data ?? 0}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function PaymentOptions({
    method,
    setIsWallet,
}: {
    method?: PaymentMethod
    setIsWallet: (method: PaymentMethod) => void
}) {
    const session = useSession()
    if (session.status !== "authenticated") return null

    const walletType = session.data.user.walletType
    const showCardOption =
        walletType == WalletType.emailPass || walletType == WalletType.google || walletType == WalletType.facebook

    return (
        <div className="space-y-3">
            <p className="text-sm font-medium text-center">Payment Method</p>
            <div className="flex gap-2 items-center justify-center">
                <Option text={PLATFORM_ASSET.code} onClick={() => setIsWallet("asset")} selected={method === "asset"} />
                <Option text="XLM" onClick={() => setIsWallet("xlm")} selected={method === "xlm"} />
                {showCardOption && <Option text="Card" onClick={() => setIsWallet("card")} selected={method === "card"} />}
            </div>
        </div>
    )

    function Option({
        text,
        onClick,
        selected,
    }: {
        text: string
        onClick: () => void
        selected?: boolean
    }) {
        return (
            <Button
                onClick={onClick}
                variant={selected ? "default" : "outline"}
                size="sm"
                className={clsx("w-full justify-center", selected ? "scale-102 shadow-sm " : "")}
            >
                {text}
            </Button>
        )
    }
}

type XLMToPlatformOutput = RouterOutputs["marketplace"]["steller"]["estimateXlmForPlatform"]
type PlatformToXLMOutput = RouterOutputs["marketplace"]["steller"]["estimatePlatformForXlm"]

interface MethodDetailsProps {
    marketItemId: number
    paymentMethod?: PaymentMethod
    xdrMutation: ReturnType<typeof api.marketplace.steller.buyFromMarketPaymentXDR.useMutation>
    requiredFee: number
    price: number
    priceUSD: number
    platformAssetBalance: number
    getXLMBalance: () => string | undefined
    hasTrust: (code: string, issuer: string) => boolean | undefined
    code: string
    type?: MarketType
    issuer: string
    item: AssetType
    onConfirmPayment: () => void
    submitLoading: boolean
    paymentSuccess: boolean
    xlmToPlatformEstimate: { data?: XLMToPlatformOutput; isLoading: boolean; isError: boolean }
    platformToXlmEstimate: { data?: PlatformToXLMOutput; isLoading: boolean; isError: boolean }
    requiredPlatformAssetForTrust: number
}

export function MethodDetails({
    marketItemId,
    paymentMethod,
    xdrMutation,
    requiredFee,
    price,
    priceUSD,
    platformAssetBalance,
    getXLMBalance,
    hasTrust,
    code,
    type,
    issuer,
    item,
    onConfirmPayment,
    submitLoading,
    paymentSuccess,
    xlmToPlatformEstimate,
    platformToXlmEstimate,
    requiredPlatformAssetForTrust,
}: MethodDetailsProps) {
    if (xdrMutation.isLoading) {
        return (
            <div className="flex justify-center py-4">
                <Loader className="h-5 w-5 animate-spin" />
            </div>
        )
    }

    if (xdrMutation.isError) {
        return (
            <Alert variant="destructive" className="text-sm">
                {xdrMutation.error instanceof Error ? xdrMutation.error.message : "Error processing payment"}
            </Alert>
        )
    }

    if (xdrMutation.isSuccess && requiredFee && paymentMethod) {
        // PLATFORM ASSET PAYMENT
        if (paymentMethod === "asset") {
            const xlmBalance = Number.parseFloat(getXLMBalance() ?? "0")
            const hasTrustOnPlatformAsset = hasTrust(PLATFORM_ASSET.code, PLATFORM_ASSET.issuer) ?? false
            const hasTrustOnAsset = hasTrust(code, issuer) ?? false

            // Use requiredFee which is already calculated correctly on parent component
            const requiredAssetValue = typeof requiredPlatformAssetForTrust === "number" ? requiredPlatformAssetForTrust : 0
            const trustlineCost = (hasTrustOnAsset && hasTrustOnPlatformAsset) ? 0 : (hasTrustOnAsset || hasTrustOnPlatformAsset) ? requiredAssetValue : 2 * requiredAssetValue
            const platformFeeCost = Number(PLATFORM_FEE)
            const transactionFeeCost = Number(TrxBaseFeeInPlatformAsset)
            const totalFees = trustlineCost + platformFeeCost + transactionFeeCost
            const totalPlatformNeeded = price + totalFees
            const currentBalance = platformAssetBalance
            const hasSufficientBalance = currentBalance >= totalPlatformNeeded

            // Check if we need XLM conversion
            const needsXlmConversion = !hasSufficientBalance && xlmBalance > 0
            const { xlmNeeded } = xlmToPlatformEstimate.data ?? {}
            const xlmNeededForConversion = needsXlmConversion ? (xlmNeeded ?? 0) : 0
            const canConvertFromXlm = xlmBalance >= xlmNeededForConversion

            if (!hasTrustOnPlatformAsset && xlmBalance < 0.5) {
                return (
                    <Alert variant="destructive" className="text-sm bg-destructive/10 border-destructive/20">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            <span>You need at least 0.5 XLM in your account to create a trustline for {PLATFORM_ASSET.code}.</span>
                        </div>
                    </Alert>
                )
            }

            return (
                <div className="space-y-4">
                    <Card className="border-border/50">
                        <CardContent className="pt-6 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Item Price</span>
                                <span className="font-medium">
                                    {price.toFixed(7)} {PLATFORM_ASSET.code}
                                </span>
                            </div>

                            {/* Fee Breakdown */}
                            <div className="bg-muted/30 rounded p-3 space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fees</p>
                                {trustlineCost > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Trustline Setup</span>
                                        <span>
                                            {trustlineCost.toFixed(7)} {PLATFORM_ASSET.code}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Platform Fee</span>
                                    <span>
                                        {platformFeeCost.toFixed(7)} {PLATFORM_ASSET.code}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Transaction Fee</span>
                                    <span>
                                        {transactionFeeCost.toFixed(7)} {PLATFORM_ASSET.code}
                                    </span>
                                </div>
                            </div>

                            {/* Total */}
                            <div className="border-t pt-3 flex justify-between items-center">
                                <span className="font-semibold">Total Required</span>
                                <span className="font-bold text-lg">
                                    {totalPlatformNeeded.toFixed(7)} {PLATFORM_ASSET.code}
                                </span>
                            </div>

                            {/* Current Balance Info */}
                            <div className="bg-muted/50 rounded p-2 flex items-center gap-2">
                                <Coins className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs">
                                    Your Balance: <span className="font-semibold">{currentBalance.toFixed(7)}</span> {PLATFORM_ASSET.code}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {!hasSufficientBalance && xlmToPlatformEstimate.data && (
                        <Card className="border-amber-200/50 bg-amber-50/30">
                            <CardContent className="pt-6 space-y-3">
                                <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide flex items-center gap-2">
                                    <TrendingDown className="h-4 w-4" /> Conversion Available (XLM → {PLATFORM_ASSET.code})
                                </p>
                                <div className="space-y-3">
                                    <div className="bg-white/50 rounded p-2 space-y-1">
                                        <p className="text-xs text-muted-foreground font-semibold uppercase">You have</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">{xlmBalance.toFixed(7)} XLM</span>
                                            <span className="text-xs text-muted-foreground">
                                                ≈ ${(xlmBalance * (xlmToPlatformEstimate.data?.xlmPrice ?? 0)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                        <div className="h-px flex-1 bg-border" />
                                        <ArrowRight className="h-3 w-3" />
                                        <div className="h-px flex-1 bg-border" />
                                    </div>
                                    <div className="bg-white/50 rounded p-2 space-y-1">
                                        <p className="text-xs text-muted-foreground font-semibold uppercase">You need</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold">{xlmNeededForConversion.toFixed(7)} XLM</span>
                                            <span className="text-xs text-muted-foreground">
                                                ≈ ${(xlmNeededForConversion * (xlmToPlatformEstimate.data?.xlmPrice ?? 0)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
                                        <div className="h-px flex-1 bg-border" />
                                        <span>Converts to</span>
                                        <div className="h-px flex-1 bg-border" />
                                    </div>
                                    <div className="bg-white/50 rounded p-2 space-y-1">
                                        <p className="text-xs text-muted-foreground font-semibold uppercase">You will receive</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold">
                                                {(totalPlatformNeeded - currentBalance).toFixed(7)} {PLATFORM_ASSET.code}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                ≈ ${((totalPlatformNeeded - currentBalance) * (xlmToPlatformEstimate.data?.platformPrice ?? 0)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded p-2 text-xs border-t pt-3 mt-2">
                                    <p className="text-muted-foreground">
                                        <span className="font-semibold">Exchange Rate:</span> 1 XLM ≈{" "}
                                        <span className="font-semibold">{(xlmToPlatformEstimate.data?.rate ?? 0).toFixed(7)}</span>{" "}
                                        {PLATFORM_ASSET.code}
                                    </p>
                                </div>
                                {!canConvertFromXlm && (
                                    <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Insufficient XLM Balance</AlertTitle>
                                        <AlertDescription>
                                            You need {xlmNeededForConversion.toFixed(7)} XLM to convert, but only have {xlmBalance.toFixed(7)}{" "}
                                            XLM available.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {hasSufficientBalance || canConvertFromXlm ? (
                        <Button onClick={onConfirmPayment} disabled={paymentSuccess || submitLoading} className="w-full" size="lg">
                            {submitLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Payment
                        </Button>
                    ) : (
                        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Insufficient Balance</AlertTitle>
                            <AlertDescription className="mt-2 space-y-2">
                                <p>
                                    You need {totalPlatformNeeded.toFixed(7)} {PLATFORM_ASSET.code} to complete this purchase.
                                </p>
                                <p>
                                    Current balance: {currentBalance.toFixed(7)} {PLATFORM_ASSET.code}
                                </p>
                                <div className="pt-2">
                                    <RechargeLink />
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            )
        }

        // XLM PAYMENT
        if (paymentMethod === "xlm") {
            const hasTrustOnAsset = hasTrust(code, issuer) ?? false
            const trustlineCost = hasTrustOnAsset ? 0 : 0.5
            const platformFeeCost = 2 // XLM platform fee
            const priceInXlm = priceUSD // USD converted to XLM at 1:1 for display
            const totalXlmNeeded = priceInXlm + trustlineCost + platformFeeCost
            const currentXlmBalance = Number.parseFloat(getXLMBalance() ?? "0")
            const hasSufficientBalance = currentXlmBalance >= totalXlmNeeded

            // Check if we need PLATFORM conversion for shortfall
            const xlmShortage = Math.max(0, totalXlmNeeded - currentXlmBalance)
            const needsPlatformConversion = xlmShortage > 0
            const { platformNeeded } = platformToXlmEstimate.data ?? {}
            const platformNeededForConversion: number = needsPlatformConversion ? (platformNeeded ?? 0) : 0
            const platformBalance = platformAssetBalance
            const canConvertFromPlatform = platformBalance >= platformNeededForConversion

            return (
                <div className="space-y-4">
                    <Card className="border-border/50">
                        <CardContent className="pt-6 space-y-3">
                            {/* Item Price */}
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Item Price</span>
                                <span className="font-medium">{priceInXlm.toFixed(7)} XLM</span>
                            </div>

                            <div className="bg-muted/30 rounded p-3 space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fees</p>
                                {trustlineCost > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Trustline Setup</span>
                                        <span>{trustlineCost.toFixed(7)} XLM</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Platform Fee</span>
                                    <span>{platformFeeCost.toFixed(7)} XLM</span>
                                </div>
                            </div>

                            {/* Total */}
                            <div className="border-t pt-3 flex justify-between items-center">
                                <span className="font-semibold">Total Required</span>
                                <span className="font-bold text-lg">{totalXlmNeeded.toFixed(7)} XLM</span>
                            </div>

                            {/* Current Balance Info */}
                            <div className="bg-muted/50 rounded p-2 flex items-center gap-2">
                                <Coins className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs">
                                    Your Balance: <span className="font-semibold">{currentXlmBalance.toFixed(7)}</span> XLM
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {needsPlatformConversion && platformToXlmEstimate.data && (
                        <Card className="border-amber-200/50 bg-amber-50/30">
                            <CardContent className="pt-6 space-y-3">
                                <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide flex items-center gap-2">
                                    <TrendingDown className="h-4 w-4" /> Conversion Available ({PLATFORM_ASSET.code} → XLM)
                                </p>
                                <div className="space-y-3">
                                    <div className="bg-white/50 rounded p-2 space-y-1">
                                        <p className="text-xs text-muted-foreground font-semibold uppercase">You have</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">
                                                {platformBalance.toFixed(7)} {PLATFORM_ASSET.code}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                ≈ ${(platformBalance * (platformToXlmEstimate.data?.platformPrice ?? 0)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                        <div className="h-px flex-1 bg-border" />
                                        <ArrowRight className="h-3 w-3" />
                                        <div className="h-px flex-1 bg-border" />
                                    </div>
                                    <div className="bg-white/50 rounded p-2 space-y-1">
                                        <p className="text-xs text-muted-foreground font-semibold uppercase">You need</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold">
                                                {platformNeededForConversion.toFixed(7)} {PLATFORM_ASSET.code}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                ≈ ${(platformNeededForConversion * (platformToXlmEstimate.data?.platformPrice ?? 0)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
                                        <div className="h-px flex-1 bg-border" />
                                        <span>Converts to</span>
                                        <div className="h-px flex-1 bg-border" />
                                    </div>
                                    <div className="bg-white/50 rounded p-2 space-y-1">
                                        <p className="text-xs text-muted-foreground font-semibold uppercase">You will receive</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold">{xlmShortage.toFixed(7)} XLM</span>
                                            <span className="text-xs text-muted-foreground">
                                                ≈ ${(xlmShortage * (platformToXlmEstimate.data?.xlmPrice ?? 0)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded p-2 text-xs border-t pt-3 mt-2">
                                    <p className="text-muted-foreground">
                                        <span className="font-semibold">Exchange Rate:</span> 1 {PLATFORM_ASSET.code} ≈{" "}
                                        <span className="font-semibold">{(platformToXlmEstimate.data?.rate ?? 0).toFixed(7)}</span> XLM
                                    </p>
                                </div>
                                {!canConvertFromPlatform && (
                                    <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Insufficient {PLATFORM_ASSET.code} Balance</AlertTitle>
                                        <AlertDescription>
                                            You need {platformNeededForConversion.toFixed(7)} {PLATFORM_ASSET.code} to convert, but only have{" "}
                                            {platformBalance.toFixed(7)} {PLATFORM_ASSET.code} available.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {hasSufficientBalance || canConvertFromPlatform ? (
                        <Button onClick={onConfirmPayment} disabled={paymentSuccess || submitLoading} className="w-full" size="lg">
                            {submitLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Payment
                        </Button>
                    ) : (
                        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Insufficient Balance</AlertTitle>
                            <AlertDescription className="mt-2 space-y-2">
                                <p>You need {totalXlmNeeded.toFixed(7)} XLM to complete this purchase.</p>
                                <p>Current balance: {currentXlmBalance.toFixed(7)} XLM</p>
                                <div className="pt-2">
                                    <RechargeLink />
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            )
        }

        // CARD PAYMENT
        if (paymentMethod === "card") {
            return (
                <div className="space-y-4 w-full">
                    <Card className="border-border/50">
                        <CardContent className="pt-6">
                            <p className="text-sm text-center">Complete your purchase with a credit card</p>
                        </CardContent>
                    </Card>
                    <BuyWithSquire marketId={marketItemId} xdr={xdrMutation.data} type={type} />
                </div>
            )
        }
    }

    return null
}

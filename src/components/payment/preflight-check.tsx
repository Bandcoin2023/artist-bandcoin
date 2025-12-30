"use client"

import { useEffect, useState } from "react"
import { Alert } from "~/components/shadcn/ui/alert"
import { Badge } from "~/components/shadcn/ui/badge"
import { Button } from "~/components/shadcn/ui/button"
import { Card, CardContent } from "~/components/shadcn/ui/card"
import { CheckCircle2, AlertCircle, Clock, Loader, XCircle, ChevronDown, ChevronUp } from "lucide-react"
import { PLATFORM_ASSET, PLATFORM_FEE, TrxBaseFeeInPlatformAsset } from "~/lib/stellar/constant"
import { USDC_ASSET_CODE, USDC_ISSUER } from "~/lib/usdc"
import type { PaymentMethod } from "./payment-process"
import {
    getplatformAssetNumberForXLM,
    getAssetToUSDCRate,
    getPlatformAssetPrice,
} from "~/lib/stellar/fan/get_token_price"
import { checkTrustline } from "~/lib/stellar/helper"
import { cn } from "~/lib/utils"

interface PreflightCheckProps {
    paymentMethod: PaymentMethod
    price: number
    priceUSD: number
    platformAssetBalance: number
    xlmBalance: string | undefined
    usdcBalance?: number
    hasTrust: boolean | undefined
    code: string
    issuer: string
    userPublicKey: string
    onConfirm: () => void
    onBack?: () => void
    isLoading: boolean
}

interface ChecklistItem {
    id: string
    title: string
    description: string
    status: "pending" | "required" | "success" | "failed"
    fee?: number
    feeAsset?: string
}

interface FeeBreakdown {
    description: string
    amount: number
    asset: string
}

export function PreflightCheck({
    paymentMethod,
    price,
    priceUSD,
    platformAssetBalance,
    xlmBalance,
    usdcBalance,
    hasTrust,
    code,
    issuer,
    userPublicKey,
    onConfirm,
    isLoading,
}: PreflightCheckProps) {
    const [checklist, setChecklist] = useState<ChecklistItem[]>([])
    const [fees, setFees] = useState<FeeBreakdown[]>([])
    const [totalFee, setTotalFee] = useState(0)
    const [canProceed, setCanProceed] = useState(false)
    const [loading, setLoading] = useState(true)
    const [hasUSDCTrust, setHasUSDCTrust] = useState<boolean | undefined>(undefined)
    const [hasPlatformAssetTrust, setHasPlatformAssetTrust] = useState<boolean | undefined>(undefined)
    const [isExpanded, setIsExpanded] = useState(false)

    useEffect(() => {
        const generateChecklist = async () => {
            setLoading(true)
            try {
                let usdcTrustStatus = hasUSDCTrust
                let platformAssetTrustStatus = hasPlatformAssetTrust

                if (paymentMethod === "usdc" && usdcTrustStatus === undefined) {
                    usdcTrustStatus = await checkTrustline(userPublicKey, USDC_ASSET_CODE, USDC_ISSUER)
                    setHasUSDCTrust(usdcTrustStatus)
                }

                if ((paymentMethod === "asset" || paymentMethod === "usdc") && platformAssetTrustStatus === undefined) {
                    platformAssetTrustStatus = await checkTrustline(userPublicKey, PLATFORM_ASSET.code, PLATFORM_ASSET.issuer)
                    setHasPlatformAssetTrust(platformAssetTrustStatus)
                }

                const items: ChecklistItem[] = []
                const feeItems: FeeBreakdown[] = []
                let total = 0
                console.log("Items generation for payment method:", items, feeItems)
                if (paymentMethod === "asset") {
                    // Check trust status for purchased asset
                    const trustRequired = !hasTrust
                    if (trustRequired) {
                        const trustFee = await getplatformAssetNumberForXLM(0.5)
                        items.push({
                            id: "trust",
                            title: "Establish Trustline for Asset",
                            description: `Create trustline for ${code} on your account`,
                            status: "required",
                            fee: trustFee,
                            feeAsset: PLATFORM_ASSET.code,
                        })
                        feeItems.push({
                            description: "Asset Trustline Setup Fee",
                            amount: trustFee,
                            asset: PLATFORM_ASSET.code,
                        })
                        total += trustFee
                    } else {
                        items.push({
                            id: "trust",
                            title: "Trustline for Asset",
                            description: `You already have a trustline for ${code}`,
                            status: "success",
                        })
                    }

                    const platformAssetTrustRequired = !platformAssetTrustStatus
                    if (platformAssetTrustRequired) {
                        items.push({
                            id: "platform-asset-trust",
                            title: `You don't have trust on ${PLATFORM_ASSET.code}`,
                            description: `Please establish trustline for ${PLATFORM_ASSET.code} to pay platform fees`,
                            status: "failed",
                        })

                    } else {
                        items.push({
                            id: "platform-asset-trust",
                            title: "Trustline for Platform Asset",
                            description: `You already have a trustline for ${PLATFORM_ASSET.code}`,
                            status: "success",
                        })
                    }

                    // Asset purchase
                    items.push({
                        id: "purchase",
                        title: "Purchase Asset",
                        description: `Receive 1 ${code} `,
                        status: "pending",
                    })
                    // platform payment
                    items.push({
                        id: "platform-payment",
                        title: `Pay with ${PLATFORM_ASSET.code}`,
                        description: `Transfer payment amount in ${PLATFORM_ASSET.code}`,
                        status: "pending",
                        fee: price,
                        feeAsset: PLATFORM_ASSET.code,
                    })
                    feeItems.push({
                        description: `Asset Price (${PLATFORM_ASSET.code})`,
                        amount: price,
                        asset: PLATFORM_ASSET.code,
                    })
                    total += price
                    // Network fee
                    const networkFee = Number(PLATFORM_FEE) + Number(TrxBaseFeeInPlatformAsset)
                    items.push({
                        id: "network",
                        title: "Network & Platform Fee",
                        description: "Stellar network processing fee",
                        status: "required",
                        fee: networkFee,
                        feeAsset: PLATFORM_ASSET.code,
                    })
                    feeItems.push({
                        description: "Network & Platform Fee",
                        amount: networkFee,
                        asset: PLATFORM_ASSET.code,
                    })
                    total += networkFee
                    console.log("Total fee so far:", total, networkFee, price)
                    // Check balance sufficiency
                    const requiredBalance = price + total
                    const canAfford = platformAssetBalance >= requiredBalance

                    setChecklist(items)
                    setFees(feeItems)
                    setTotalFee(total)
                    const hasFailedItems = items.some(item => item.status === "failed")
                    setCanProceed(canAfford && !hasFailedItems)
                }

                if (paymentMethod === "xlm") {
                    // Check trust status
                    const trustRequired = !hasTrust
                    if (trustRequired) {
                        items.push({
                            id: "trust",
                            title: "Establish Trustline",
                            description: `Create trustline for ${code}`,
                            status: "required",

                        })


                    } else {
                        items.push({
                            id: "trust",
                            title: "Trustline Available",
                            description: `You already have a trustline for ${code}`,
                            status: "success",
                        })
                    }

                    // Asset purchase
                    items.push({
                        id: "purchase",
                        title: "Purchase Asset",
                        description: `Pay ${priceUSD} XLM for 1 ${code}`,
                        status: "pending",
                        fee: priceUSD,
                        feeAsset: "XLM",
                    })
                    feeItems.push({
                        description: "Asset Price",
                        amount: priceUSD,
                        asset: "XLM",
                    })
                    total += priceUSD

                    // Platform fee
                    const platformFeeXlm = 2
                    items.push({
                        id: "platform-fee",
                        title: "Platform Fee",
                        description: "Fee for transaction processing",
                        status: "required",
                        fee: platformFeeXlm,
                        feeAsset: "XLM",
                    })
                    feeItems.push({
                        description: "Platform Fee",
                        amount: platformFeeXlm,
                        asset: "XLM",
                    })
                    total += platformFeeXlm

                    // Check balance sufficiency
                    const currentXlm = Number.parseFloat(xlmBalance ?? "0")
                    const canAfford = currentXlm >= total

                    setChecklist(items)
                    setFees(feeItems)
                    setTotalFee(total)
                    const hasFailedItems = items.some(item => item.status === "failed")
                    setCanProceed(canAfford && !hasFailedItems)
                }

                if (paymentMethod === "usdc") {
                    // Check trust status for purchased asset
                    const assetTrustRequired = !hasTrust
                    if (assetTrustRequired) {
                        const trustFee = await getplatformAssetNumberForXLM(0.5)
                        items.push({
                            id: "trust",
                            title: "Establish Trustline for Asset",
                            description: `Create trustline for ${code} on your account`,
                            status: "required",
                            fee: trustFee,
                            feeAsset: PLATFORM_ASSET.code,
                        })
                        feeItems.push({
                            description: "Asset Trustline Setup Fee",
                            amount: trustFee,
                            asset: PLATFORM_ASSET.code,
                        })
                        total += trustFee
                    } else {
                        items.push({
                            id: "trust",
                            title: "Trustline for Asset",
                            description: `You already have a trustline for ${code}`,
                            status: "success",
                        })
                    }

                    const usdcTrustRequired = !usdcTrustStatus
                    if (usdcTrustRequired) {
                        items.push({
                            id: "usdc-trust",
                            title: `You don't have trust on USDC`,
                            description: `Please establish trustline for USDC to make payment`,
                            status: "failed",

                            feeAsset: PLATFORM_ASSET.code,
                        })

                    } else {
                        items.push({
                            id: "usdc-trust",
                            title: "Trustline for USDC",
                            description: `You already have a trustline for USDC`,
                            status: "success",
                        })
                    }


                    items.push({
                        id: "purchase",
                        title: "Purchase Asset",
                        description: `Receive 1 ${code} `,
                        status: "pending",
                    })

                    // USDC payment
                    items.push({
                        id: "usdc-payment",
                        title: "Pay with USDC",
                        description: `Transfer payment amount in USDC`,
                        status: "pending",
                        fee: price,
                        feeAsset: "USDC",
                    })
                    total += price
                    feeItems.push({
                        description: "Asset Price (USDC)",
                        amount: price,
                        asset: "USDC",
                    })

                    // Platform fee in USDC
                    const usdcRate = await getAssetToUSDCRate()
                    const platformAssetPriceInUsd = await getPlatformAssetPrice()
                    const platformFeeInUSDC = (Number(PLATFORM_FEE) * platformAssetPriceInUsd) / usdcRate

                    items.push({
                        id: "network",
                        title: "Network & Platform Fee",
                        description: "Fee for transaction processing",
                        status: "required",
                        fee: platformFeeInUSDC,
                        feeAsset: "USDC",
                    })
                    feeItems.push({
                        description: "Network & Platform Fee",
                        amount: platformFeeInUSDC,
                        asset: "USDC",
                    })

                    const totalUSDC = price + platformFeeInUSDC
                    const canAfford = (usdcBalance ?? 0) >= totalUSDC

                    setChecklist(items)
                    setFees(feeItems)
                    setTotalFee(totalUSDC)
                    const hasFailedItems = items.some(item => item.status === "failed")
                    setCanProceed(canAfford && !hasFailedItems)
                }

                if (paymentMethod === "card") {
                    // Check trust status for purchased asset
                    const assetTrustRequired = !hasTrust
                    items.push({
                        id: "trust",
                        title: "Establish Trustline",
                        description: `Create trustline for ${code}`,
                        status: assetTrustRequired ? "required" : "success",
                    })

                    const platformAssetTrustRequired = !platformAssetTrustStatus
                    if (platformAssetTrustRequired) {
                        items.push({
                            id: "platform-asset-trust",
                            title: "Establish Trustline for Platform Asset",
                            description: `Create trustline for ${PLATFORM_ASSET.code} to receive the asset`,
                            status: "required",
                        })
                    }

                    items.push({
                        id: "card-payment",
                        title: "Card Payment Processing",
                        description: "Process credit/debit card payment",
                        status: "pending",
                        fee: priceUSD,
                        feeAsset: "USD",
                    })
                    total += priceUSD
                    feeItems.push({
                        description: "Card Payment Amount",
                        amount: priceUSD,
                        asset: "USD",
                    })

                    setChecklist(items)
                    setFees(feeItems)
                    setTotalFee(priceUSD)
                    const hasFailedItems = items.some(item => item.status === "failed")
                    setCanProceed(!hasFailedItems)
                }
            } catch (error) {
                console.error("Error generating preflight check:", error)
                setCanProceed(false)
            } finally {
                setLoading(false)
            }
        }

        generateChecklist()
    }, [
        paymentMethod,
        hasTrust,
        price,
        priceUSD,
        code,
        xlmBalance,
        platformAssetBalance,
        usdcBalance,
        userPublicKey,
        hasUSDCTrust,
        hasPlatformAssetTrust,
    ])

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader className="h-5 w-5 animate-spin" />
            </div>
        )
    }

    const trustRequired = !hasTrust && ["asset", "xlm", "usdc", "card"].includes(paymentMethod)

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] italic">
                    Preflight Diagnostics
                </h3>
                <Badge

                    className="bg-primary/20 backdrop-blur-xl border-primary/20 text-[10px] uppercase tracking-[0.2em] px-3 py-1 font-mono  text-primary-foreground "
                >
                    Secure Channel
                </Badge>
            </div>

            <Button
                onClick={() => setIsExpanded(!isExpanded)}
                variant="outline"
                size="sm"
                className="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest italic hover:bg-muted/40"
            >
                {isExpanded ? <ChevronUp className="h-4 w-4 animate-bounce font-bold" /> : <ChevronDown className="h-4 w-4  animate-bounce font-bold" />}
                {isExpanded ? "Click to Hide Diagnostics" : "Click to Show Diagnostics"}
            </Button>

            {isExpanded && (
                <div className="grid gap-3">
                    {checklist.map((item) => (
                        <div
                            key={item.id}
                            className={cn(
                                "flex items-center gap-5 p-5 rounded-2xl border transition-all duration-300 group",
                                item.status === "failed"
                                    ? "bg-destructive/5 border-destructive/20"
                                    : "bg-muted/20 border-border/50 hover:bg-muted/40 hover:border-border",
                            )}
                        >
                            <div
                                className={cn(
                                    "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                                    item.status === "success" && "bg-success/10 text-success",
                                    item.status === "required" && "bg-primary/10  text-primary-foreground ",
                                    item.status === "pending" && "bg-warning/10 text-warning",
                                    item.status === "failed" && "bg-destructive/10 text-destructive",
                                )}
                            >
                                {item.status === "success" && <CheckCircle2 className="h-5 w-5" />}
                                {item.status === "required" && <AlertCircle className="h-5 w-5" />}
                                {item.status === "pending" && <Clock className="h-5 w-5" />}
                                {item.status === "failed" && <XCircle className="h-5 w-5" />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black uppercase tracking-tight text-foreground italic">{item.title}</p>
                                <p className="text-[10px] text-muted-foreground font-mono truncate uppercase tracking-tighter mt-0.5 opacity-70">
                                    {item.description}
                                </p>
                            </div>

                            {item.fee !== undefined && (
                                <div className="text-right font-mono text-xs font-bold text-foreground italic">
                                    {item.fee} <span className="text-[10px] text-muted-foreground">{item.feeAsset}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="p-6 bg-muted/30 rounded-2xl border border-border relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full -mr-12 -mt-12" />
                <div className="space-y-4 relative z-10">
                    <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">
                        <span>Network Payload</span>
                        <span>Asset Value</span>
                    </div>
                    <div className="space-y-2">
                        {fees.map((fee, idx) => (
                            <div key={idx} className="flex justify-between text-[11px] font-mono">
                                <span className="text-muted-foreground/80">{fee.description}</span>
                                <span className="text-foreground font-bold">
                                    {fee.amount} {fee.asset}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="pt-4 mt-2 border-t border-border/50 flex justify-between items-baseline">
                        <span className="text-[10px] font-black text-foreground uppercase tracking-widest italic">
                            Aggregate Estimated
                        </span>
                        <div className="text-right">
                            <span className="text-2xl font-black font-mono  text-primary-foreground  italic">
                                {totalFee.toFixed(4)} <span className="text-xs">{paymentMethod === "asset" ? PLATFORM_ASSET.code : paymentMethod}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <Button
                onClick={onConfirm}
                disabled={!canProceed || isLoading}
                className={cn(
                    "w-full h-16 text-xs font-black uppercase tracking-[0.3em] transition-all duration-500 rounded-xl italic",
                    canProceed
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_rgba(var(--primary),0.2)]"
                        : "bg-muted text-muted-foreground border-border cursor-not-allowed",
                )}
            >
                {isLoading ? (
                    <div className="flex items-center gap-3">
                        <Loader className="h-4 w-4 animate-spin" />
                        Synchronizing...
                    </div>
                ) : canProceed ? (
                    "Finalize Execution"
                ) : (
                    "Insufficient Liquidity"
                )}
            </Button>

            {!canProceed && !isLoading && (
                <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-destructive/5">
                    <AlertCircle className="h-3 w-3 text-destructive" />
                    <p className="text-[9px] text-destructive font-mono uppercase tracking-widest font-bold">
                        Critical: Ledger trustlines or balance requirements not met.
                    </p>
                </div>
            )}
        </div>
    )
}

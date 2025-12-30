"use client"

import { useEffect, useState } from "react"
import { api } from "~/utils/api"
import { useSession } from "next-auth/react"
import { clientsign, WalletType } from "package/connect_wallet"
import toast from "react-hot-toast"
import { Button } from "~/components/shadcn/ui/button"
import { AlertCircle, Loader } from "lucide-react"
import { Alert } from "~/components/shadcn/ui/alert"
import useNeedSign from "~/lib/hook"
import { useUserStellarAcc } from "~/lib/state/wallete/stellar-balances"
import { PLATFORM_ASSET } from "~/lib/stellar/constant"
import { clientSelect } from "~/lib/stellar/fan/utils"
import { addrShort } from "~/utils/utils"
import { z } from "zod"
import clsx from "clsx"
import type { AssetType } from "~/lib/state/play/use-modal-store"
import { Card, CardContent } from "~/components/shadcn/ui/card"
import BuyWithSquire from "./buy-with-squire"
import RechargeLink from "./recharge-link"
import { Badge } from "../shadcn/ui/badge"
import type { MarketType } from "@prisma/client"
import { PreflightCheck } from "./preflight-check"
import { USDC_ASSET_CODE, USDC_ISSUER } from "~/lib/usdc"

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
    const { platformAssetBalance, active, getXLMBalance, balances, hasTrust, usdcBalance } = useUserStellarAcc()
    const walletType = session.data?.user.walletType

    const requiredFee = api.fan.trx.getRequiredPlatformAsset.useQuery({
        xlm: hasTrust(code, issuer) ? 0 : 0.5,
    })

    const [xdr, setXdr] = useState<string>()
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("asset")
    const [paymentSuccess, setPaymentSuccess] = useState(false)
    const [isBuyDialogOpen, setIsBuyDialogOpen] = useState(true)
    const [submitLoading, setSubmitLoading] = useState(false)

    const showUSDPrice =
        walletType == WalletType.emailPass || walletType == WalletType.google || walletType == WalletType.facebook
    const copy = api.marketplace.market.getMarketAssetAvailableCopy.useQuery(
        {
            id: marketItemId,
        },
        {
            enabled: !!marketItemId,
        },
    )

    const xdrMutation = api.marketplace.steller.buyFromMarketPaymentXDR.useMutation({
        onSuccess: (data) => {
            setXdr(data)
        },
        onError: (e) => toast.error(e.message.toString()),
    })

    async function handleXDR(method: PaymentMethod) {
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
            setIsBuyDialogOpen(false)
        },
    })

    const changePaymentMethod = async (method: PaymentMethod) => {
        setPaymentMethod(method)
        await handleXDR(method)
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
                    setIsBuyDialogOpen(false)
                }
            })
            .catch((e) => console.log(e))
            .finally(() => {
                setSubmitLoading(false)
                setIsBuyDialogOpen(false)
            })
    }

    useEffect(() => {
        if (paymentMethod) {
            handleXDR(paymentMethod)
        }
    }, [])

    if (!active) return null

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
                        ) : paymentMethod === "card" ? (
                            <MethodDetails
                                paymentMethod={paymentMethod}
                                xdrMutation={xdrMutation}
                                requiredFee={requiredFee.data}
                                price={price}
                                type={type}
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
                            />
                        ) : xdrMutation.isSuccess ? (
                            <PreflightCheck
                                paymentMethod={paymentMethod}
                                price={price}
                                priceUSD={priceUSD}
                                userPublicKey={session.data?.user.id ?? ""}
                                platformAssetBalance={platformAssetBalance}
                                xlmBalance={getXLMBalance()}
                                usdcBalance={usdcBalance}
                                hasTrust={hasTrust(code, issuer)}

                                code={code}
                                issuer={issuer}
                                onConfirm={handlePaymentConfirmation}
                                onBack={() => setPaymentMethod("asset")}
                                isLoading={submitLoading}
                            />
                        ) : null}
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

type MethodDetailsProps = {
    marketItemId: number
    paymentMethod?: PaymentMethod
    xdrMutation: ReturnType<typeof api.marketplace.steller.buyFromMarketPaymentXDR.useMutation>
    requiredFee?: number
    price: number
    priceUSD: number
    platformAssetBalance: number
    getXLMBalance: () => string | undefined
    hasTrust: (code: string, issuer: string) => boolean | undefined
    code: string
    issuer: string
    item: AssetType
    onConfirmPayment: () => void
    submitLoading: boolean
    paymentSuccess: boolean
    type?: MarketType
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
        if (paymentMethod === "asset") {
            const requiredAssetBalance = price + requiredFee
            const isSufficient = platformAssetBalance >= requiredAssetBalance

            return (
                <div className="space-y-4">
                    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Item Price</span>
                            <span>
                                {price} {PLATFORM_ASSET.code}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Network Fee</span>
                            <span>
                                {requiredFee} {PLATFORM_ASSET.code}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm font-medium border-t pt-2">
                            <span>Total</span>
                            <span>
                                {requiredAssetBalance} {PLATFORM_ASSET.code}
                            </span>
                        </div>
                    </div>

                    {isSufficient ? (
                        <Button onClick={onConfirmPayment} disabled={paymentSuccess || submitLoading} className="w-full">
                            {submitLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Payment
                        </Button>
                    ) : (
                        <div className="space-y-3">
                            <div className="text-center space-y-1">
                                <p className="text-sm text-muted-foreground">Your balance</p>
                                <Badge variant="outline">
                                    {platformAssetBalance} {PLATFORM_ASSET.code}
                                </Badge>
                            </div>
                            <Alert variant="destructive" className="text-sm">
                                Insufficient balance
                            </Alert>
                            <RechargeLink />
                        </div>
                    )}
                </div>
            )
        }

        if (paymentMethod === "xlm") {
            const requiredXlm = priceUSD + 2 + (hasTrust(code, issuer) ? 0 : 0.5)
            const currentXlm = Number.parseFloat(getXLMBalance() ?? "0")
            const isSufficient = currentXlm >= requiredXlm

            return (
                <div className="space-y-4">
                    <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex justify-between text-sm font-medium">
                            <span>Total</span>
                            <span>{requiredXlm} XLM</span>
                        </div>
                    </div>

                    {isSufficient ? (
                        <Button onClick={onConfirmPayment} disabled={paymentSuccess || submitLoading} className="w-full">
                            {submitLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Payment
                        </Button>
                    ) : (
                        <div className="space-y-3">
                            <div className="text-center space-y-1">
                                <p className="text-sm text-muted-foreground">Your balance</p>
                                <Badge variant="outline">{getXLMBalance()} XLM</Badge>
                            </div>
                            <Alert variant="destructive" className="text-sm">
                                Insufficient balance
                            </Alert>
                            <RechargeLink />
                        </div>
                    )}
                </div>
            )
        }

        if (paymentMethod === "card") {
            return (
                <div className="space-y-4 w-full">
                    <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm text-center">Pay with credit card</p>
                    </div>
                    <BuyWithSquire marketId={marketItemId} xdr={xdrMutation.data} type={type} />
                </div>
            )
        }
    }

    return null
}

"use client"

import type React from "react"

import { useState } from "react"
import { api } from "~/utils/api"
import { useSession } from "next-auth/react"
import { clientsign, WalletType } from "package/connect_wallet"
import toast from "react-hot-toast"
import { Button } from "~/components/shadcn/ui/button"
import {
    Loader,
    CheckCircle,
    AlertCircle,
    CreditCard,
    Coins,
    Wallet,
    ShoppingCart,
    Clock,
    Shield,
    Zap,
} from "lucide-react"
import { Alert } from "~/components/shadcn/ui/alert"
import useNeedSign from "~/lib/hook"
import { useUserStellarAcc } from "~/lib/state/wallete/stellar-balances"
import { PLATFORM_ASSET } from "~/lib/stellar/constant"
import { clientSelect } from "~/lib/stellar/fan/utils"
import { addrShort } from "~/utils/utils"
import { z } from "zod"
import clsx from "clsx"
import type { AssetType } from "~/lib/state/play/use-modal-store"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/shadcn/ui/card"
import BuyWithSquire from "./buy-with-squire"
import RechargeLink from "./recharge-link"
import { Badge } from "../shadcn/ui/badge"
import { Skeleton } from "~/components/shadcn/ui/skeleton"
import { Progress } from "~/components/shadcn/ui/progress"
import { Separator } from "~/components/shadcn/ui/separator"

type PaymentProcessProps = {
    item: AssetType
    placerId?: string | null
    price: number
    priceUSD: number
    marketItemId?: number
    setClose: () => void
}

export const PaymentMethodEnum = z.enum(["asset", "xlm", "card"])
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>

export default function PaymentProcessItem({
    item,
    placerId,
    price,
    priceUSD,
    marketItemId,
    setClose,
}: PaymentProcessProps) {
    const session = useSession()
    const { needSign } = useNeedSign()
    const { code, issuer } = item
    const { platformAssetBalance, active, getXLMBalance, balances, hasTrust } = useUserStellarAcc()
    const walletType = session.data?.user.walletType

    const requiredFee = api.fan.trx.getRequiredPlatformAsset.useQuery({
        xlm: hasTrust(code, issuer) ? 0 : 0.5,
    })

    const [xdr, setXdr] = useState<string>()
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>()
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

    if (!active) return null

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Payment Section */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-0 shadow-xl bg-gradient-to-br from-background to-muted/20">
                        <CardHeader className="space-y-6 pb-8">
                            <div className="flex items-start justify-between">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-primary/10">
                                            <ShoppingCart className="h-6 w-6 text-primary" />
                                        </div>
                                        <CardTitle className="text-3xl font-bold tracking-tight">Secure Checkout</CardTitle>
                                    </div>
                                    <p className="text-muted-foreground text-lg">
                                        Complete your purchase for{" "}
                                        <span className="font-semibold text-foreground bg-primary/10 px-2 py-1 rounded-md">
                                            {item.name}
                                        </span>
                                    </p>
                                </div>
                                <Badge variant="secondary" className="flex items-center gap-1">
                                    <Shield className="h-3 w-3" />
                                    Secure
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-8">
                            {/* Payment Method Selection */}
                            {copy.data && copy.data > 0 && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-xl font-semibold flex items-center gap-2">
                                            <Zap className="h-5 w-5 text-primary" />
                                            Choose Payment Method
                                        </h3>
                                        <PaymentOptions method={paymentMethod} setIsWallet={changePaymentMethod} />
                                    </div>

                                    <Separator className="my-8" />

                                    {/* Payment Details */}
                                    <MethodDetails
                                        paymentMethod={paymentMethod}
                                        xdrMutation={xdrMutation}
                                        requiredFee={requiredFee.data}
                                        price={price}
                                        priceUSD={priceUSD}
                                        platformAssetBalance={platformAssetBalance}
                                        getXLMBalance={getXLMBalance}
                                        hasTrust={hasTrust}
                                        code={code}
                                        issuer={issuer}
                                        item={item}
                                        onConfirmPayment={handlePaymentConfirmation}
                                        submitLoading={submitLoading}
                                        paymentSuccess={paymentSuccess}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Order Summary Sidebar */}
                <div className="space-y-6">
                    <Card className="sticky top-4 border-0 shadow-lg bg-gradient-to-br from-muted/50 to-background">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Order Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Item Details */}
                            <div className="space-y-4">
                                <div className="p-4 rounded-lg bg-background border">
                                    <h4 className="font-semibold text-lg mb-2">{item.name}</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Price:</span>
                                            <div className="text-right">
                                                <div className="font-semibold text-lg">
                                                    {price} {PLATFORM_ASSET.code}
                                                </div>
                                                {showUSDPrice && <div className="text-sm text-muted-foreground">${priceUSD} USD</div>}
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Available:</span>
                                            <div className="flex items-center gap-2">
                                                {copy.isLoading ? (
                                                    <Skeleton className="h-5 w-8" />
                                                ) : (
                                                    <Badge variant={copy.data && copy.data > 0 ? "default" : "destructive"}>
                                                        {copy.data ?? "N/A"} copies
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Issuer:</span>
                                            <Badge variant="outline" className="font-mono text-xs">
                                                {addrShort(issuer, 6)}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* Availability Status */}
                                {copy.isLoading ? (
                                    <div className="space-y-3">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                    </div>
                                ) : copy.data && copy.data < 1 ? (
                                    <Alert className="border-destructive/50 bg-destructive/5">
                                        <AlertCircle className="h-4 w-4" />
                                        <div>
                                            <h4 className="font-semibold">Out of Stock</h4>
                                            <p className="text-sm">This item is currently unavailable.</p>
                                        </div>
                                    </Alert>
                                ) : copy.data === undefined ? (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <div>
                                            <h4 className="font-semibold">Error</h4>
                                            <p className="text-sm">Unable to check availability.</p>
                                        </div>
                                    </Alert>
                                ) : (
                                    <Alert className="border-green-500/50 bg-green-500/5">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <div>
                                            <h4 className="font-semibold text-green-800">In Stock</h4>
                                            <p className="text-sm text-green-700">Ready for purchase.</p>
                                        </div>
                                    </Alert>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
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

    const paymentMethods = [
        {
            id: "asset" as PaymentMethod,
            icon: <Coins className="h-6 w-6" />,
            title: PLATFORM_ASSET.code,
            description: "Pay with platform tokens",
            recommended: true,
        },
        {
            id: "xlm" as PaymentMethod,
            icon: <Wallet className="h-6 w-6" />,
            title: "XLM",
            description: "Pay with Stellar Lumens",
            recommended: false,
        },
        ...(showCardOption
            ? [
                {
                    id: "card" as PaymentMethod,
                    icon: <CreditCard className="h-6 w-6" />,
                    title: "Credit Card",
                    description: "Pay with credit/debit card",
                    recommended: false,
                },
            ]
            : []),
    ]

    return (
        <div className="grid gap-4">
            {paymentMethods.map((paymentMethodOption) => (
                <PaymentMethodCard
                    key={paymentMethodOption.id}
                    {...paymentMethodOption}
                    selected={method === paymentMethodOption.id}
                    onClick={() => setIsWallet(paymentMethodOption.id)}
                />
            ))}
        </div>
    )
}

function PaymentMethodCard({
    icon,
    title,
    description,
    recommended,
    selected,
    onClick,
}: {
    icon: React.ReactNode
    title: string
    description: string
    recommended: boolean
    selected: boolean
    onClick: () => void
}) {
    return (
        <Card
            className={clsx(
                "cursor-pointer transition-all duration-300 hover:shadow-lg group",
                "hover:border-primary/50",
                selected && " border-2 shadow-lg shadow-secondary scale-[1.05]",
                !selected && "hover:scale-[1.01]",
            )}
            onClick={onClick}
        >
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div
                            className={clsx(
                                "p-3 rounded-full transition-colors",
                                selected ? "bg-primary text-primary-foreground" : "bg-muted group-hover:bg-primary/10",
                            )}
                        >
                            {icon}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-lg">{title}</h4>
                                {recommended && (
                                    <Badge variant="secondary" className="text-xs">
                                        Recommended
                                    </Badge>
                                )}
                            </div>
                            <p className="text-muted-foreground text-sm">{description}</p>
                        </div>
                    </div>
                    <div
                        className={clsx(
                            "w-5 h-5 rounded-full border-2 transition-all",
                            selected ? "border-primary bg-primary" : "border-muted-foreground group-hover:border-primary",
                        )}
                    >
                        {selected && <CheckCircle className="w-5 h-5 text-primary-foreground" />}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

type MethodDetailsProps = {
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
}

export function MethodDetails({
    paymentMethod,
    xdrMutation,
    requiredFee,
    price,
    priceUSD,
    platformAssetBalance,
    getXLMBalance,
    hasTrust,
    code,
    issuer,
    item,
    onConfirmPayment,
    submitLoading,
    paymentSuccess,
}: MethodDetailsProps) {
    if (!paymentMethod) {
        return (
            <Card className="border-dashed border-2">
                <CardContent className="p-12 text-center">
                    <div className="space-y-4">
                        <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto">
                            <CreditCard className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Select Payment Method</h3>
                            <p className="text-muted-foreground">Choose how you{"'"}d like to pay for this item</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (xdrMutation.isLoading) {
        return (
            <Card className="border-0 shadow-lg">
                <CardContent className="p-8">
                    <div className="flex flex-col items-center space-y-6">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <Loader className="h-8 w-8 animate-spin text-primary" />
                            </div>
                            <div className="absolute -inset-2 rounded-full border-2 border-primary/20 animate-pulse" />
                        </div>
                        <div className="space-y-3 text-center">
                            <h3 className="font-semibold text-lg">Preparing Payment</h3>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-64 mx-auto" />
                                <Skeleton className="h-3 w-48 mx-auto" />
                            </div>
                            <Progress value={65} className="w-64 mx-auto" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (xdrMutation.isError) {
        return (
            <Alert variant="destructive" className="border-0 shadow-lg">
                <AlertCircle className="h-5 w-5" />
                <div>
                    <h4 className="font-semibold">Payment Error</h4>
                    <p className="text-sm">
                        {xdrMutation.error instanceof Error ? xdrMutation.error.message : "An unexpected error occurred"}
                    </p>
                </div>
            </Alert>
        )
    }

    if (xdrMutation.isSuccess && requiredFee) {
        if (paymentMethod === "asset") {
            const requiredAssetBalance = price + requiredFee
            const isSufficientAssetBalance = platformAssetBalance >= requiredAssetBalance

            return (
                <div className="space-y-6">
                    <Card className="border-0 shadow-lg bg-gradient-to-r from-background to-muted/30">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Coins className="h-5 w-5 text-primary" />
                                Payment Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-muted-foreground">Item Price</span>
                                    <span className="font-semibold text-lg">
                                        {price} {PLATFORM_ASSET.code}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-muted-foreground">Network Fee</span>
                                    <span className="font-semibold">
                                        {requiredFee} {PLATFORM_ASSET.code}
                                    </span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center py-3 bg-primary/5 -mx-6 px-6 rounded-lg">
                                    <span className="font-semibold text-xl">Total Amount</span>
                                    <span className="font-bold text-2xl ">
                                        {requiredAssetBalance} {PLATFORM_ASSET.code}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {isSufficientAssetBalance ? (
                        <Button
                            disabled={paymentSuccess || submitLoading}
                            size="lg"
                            className="w-full h-14 text-lg font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm"
                            onClick={onConfirmPayment}
                        >
                            {submitLoading ? (
                                <>
                                    <Loader className="mr-3 h-5 w-5 animate-spin" />
                                    Processing Payment...
                                </>
                            ) : paymentSuccess ? (
                                <>
                                    <CheckCircle className="mr-3 h-5 w-5" />
                                    Payment Successful
                                </>
                            ) : (
                                <>
                                    <Shield className="mr-3 h-5 w-5" />
                                    Confirm Secure Payment
                                </>
                            )}
                        </Button>
                    ) : (
                        <Card className="border-destructive/50 bg-destructive/5">
                            <CardContent className="p-6 text-center space-y-4">
                                <div className="p-3 rounded-full bg-destructive/10 w-fit mx-auto">
                                    <AlertCircle className="h-6 w-6 text-destructive" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-lg">Insufficient Balance</h4>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Your current balance:</p>
                                        <Badge variant="outline" className="text-base px-4 py-2">
                                            {platformAssetBalance} {PLATFORM_ASSET.code}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        You need {requiredAssetBalance - platformAssetBalance} more {PLATFORM_ASSET.code}
                                    </p>
                                </div>
                                <RechargeLink />
                            </CardContent>
                        </Card>
                    )}
                </div>
            )
        }

        if (paymentMethod === "xlm") {
            const requiredXlmBalance = priceUSD + 2 + (hasTrust(code, issuer) ? 0 : 0.5)
            const currentBalance = Number.parseFloat(getXLMBalance() ?? "0")
            const isSufficientAssetBalance = currentBalance >= requiredXlmBalance

            return (
                <div className="space-y-6">
                    <Card className="border-0 shadow-lg bg-gradient-to-r from-background to-muted/30">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Wallet className="h-5 w-5 text-primary" />
                                XLM Payment
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center py-3 bg-primary/5 -mx-6 px-6 rounded-lg">
                                <span className="font-semibold text-xl">Total in XLM</span>
                                <span className="font-bold text-2xl text-primary">{requiredXlmBalance} XLM</span>
                            </div>
                        </CardContent>
                    </Card>

                    {isSufficientAssetBalance ? (
                        <Button
                            disabled={paymentSuccess || submitLoading}
                            size="lg"
                            className="w-full h-14 text-lg font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm"
                            onClick={onConfirmPayment}
                        >
                            {submitLoading ? (
                                <>
                                    <Loader className="mr-3 h-5 w-5 animate-spin" />
                                    Processing Payment...
                                </>
                            ) : paymentSuccess ? (
                                <>
                                    <CheckCircle className="mr-3 h-5 w-5" />
                                    Payment Successful
                                </>
                            ) : (
                                <>
                                    <Shield className="mr-3 h-5 w-5" />
                                    Confirm XLM Payment
                                </>
                            )}
                        </Button>
                    ) : (
                        <Card className="border-destructive/50 bg-destructive/5">
                            <CardContent className="p-6 text-center space-y-4">
                                <div className="p-3 rounded-full bg-destructive/10 w-fit mx-auto">
                                    <AlertCircle className="h-6 w-6 text-destructive" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-lg">Insufficient XLM Balance</h4>
                                    <p className="text-sm text-muted-foreground">Current balance: {getXLMBalance()} XLM</p>
                                    <p className="text-sm text-muted-foreground">Required: {requiredXlmBalance} XLM</p>
                                </div>
                                <RechargeLink />
                            </CardContent>
                        </Card>
                    )}
                </div>
            )
        }

        if (paymentMethod === "card") {
            return (
                <div className="space-y-6">
                    <Card className="border-0 shadow-lg bg-gradient-to-r from-background to-muted/30">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-primary" />
                                Credit Card Payment
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
                                <Shield className="h-5 w-5 text-primary" />
                                <p className="text-sm">Your payment is secured with industry-standard encryption.</p>
                            </div>
                        </CardContent>
                    </Card>
                    <BuyWithSquire marketId={item.id} xdr={xdrMutation.data} />
                </div>
            )
        }
    }

    return null
}

"use client"

import { useState, useEffect } from "react"
import { api } from "~/utils/api"
import { Alert, AlertDescription } from "~/components/shadcn/ui/alert"
import { Badge } from "~/components/shadcn/ui/badge"
import { Button } from "~/components/shadcn/ui/button"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

export default function PricingAssistant({
    priceBand,
    priceUSDC,
    onPriceBandChange,
    onPriceUSDCChange,
}: {
    priceBand: number
    priceUSDC: number
    onPriceBandChange: (value: number) => void
    onPriceUSDCChange: (value: number) => void
}) {
    const [bandRate, setBandRate] = useState<number | null>(null)
    const [usdcRate, setUsdcRate] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)

    const bandResponse = api.bounty.Bounty.getPlatformAsset.useQuery()
    const usdcResponse = api.bounty.Bounty.getAssetToUSDCRate.useQuery()
    const loading = bandResponse.isLoading || usdcResponse.isLoading
    useEffect(() => {
        if (bandResponse.data) {
            setBandRate(bandResponse.data)
        }
        if (usdcResponse.data) {
            setUsdcRate(usdcResponse.data)
        }
    }, [bandResponse.data, usdcResponse.data])

    // Calculate exchange rate: 1 BAND = X USDC
    const bandToUsdc = bandRate && usdcRate ? bandRate / usdcRate : null

    // Calculate expected USDC based on BAND price
    const calculatedUsdc = bandToUsdc && priceBand > 0 ? priceBand * bandToUsdc : null

    // Calculate difference
    const difference = calculatedUsdc && priceUSDC > 0 ? priceUSDC - calculatedUsdc : null
    const differencePercent =
        calculatedUsdc && priceUSDC > 0 ? ((priceUSDC - calculatedUsdc) / calculatedUsdc) * 100 : null

    const handleSyncFromBand = () => {
        if (calculatedUsdc) {
            onPriceUSDCChange(Number(calculatedUsdc.toFixed(2)))
        }
    }

    const handleSyncFromUsdc = () => {
        if (bandToUsdc && priceUSDC > 0) {
            const calculatedBand = priceUSDC / bandToUsdc
            onPriceBandChange(Number(calculatedBand.toFixed(2)))
        }
    }

    if (loading) {
        return (
            <Alert>
                <AlertDescription className="text-sm">Loading exchange rates...</AlertDescription>
            </Alert>
        )
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Pricing Assistant</h4>
                {bandToUsdc && (
                    <Badge variant="outline" className="text-xs">
                        1 BAND ≈ ${bandToUsdc.toFixed(4)} USDC
                    </Badge>
                )}
            </div>

            {priceBand > 0 && calculatedUsdc && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Expected USDC (from BAND):</span>
                        <div className="flex items-center gap-2">
                            <span className="font-medium">${calculatedUsdc.toFixed(2)}</span>
                            <Button type="button" variant="ghost" size="sm" onClick={handleSyncFromBand} className="h-6 px-2 text-xs">
                                Use
                            </Button>
                        </div>
                    </div>

                    {priceUSDC > 0 && difference !== null && (
                        <div className="flex items-center justify-between rounded-md bg-background/50 p-2 text-sm">
                            <span className="text-muted-foreground">Difference:</span>
                            <div className="flex items-center gap-1.5">
                                {Math.abs(difference) < 0.01 ? (
                                    <>
                                        <Minus className="h-3 w-3 text-muted-foreground" />
                                        <span className="font-medium text-muted-foreground">
                                            ${Math.abs(difference).toFixed(2)} (On target)
                                        </span>
                                    </>
                                ) : difference > 0 ? (
                                    <>
                                        <TrendingUp className="h-3 w-3 text-red-500" />
                                        <span className="font-medium text-red-600 dark:text-red-400">
                                            +${difference.toFixed(2)} ({differencePercent?.toFixed(1)}% higher)
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <TrendingDown className="h-3 w-3 text-green-500" />
                                        <span className="font-medium text-green-600 dark:text-green-400">
                                            ${difference.toFixed(2)} ({differencePercent?.toFixed(1)}% lower)
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {priceUSDC > 0 && bandToUsdc && (
                <div className="flex items-center justify-between border-t pt-2 text-sm">
                    <span className="text-muted-foreground">Expected BAND (from USDC):</span>
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{(priceUSDC / bandToUsdc).toFixed(2)} BAND</span>
                        <Button type="button" variant="ghost" size="sm" onClick={handleSyncFromUsdc} className="h-6 px-2 text-xs">
                            Use
                        </Button>
                    </div>
                </div>
            )}

            {(!priceBand || priceBand === 0) && (!priceUSDC || priceUSDC === 0) && (
                <p className="text-xs text-muted-foreground">Enter a BAND or USDC price to see conversion suggestions</p>
            )}
        </div>
    )
}

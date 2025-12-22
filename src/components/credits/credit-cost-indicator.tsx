"use client"

import { AlertCircle, Coins } from "lucide-react"
import { Alert, AlertDescription } from "~/components/shadcn/ui/alert"

interface CreditCostIndicatorProps {
  cost: number
  balance: number
  mediaType: "image" | "video"
}

export function CreditCostIndicator({ cost, balance, mediaType }: CreditCostIndicatorProps) {
  const hasEnough = balance >= cost
  const isLow = balance < cost * 3 && balance >= cost

  if (!hasEnough) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            Insufficient credits. This {mediaType} requires {cost} credits but you only have {balance}.
          </span>
        </AlertDescription>
      </Alert>
    )
  }

  if (isLow) {
    return (
      <Alert className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
        <Coins className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-900 dark:text-amber-200">
          This generation will use {cost} credits. You{"'"}ll have {balance - cost} credits remaining.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2">
      <Coins className="h-3.5 w-3.5" />
      This will use {cost} credits
    </div>
  )
}

"use client"

import { Coins, Plus } from "lucide-react"
import { Button } from "~/components/shadcn/ui/button"
import { Card } from "~/components/shadcn/ui/card"
import { Skeleton } from "~/components/shadcn/ui/skeleton"

interface CreditBalanceDisplayProps {
  balance?: number
  isLoading?: boolean
  onPurchaseClick: () => void
  variant?: "default" | "compact"
}

export function CreditBalanceDisplay({
  balance,
  isLoading,
  onPurchaseClick,
  variant = "default",
}: CreditBalanceDisplayProps) {
  if (variant === "compact") {
    return (
      <Button variant="outline" className="gap-2 h-9 px-3 bg-transparent" onClick={onPurchaseClick}>
        <Coins className="h-4 w-4 text-amber-500" />
        {isLoading ? (
          <Skeleton className="h-4 w-12" />
        ) : (
          <span className="font-semibold">{balance?.toLocaleString() ?? 0}</span>
        )}
      </Button>
    )
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 rounded-lg">
            <Coins className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Available Credits</p>
            {isLoading ? (
              <Skeleton className="h-7 w-20 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{balance?.toLocaleString() ?? 0}</p>
            )}
          </div>
        </div>
        <Button onClick={onPurchaseClick} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Buy Credits
        </Button>
      </div>
    </Card>
  )
}

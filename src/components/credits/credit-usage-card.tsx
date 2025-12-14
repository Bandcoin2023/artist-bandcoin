"use client"

import { TrendingUp, Zap, History } from "lucide-react"
import { Card } from "~/components/shadcn/ui/card"
import { Skeleton } from "~/components/shadcn/ui/skeleton"

interface CreditUsageCardProps {
  totalSpent?: number
  totalPurchased?: number
  generationsLast30Days?: number
  isLoading?: boolean
}

export function CreditUsageCard({
  totalSpent,
  totalPurchased,
  generationsLast30Days,
  isLoading,
}: CreditUsageCardProps) {
  const stats = [
    {
      label: "Total Purchased",
      value: totalPurchased?.toLocaleString() || "0",
      icon: TrendingUp,
      color: "text-green-600 dark:text-green-500",
      bgColor: "bg-green-100 dark:bg-green-950/30",
    },
    {
      label: "Total Used",
      value: totalSpent?.toLocaleString() || "0",
      icon: Zap,
      color: "text-blue-600 dark:text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-950/30",
    },
    {
      label: "Generations (30d)",
      value: generationsLast30Days?.toString() || "0",
      icon: History,
      color: "text-purple-600 dark:text-purple-500",
      bgColor: "bg-purple-100 dark:bg-purple-950/30",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", stat.bgColor)}>
              <stat.icon className={cn("h-5 w-5", stat.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground truncate">{stat.label}</p>
              {isLoading ? <Skeleton className="h-6 w-16 mt-1" /> : <p className="text-xl font-bold">{stat.value}</p>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, Coins, CreditCard, Download } from "lucide-react"
import { Card } from "~/components/shadcn/ui/card"
import { Badge } from "~/components/shadcn/ui/badge"
import { Button } from "~/components/shadcn/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/shadcn/ui/select"
import { Skeleton } from "~/components/shadcn/ui/skeleton"
import { cn } from "~/lib/utils"
import { api } from "~/utils/api"
import { useSession } from "next-auth/react"

export function CreditHistoryView() {
  const [typeFilter, setTypeFilter] = useState<"all" | "purchase" | "usage" | "bonus" | "refund">("all")
  const session = useSession()
  const { data, isLoading } = api.credit.getTransactions.useQuery({ limit: 50 },
    {
      enabled: session.status === "authenticated",
    }
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  const transactions = data?.transactions ?? []

  const filteredTransactions = transactions.filter((tx) => typeFilter === "all" || tx.type.toLowerCase() === typeFilter)

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "all" | "purchase" | "usage" | "bonus" | "refund")}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Transactions</SelectItem>
            <SelectItem value="purchase">Purchases</SelectItem>
            <SelectItem value="usage">Usage</SelectItem>
            <SelectItem value="bonus">Bonuses</SelectItem>
            <SelectItem value="refund">Refunds</SelectItem>
          </SelectContent>
        </Select>

        {/* <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Download className="h-4 w-4" />
          Export CSV
        </Button> */}
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {filteredTransactions.map((tx) => {
          const metadata = tx.metadata as Record<string, any> | null
          return (
            <Card key={tx.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    "p-2 rounded-lg flex-shrink-0",
                    tx.type === "PURCHASE" || tx.type === "BONUS"
                      ? "bg-green-100 dark:bg-green-950/30"
                      : tx.type === "USAGE"
                        ? "bg-blue-100 dark:bg-blue-950/30"
                        : "bg-orange-100 dark:bg-orange-950/30",
                  )}
                >
                  {tx.type === "PURCHASE" || tx.type === "BONUS" ? (
                    <ArrowDown className="h-5 w-5 text-green-600 dark:text-green-500" />
                  ) : (
                    <ArrowUp className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{tx.description}</p>
                      {metadata?.prompt && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{metadata.prompt}</p>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "font-semibold flex-shrink-0",
                        tx.type === "USAGE" && tx.amount > 0 ? "text-red-600 dark:text-red-500" : "text-green-600 dark:text-green-500",
                      )}
                    >
                      {tx.type === "USAGE" && tx.amount > 0 ? "-" : "+"}
                      {tx.amount}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(tx.createdAt).toLocaleString()}</span>

                    {tx.paymentMethod && (
                      <Badge variant="outline" className="gap-1">
                        {tx.paymentMethod === "BANDCOIN" ? (
                          <>
                            <Coins className="h-3 w-3" />
                            {tx.paymentAmount} BAND
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-3 w-3" />${tx.paymentAmount}
                          </>
                        )}
                      </Badge>
                    )}

                    {metadata?.model && (
                      <Badge variant="outline" className="text-xs">
                        {metadata.model}
                      </Badge>
                    )}

                    {tx.transactionHash && <button className="hover:underline text-primary">View Tx</button>}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {filteredTransactions.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium mb-2">No transactions found</p>
            <p className="text-sm">Try adjusting your filters or purchase credits to get started</p>
          </div>
        </Card>
      )}
    </div>
  )
}

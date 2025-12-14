"use client"

import { ArrowDown, ArrowUp, Coins, CreditCard } from "lucide-react"
import { Card } from "~/components/shadcn/ui/card"
import { Badge } from "~/components/shadcn/ui/badge"
import { Skeleton } from "~/components/shadcn/ui/skeleton"
import { api } from "~/utils/api"

export function CreditHistoryTable() {
  const { data, isLoading } = api.credit.getTransactions.useQuery({ limit: 10 })

  if (isLoading) {
    return (
      <Card className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </Card>
    )
  }

  const transactions = data?.transactions ?? []

  if (transactions.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-muted-foreground">
          <p className="text-lg font-medium mb-2">No transactions yet</p>
          <p className="text-sm">Purchase credits or generate content to see your transaction history</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-4 font-semibold text-sm">Type</th>
              <th className="text-left p-4 font-semibold text-sm">Description</th>
              <th className="text-left p-4 font-semibold text-sm hidden md:table-cell">Method</th>
              <th className="text-left p-4 font-semibold text-sm hidden sm:table-cell">Date</th>
              <th className="text-right p-4 font-semibold text-sm">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {tx.type === "PURCHASE" || tx.type === "BONUS" ? (
                      <div className="p-1.5 bg-green-100 dark:bg-green-950/30 rounded">
                        <ArrowDown className="h-4 w-4 text-green-600 dark:text-green-500" />
                      </div>
                    ) : (
                      <div className="p-1.5 bg-blue-100 dark:bg-blue-950/30 rounded">
                        <ArrowUp className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div>
                    <p className="font-medium text-sm">{tx.description}</p>
                    <p className="text-xs text-muted-foreground sm:hidden mt-1">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </td>
                <td className="p-4 hidden md:table-cell">
                  {tx.paymentMethod && (
                    <Badge variant="outline" className="gap-1">
                      {tx.paymentMethod === "BANDCOIN" ? (
                        <>
                          <Coins className="h-3 w-3" />
                          BANDCOIN
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-3 w-3" />
                          USDC
                        </>
                      )}
                    </Badge>
                  )}
                </td>
                <td className="p-4 text-sm text-muted-foreground hidden sm:table-cell">
                  {new Date(tx.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4 text-right">
                  <span
                    className={`font-semibold ${tx.amount > 0 ? "text-green-600 dark:text-green-500" : "text-blue-600 dark:text-blue-500"}`}
                  >
                    {tx.amount > 0 ? "+" : ""}
                    {tx.amount.toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

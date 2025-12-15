"use client"

import { useState } from "react"
import { CreditBalanceDisplay } from "~/components/credits/credit-balance-display"
import { CreditUsageCard } from "~/components/credits/credit-usage-card"
import { PurchaseCreditsModal } from "~/components/credits/purchase-credits-modal"
import { useCredits } from "~/hooks/use-credits"
import { CreditHistoryTable } from "~/components/credits/credit-history-table"
import { CreditPackagesGrid } from "~/components/credits/credit-packages-grid"

export function CreditsPanel() {
  const { balance, packages, usageStats, isLoading, refetch } = useCredits()
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Credits Management</h1>
          <p className="text-muted-foreground">Manage your AI generation credits and purchase history</p>
        </div>

        {/* Credit Balance */}
        <CreditBalanceDisplay
          balance={balance}
          isLoading={isLoading}
          onPurchaseClick={() => setShowPurchaseModal(true)}
        />

        {/* Usage Statistics */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Usage Overview</h2>
          <CreditUsageCard
            totalSpent={usageStats.totalSpent}
            totalPurchased={usageStats.totalPurchased}
            generationsLast30Days={usageStats.generationsLast30Days}
            isLoading={isLoading}
          />
        </div>



        {/* Transaction History */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
          <CreditHistoryTable />
        </div>
      </div>

      {/* Purchase Modal */}
      <PurchaseCreditsModal
        open={showPurchaseModal}
        onOpenChange={setShowPurchaseModal}
        packages={packages}
        onPurchaseSuccess={refetch}
      />
    </div>
  )
}

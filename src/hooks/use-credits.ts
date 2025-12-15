"use client"
import { useSession } from "next-auth/react"
import { api } from "~/utils/api"

export function useCredits() {
    const session = useSession()
    const { data: balanceData, isLoading: balanceLoading } = api.credit.getBalance.useQuery(undefined, {
        enabled: session.status === "authenticated",
    }
    )
    const { data: packagesData, isLoading: packagesLoading } = api.credit.getPackages.useQuery(undefined, {
        enabled: session.status === "authenticated",
    }
    )
    const { data: statsData, isLoading: statsLoading } = api.credit.getUsageStats.useQuery(undefined, {
        enabled: session.status === "authenticated",
    }
    )

    const balance = balanceData?.balance ?? 0
    const packages = packagesData?.packages ?? []
    const usageStats = {
        totalSpent: statsData?.totalCreditsSpent ?? 0,
        totalPurchased: statsData?.totalCreditsPurchased ?? 0,
        generationsLast30Days: statsData?.generationsLast30Days ?? 0,
    }

    const isLoading = balanceLoading || packagesLoading || statsLoading

    const utils = api.useUtils()
    const refetch = () => {
        void utils.credit.getBalance.invalidate()
        void utils.credit.getUsageStats.invalidate()
    }

    return {
        balance,
        packages,
        usageStats,
        isLoading,
        refetch,
    }
}

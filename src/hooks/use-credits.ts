"use client"
import { useSession } from "next-auth/react"
import { api } from "~/utils/api"

export function useCredits() {
    const { status } = useSession()
    const isAuthenticated = status === "authenticated"

    const queryOptions = { enabled: isAuthenticated, staleTime: 5 * 60 * 1000 }

    const { data: balanceData, isLoading: balanceLoading } = api.credit.getBalance.useQuery(undefined, queryOptions)
    const { data: packagesData, isLoading: packagesLoading } = api.credit.getPackages.useQuery(undefined, queryOptions)
    const { data: statsData, isLoading: statsLoading } = api.credit.getUsageStats.useQuery(undefined, queryOptions)

    const utils = api.useUtils()

    return {
        balance: balanceData?.balance ?? 0,
        packages: packagesData?.packages ?? [],
        usageStats: {
            totalSpent: statsData?.totalCreditsSpent ?? 0,
            totalPurchased: statsData?.totalCreditsPurchased ?? 0,
            generationsLast30Days: statsData?.generationsLast30Days ?? 0,
        },
        isLoading: balanceLoading || packagesLoading || statsLoading,
        refetch: () => {
            void utils.credit.getBalance.invalidate()
            void utils.credit.getUsageStats.invalidate()
        },
    }
}

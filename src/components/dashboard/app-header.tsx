"use client"

import { useState } from "react"
import { Menu, Sparkles, History, Settings, LogOut } from "lucide-react"
import { Button } from "~/components/shadcn/ui/button"
import { CreditBalanceDisplay } from "~/components/credits/credit-balance-display"
import { Sheet, SheetContent, SheetTrigger } from "~/components/shadcn/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/shadcn/ui/avatar"
import { PurchaseCreditsModal } from "~/components/credits/purchase-credits-modal"
import { useCredits } from "~/hooks/use-credits"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"



export function AppHeader() {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { balance, packages, isLoading, refetch } = useCredits()
  const path = usePathname()
  const router =
    console.log("Current Path:", path)
  const navItems = [
    { id: "generate" as const, label: "Generate", icon: Sparkles, href: "/ai-generation" },
    { id: "history" as const, label: "History", icon: History, href: "/ai-generation/history" },
    { id: "credits" as const, label: "Credits", icon: Settings, href: "/ai-generation/credits" },
  ]

  return (
    <>
      {/* Credits Display */}
      <CreditBalanceDisplay
        balance={balance}
        isLoading={isLoading}
        onPurchaseClick={() => setShowPurchaseModal(true)}
        variant="compact"
      />
    </>
  )
}

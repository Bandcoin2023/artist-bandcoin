"use client"

import { Check, Sparkles } from "lucide-react"
import { Card } from "~/components/shadcn/ui/card"
import { Button } from "~/components/shadcn/ui/button"
import { Badge } from "~/components/shadcn/ui/badge"
import { cn } from "~/lib/utils"

interface CreditPackage {
  id: string
  name: string
  credits: number
  priceUSD: number
  priceBand: number
  priceUSDC: number
  bonus: number
  isPopular: boolean
  description?: string | null
}

interface CreditPackagesGridProps {
  packages: CreditPackage[]
  onSelect: (packageId: string) => void
}

export function CreditPackagesGrid({ packages, onSelect }: CreditPackagesGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {packages.map((pkg) => (
        <Card
          key={pkg.id}
          className={cn(
            "p-5 relative transition-all hover:shadow-lg",
            pkg.isPopular ? "border-amber-500 border-2" : "border-border",
          )}
        >
          {pkg.isPopular && (
            <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500">
              <Sparkles className="h-3 w-3 mr-1" />
              Popular
            </Badge>
          )}

          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-xl">{pkg.name}</h3>
              {pkg.description && <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>}
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{pkg.credits.toLocaleString()}</span>
                <span className="text-muted-foreground">credits</span>
              </div>
              {pkg.bonus > 0 && (
                <div className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-500 mt-2">
                  <Sparkles className="h-4 w-4" />+{pkg.bonus} bonus
                </div>
              )}
            </div>

            <div className="space-y-2 pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">BANDCOIN:</span>
                <span className="font-semibold">{pkg.priceBand}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">USDC:</span>
                <span className="font-semibold">${pkg.priceUSDC}</span>
              </div>
            </div>

            <Button className="w-full gap-2" onClick={() => onSelect(pkg.id)}>
              <Check className="h-4 w-4" />
              Select Package
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}

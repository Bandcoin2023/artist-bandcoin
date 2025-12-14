"use client"

import { useState } from "react"
import { Check, Coins, CreditCard, Loader2, Sparkles } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/shadcn/ui/dialog"
import { Button } from "~/components/shadcn/ui/button"
import { Card } from "~/components/shadcn/ui/card"
import { Badge } from "~/components/shadcn/ui/badge"
import { RadioGroup, RadioGroupItem } from "~/components/shadcn/ui/radio-group"
import { Label } from "~/components/shadcn/ui/label"
import { Input } from "~/components/shadcn/ui/input"
import { useToast } from "~/hooks/use-toast"
import { cn } from "~/lib/utils"
import { api } from "~/utils/api"

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

interface PurchaseCreditsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  packages: CreditPackage[]
  onPurchaseSuccess: () => void
}

type PaymentMethod = "BANDCOIN" | "USDC"

export function PurchaseCreditsModal({ open, onOpenChange, packages, onPurchaseSuccess }: PurchaseCreditsModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<string>()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BANDCOIN")
  const [transactionHash, setTransactionHash] = useState("")
  const { toast } = useToast()

  const purchaseMutation = api.credit.purchaseCredits.useMutation({
    onSuccess: (data) => {
      const selectedPkg = packages.find((p) => p.id === selectedPackage)
      toast({
        title: "Purchase successful!",
        description: `${selectedPkg?.credits} credits have been added to your account`,
      })
      onPurchaseSuccess()
      onOpenChange(false)
      setTransactionHash("")
      setSelectedPackage(undefined)
    },
    onError: (error) => {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const selectedPkg = packages.find((p) => p.id === selectedPackage)
  const price = selectedPkg ? (paymentMethod === "BANDCOIN" ? selectedPkg.priceBand : selectedPkg.priceUSDC) : 0

  const handlePurchase = async () => {
    if (!selectedPackage || !transactionHash.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a package and enter transaction hash",
        variant: "destructive",
      })
      return
    }

    purchaseMutation.mutate({
      packageId: selectedPackage,
      paymentMethod,
      transactionHash,
      paymentAmount: price,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Purchase AI Credits</DialogTitle>
          <DialogDescription>Choose a package and complete payment to add credits to your account</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Credit Packages */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Select a Package</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={cn(
                    "p-4 cursor-pointer transition-all hover:shadow-md relative",
                    selectedPackage === pkg.id
                      ? "border-primary border-2 bg-primary/5"
                      : "border-border hover:border-primary/50",
                  )}
                  onClick={() => setSelectedPackage(pkg.id)}
                >
                  {pkg.isPopular && (
                    <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{pkg.name}</h3>
                      {pkg.description && <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>}
                    </div>
                    {selectedPackage === pkg.id && (
                      <div className="p-1 bg-primary rounded-full">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{pkg.credits.toLocaleString()}</span>
                      <span className="text-muted-foreground">credits</span>
                    </div>
                    {pkg.bonus > 0 && (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-500">
                        <Sparkles className="h-4 w-4" />+{pkg.bonus} bonus credits
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">BANDCOIN:</span>
                        <span className="font-semibold">{pkg.priceBand}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-muted-foreground">USDC:</span>
                        <span className="font-semibold">${pkg.priceUSDC}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {selectedPackage && (
            <>
              {/* Payment Method */}
              <div>
                <Label className="text-base font-semibold mb-3 block">Payment Method</Label>
                <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                  <div className="grid grid-cols-2 gap-3">
                    <Card
                      className={cn(
                        "p-4 cursor-pointer transition-all",
                        paymentMethod === "BANDCOIN" ? "border-primary border-2" : "border-border",
                      )}
                      onClick={() => setPaymentMethod("BANDCOIN")}
                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="BANDCOIN" id="bandcoin" />
                        <Label htmlFor="bandcoin" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Coins className="h-5 w-5 text-amber-500" />
                          <div>
                            <div className="font-semibold">BANDCOIN</div>
                            <div className="text-sm text-muted-foreground">{selectedPkg?.priceBand} BAND</div>
                          </div>
                        </Label>
                      </div>
                    </Card>

                    <Card
                      className={cn(
                        "p-4 cursor-pointer transition-all",
                        paymentMethod === "USDC" ? "border-primary border-2" : "border-border",
                      )}
                      onClick={() => setPaymentMethod("USDC")}
                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="USDC" id="usdc" />
                        <Label htmlFor="usdc" className="flex items-center gap-2 cursor-pointer flex-1">
                          <CreditCard className="h-5 w-5 text-blue-500" />
                          <div>
                            <div className="font-semibold">USDC</div>
                            <div className="text-sm text-muted-foreground">${selectedPkg?.priceUSDC}</div>
                          </div>
                        </Label>
                      </div>
                    </Card>
                  </div>
                </RadioGroup>
              </div>

              {/* Transaction Hash */}
              <div>
                <Label htmlFor="txHash" className="text-base font-semibold mb-2 block">
                  Transaction Hash
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Complete the payment on Stellar network and paste the transaction hash below
                </p>
                <Input
                  id="txHash"
                  placeholder="Enter transaction hash"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              {/* Summary */}
              <Card className="p-4 bg-muted/50">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Package:</span>
                    <span className="font-semibold">{selectedPkg?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Credits:</span>
                    <span className="font-semibold">
                      {selectedPkg?.credits.toLocaleString()}
                      {selectedPkg && selectedPkg.bonus > 0 && (
                        <span className="text-green-600 dark:text-green-500 ml-1">+{selectedPkg.bonus}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="font-semibold">Total Price:</span>
                    <span className="text-xl font-bold">
                      {paymentMethod === "BANDCOIN" ? `${price} BAND` : `$${price}`}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => onOpenChange(false)}
                  disabled={purchaseMutation.isLoading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePurchase}
                  disabled={!transactionHash.trim() || purchaseMutation.isLoading}
                >
                  {purchaseMutation.isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Complete Purchase
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Check, Coins, CreditCard, Loader2, Sparkles, ArrowLeft } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/shadcn/ui/dialog"
import { Button } from "~/components/shadcn/ui/button"
import { Card } from "~/components/shadcn/ui/card"
import { Badge } from "~/components/shadcn/ui/badge"
import { RadioGroup, RadioGroupItem } from "~/components/shadcn/ui/radio-group"
import { Label } from "~/components/shadcn/ui/label"
import { Input } from "~/components/shadcn/ui/input"
import { cn } from "~/lib/utils"
import { api } from "~/utils/api"
import { PaymentMethod } from "../payment/payment-process"
import { clientsign, WalletType } from "package/connect_wallet";
import { useSession } from "next-auth/react"
import { clientSelect } from "~/lib/stellar/fan/utils"
import { PLATFORM_ASSET } from "~/lib/stellar/constant"
import toast from "react-hot-toast"
import useNeedSign from "~/lib/hook"

interface CreditPackage {
  id: string
  name: string
  credits: number
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


type Step = "select-package" | "confirmation"

export function PurchaseCreditsModal({ open, onOpenChange, packages, onPurchaseSuccess }: PurchaseCreditsModalProps) {
  const [step, setStep] = useState<Step>("select-package")
  const [selectedPackage, setSelectedPackage] = useState<string>()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("asset")
  const [transactionHash, setTransactionHash] = useState("")
  const [xdr, setXdr] = useState<string>()
  const session = useSession()
  const { needSign } = useNeedSign()
  const purchaseMutation = api.credit.purchaseCredits.useMutation({
    onSuccess: (data) => {
      const selectedPkg = packages.find((p) => p.id === selectedPackage)
      toast.success(`Successfully purchased ${selectedPkg?.name} for ${paymentMethod === "asset" ? `${selectedPkg?.priceBand} ${PLATFORM_ASSET.code}` : `$${selectedPkg?.priceUSDC}`}`)
      onPurchaseSuccess()
      handleClose()
    },
    onError: (error) => {
      toast.error(`Purchase failed: ${error.message}`)
    },
  })

  const xdrMutation = api.credit.generatePaymentXDR.useMutation()

  const selectedPkg = packages.find((p) => p.id === selectedPackage)
  const price = selectedPkg ? (paymentMethod === "asset" ? selectedPkg.priceBand : selectedPkg.priceUSDC) : 0

  const handleContinueToConfirmation = () => {
    if (!selectedPackage) {
      toast.error("Please select a package")
      return
    }
    setStep("confirmation")
  }

  const handleBackToSelection = () => {
    setStep("select-package")
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setStep("select-package")
      setTransactionHash("")
      setSelectedPackage(undefined)
      setPaymentMethod("asset")
      setXdr(undefined)
    }, 200)
  }

  const handlePurchase = async () => {
    console.log("handlePurchase called");
    if (!xdrMutation.data) {
      toast.error("Payment is not ready yet. Please try again.")
      return;
    }
    clientsign({
      presignedxdr: xdrMutation.data,
      pubkey: session.data?.user.id,
      walletType: session.data?.user.walletType,
      test: clientSelect(),
    })
      .then((res) => {
        if (res) {
          purchaseMutation.mutate({
            packageId: selectedPackage!,
            method: paymentMethod,
            paymentAmount: price,
          })
        }
      })
      .catch((e) => console.log(e))
      .finally(() => {
        console.log("completed");
      });


  }

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method)
    if (selectedPackage) {
      const toastId = toast.loading("Preparing payment...")
      xdrMutation.mutate({
        packageId: selectedPackage,
        method: method,
        paymentAmount: price,
        signWith: needSign()
      }, {
        onSuccess: (data) => {
          toast.dismiss(toastId)
          setXdr(data)
        },
        onError: (error) => {
          setXdr(undefined)

          toast.dismiss(toastId)
          toast.error(`Failed to prepare payment: ${error.message}`)
        }
      })
    }
  }
  useEffect(() => {
    if (step === "confirmation" && selectedPackage) {
      const toastId = toast.loading("Preparing payment...")
      xdrMutation.mutate({
        packageId: selectedPackage,
        method: paymentMethod,
        paymentAmount: price,
      }, {
        onSuccess: (data) => {
          toast.dismiss(toastId)
          setXdr(data)
        },
        onError: (error) => {
          setXdr(undefined)
          toast.dismiss(toastId)
          toast.error(`Failed to prepare payment: ${error.message}`)
        }
      })
    }
  }, [step])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {step === "select-package" ? "Purchase AI Credits" : "Confirm Your Purchase"}
          </DialogTitle>
          <DialogDescription>
            {step === "select-package"
              ? "Choose a package to add credits to your account"
              : "Complete payment to add credits to your account"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {step === "select-package" && (
            <>
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

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={handleClose}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleContinueToConfirmation} disabled={!selectedPackage}>
                  Continue to Payment
                </Button>
              </div>
            </>
          )}

          {step === "confirmation" && selectedPkg && (
            <>
              <Card className="p-4 bg-muted/50 border-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <span className="text-sm text-muted-foreground">Selected Package</span>
                    <Badge variant="secondary" className="font-semibold">
                      {selectedPkg.name}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Credits:</span>
                    <span className="font-semibold text-lg">
                      {selectedPkg.credits.toLocaleString()}
                      {selectedPkg.bonus > 0 && (
                        <span className="text-green-600 dark:text-green-500 ml-1 text-sm">+{selectedPkg.bonus}</span>
                      )}
                    </span>
                  </div>
                </div>
              </Card>

              <div>
                <Label className="text-base font-semibold mb-3 block">Payment Method</Label>
                <RadioGroup
                  value={paymentMethod}
                  disabled={xdrMutation.isLoading || purchaseMutation.isLoading}
                  onValueChange={(value) => handlePaymentMethodChange(value as PaymentMethod)}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Card
                      className={cn(
                        "p-4 cursor-pointer transition-all",
                        paymentMethod === "asset" ? "border-primary border-2" : "border-border",
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="asset" id="asset" />
                        <Label htmlFor="asset" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Coins className="h-5 w-5 text-yellow-500" />
                          <div className="font-semibold">{selectedPkg.priceBand} {PLATFORM_ASSET.code}</div>

                        </Label>
                      </div>
                    </Card>

                    <Card
                      className={cn(
                        "p-4 cursor-pointer transition-all",
                        paymentMethod === "usdc" ? "border-primary border-2" : "border-border",
                      )}

                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="usdc" id="usdc" />
                        <Label htmlFor="usdc" className="flex items-center gap-2 cursor-pointer flex-1">
                          <CreditCard className="h-5 w-5 text-blue-500" />

                          <div className="font-semibold">${selectedPkg.priceUSDC} USDC</div>


                        </Label>
                      </div>
                    </Card>

                    {/* <Card
                      className={cn(
                        "p-4 cursor-pointer transition-all",
                        paymentMethod === "card" ? "border-primary border-2" : "border-border",
                      )}
                      onClick={() => handlePaymentMethodChange("card")}
                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="CARD" id="card" />
                        <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                          <CreditCard className="h-5 w-5 text-purple-500" />
                          <div>
                            <div className="font-semibold">Card</div>
                            <div className="text-sm text-muted-foreground">${selectedPkg.priceUSD}</div>
                          </div>
                        </Label>
                      </div>
                    </Card> */}
                  </div>
                </RadioGroup>
              </div>


              {/* {paymentMethod === "card" ? (
                <div className="space-y-4">
                  <Card className="p-4 bg-muted/50">
                    <p className="text-sm text-center font-medium mb-2">Pay with Credit Card</p>
                    <p className="text-xs text-muted-foreground text-center">Secure payment powered by Square</p>
                  </Card>

                  {xdrMutation.isLoading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2 text-sm text-muted-foreground">Preparing payment...</span>
                    </div>
                  )}

                  {xdr && selectedPackage && <BuyWithSquire xdr={xdr} marketId={Number.parseInt(selectedPackage)} />}

                  <Card className="p-4 bg-primary/5 border-primary/20">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">Total Price:</span>
                      <span className="text-2xl font-bold">${selectedPkg.priceUSD}</span>
                    </div>
                  </Card>

                  <Button variant="outline" className="w-full bg-transparent" onClick={handleBackToSelection}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Package Selection
                  </Button>
                </div>
              ) : (
                <> */}

              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Total Price:</span>
                  <span className="text-2xl font-bold">
                    {paymentMethod === "asset" ? `${price} ${PLATFORM_ASSET.code}` : `$${price}`}
                  </span>
                </div>
              </Card>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={handleBackToSelection}
                  disabled={purchaseMutation.isLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePurchase}
                  disabled={purchaseMutation.isLoading || !xdr}
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
          {/* </>
          )} */}
        </div>
      </DialogContent>
    </Dialog>
  )
}

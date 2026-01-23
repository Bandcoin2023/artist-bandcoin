import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "~/components/shadcn/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/shadcn/ui/dialog";
import { RadioGroup, RadioGroupItem } from "~/components/shadcn/ui/radio-group";
import { Label } from "~/components/shadcn/ui/label";
import { Coins, DollarSign, Loader2 } from "lucide-react";
import { CREATOR_TERM } from "~/utils/term";
import { PLATFORM_ASSET } from "~/lib/stellar/constant";

import { create } from "zustand";
import { env } from "~/env";
import { PaymentMethod, PaymentMethodEnum } from "../payment/payment-process";
import Image from "next/image";

interface PaymentMethodStore {
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  conversionInfo?: ConversionInfo;
  setConversionInfo: (info?: ConversionInfo) => void;
}

export interface ConversionInfo {
  isConverting: boolean;
  fromAsset: string;
  toAsset: string;
  fromAmount: number;
  toAmount: number;
  trustlineCost?: number;
  xlmShortage?: number;
  message: string;
}

export const usePaymentMethodStore = create<PaymentMethodStore>((set) => ({
  paymentMethod: "asset",
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  conversionInfo: undefined,
  setConversionInfo: (info) => set({ conversionInfo: info }),
}));

export interface CostBreakdownItem {
  label: string;
  amount: number;
  type: "fee" | "cost" | "total" | "subtotal";
  highlighted?: boolean;
}


export function PaymentChoose({
  XLM_EQUIVALENT,
  handleConfirm,
  loading,
  requiredToken,
  trigger,
  beforeTrigger,
  costBreakdown,
  USDC_EQUIVALENT,
  conversionInfo,
  showAlert,
  alertMessage,
}: {
  requiredToken?: number;
  XLM_EQUIVALENT?: number;
  handleConfirm: () => void;
  loading: boolean;
  trigger: React.ReactNode;
  beforeTrigger?: () => Promise<boolean>;
  costBreakdown?: CostBreakdownItem[];
  USDC_EQUIVALENT?: number;
  conversionInfo?: ConversionInfo;
  showAlert?: boolean;
  alertMessage?: string;
}) {
  const { paymentMethod, setPaymentMethod, isOpen, setIsOpen } =
    usePaymentMethodStore();

  function handleOpen(open: boolean): void {
    if (beforeTrigger) {
      beforeTrigger().then((result) => {
        if (result) {
          setIsOpen(open);
        }
      });
    } else {
      setIsOpen(open);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
        className="sm:max-w-[425px]"
      >
        <DialogHeader>
          <DialogTitle className="mb-4 text-center text-2xl font-bold">
            Choose Payment Method
          </DialogTitle>
        </DialogHeader>

        {/* Alert for inactive account or conversion warnings */}
        {showAlert && alertMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">{alertMessage}</p>
            </div>
          </div>
        )}

        {/* Conversion info display */}
        {conversionInfo && conversionInfo.isConverting && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">Conversion Required</p>
            <div className="space-y-1 text-sm text-blue-800">
              <div className="flex justify-between">
                <span>Converting from:</span>
                <span className="font-semibold">{conversionInfo.fromAmount} {conversionInfo.fromAsset}</span>
              </div>
              <div className="flex justify-between">
                <span>Converting to:</span>
                <span className="font-semibold">{conversionInfo.toAmount.toFixed(7)} {conversionInfo.toAsset}</span>
              </div>
              {conversionInfo.trustlineCost && (
                <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                  <span>Trust cost:</span>
                  <span className="font-semibold">{conversionInfo.trustlineCost} XLM</span>
                </div>
              )}
              {conversionInfo.xlmShortage && conversionInfo.xlmShortage > 0 && (
                <div className="flex justify-between text-orange-700 border-t border-blue-200 pt-1 mt-1">
                  <span>XLM shortage:</span>
                  <span className="font-semibold">{conversionInfo.xlmShortage.toFixed(7)} XLM</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="py-4">
          <RadioGroup
            value={paymentMethod}
            onValueChange={setPaymentMethod}
            className="space-y-4"
          >
            {
              requiredToken && (
                <div className="flex items-center space-x-2 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50">
                  <RadioGroupItem
                    value={PaymentMethodEnum.enum.asset}
                    id={PaymentMethodEnum.enum.asset}
                    className=""
                  />
                  <Label
                    htmlFor={PaymentMethodEnum.enum.asset}
                    className="flex flex-1 cursor-pointer items-center"
                  >
                    {
                      PLATFORM_ASSET.code.toLocaleLowerCase() === "action" ? <Image
                        alt="action"
                        height={24}
                        width={24}
                        src={"/images/action/logo.png"} className="mr-3 h-6 w-6" /> : <Coins className="mr-3 h-6 w-6" />
                    }
                    <div className="flex-grow">
                      <div className="font-medium">
                        Pay with {PLATFORM_ASSET.code}
                      </div>
                      <div className="text-sm text-gray-500">
                        Use platform tokens
                      </div>
                    </div>
                    <div className="text-right font-medium">
                      {requiredToken.toFixed(0)} {PLATFORM_ASSET.code}
                    </div>
                  </Label>
                </div>
              )
            }
            {
              XLM_EQUIVALENT && (
                <div className="flex items-center space-x-2 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50">
                  <RadioGroupItem
                    value={PaymentMethodEnum.enum.xlm}
                    id={PaymentMethodEnum.enum.xlm}
                    className=""
                  />
                  <Label
                    htmlFor={PaymentMethodEnum.enum.xlm}
                    className="flex flex-1 cursor-pointer items-center"
                  >
                    <DollarSign className="mr-3 h-6 w-6" />
                    <div className="flex-grow">
                      <div className="font-medium">Pay with XLM</div>
                      <div className="text-sm text-gray-500">
                        Use Stellar Lumens
                      </div>
                    </div>
                    <div className="text-right font-medium">
                      {XLM_EQUIVALENT?.toFixed(0)} XLM
                    </div>
                  </Label>
                </div>
              )
            }
            {
              USDC_EQUIVALENT && (
                <div className="flex items-center space-x-2 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50">
                  <RadioGroupItem
                    value={PaymentMethodEnum.enum.usdc}
                    id={PaymentMethodEnum.enum.usdc}
                    className=""
                  />
                  <Label
                    htmlFor={PaymentMethodEnum.enum.usdc}
                    className="flex flex-1 cursor-pointer items-center"
                  >
                    <DollarSign className="mr-3 h-6 w-6" />
                    <div className="flex-grow">
                      <div className="font-medium">Pay with USDC</div>
                      <div className="text-sm text-gray-500">
                        Use Stellar Lumens
                      </div>
                    </div>
                    <div className="text-right font-medium">
                      {USDC_EQUIVALENT.toFixed(0)} USDC
                    </div>
                  </Label>
                </div>
              )
            }
          </RadioGroup>
        </div>

        <div className="mt-6 space-y-3 border-t border-gray-200 pt-4">
          {costBreakdown ? costBreakdown.map((item, index) => (
            <div
              key={index}
              className={`flex justify-between ${item.highlighted ? 'font-semibold' : ''
                } ${item.type === 'total' ? 'text-lg pt-2 border-t border-gray-200' : 'text-sm'}`}
            >
              <span className={item.type === 'fee' ? 'text-gray-500' : ''}>
                {item.label}
              </span>
              <span>
                {item.amount.toFixed(7)} {paymentMethod === "asset" ? PLATFORM_ASSET.code :
                  paymentMethod === "xlm" ? "XLM" : paymentMethod === "usdc" ? "USDC" : ""
                }
              </span>
            </div>
          )) : <></>}
        </div>
        <div className="mt-4 text-center text-sm text-gray-500">
          Your account will be charged{" "}
          {paymentMethod === "asset"
            ? `${requiredToken} ${PLATFORM_ASSET.code}`
            : paymentMethod === "xlm"
              ? `${XLM_EQUIVALENT} XLM`
              : `${USDC_EQUIVALENT} USDC`}
          to perform this action.
        </div>
        <DialogFooter className=" flex flex-row items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className=" w-full"
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading} className="w-full  shadow-sm shadow-foreground">
            {loading && <Loader2 className="mr-2 animate-spin" />}
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
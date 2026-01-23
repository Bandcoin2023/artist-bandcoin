import {
    validatePlatformAssetPayment,
    validateUSDCPayment,
    validateXLMPayment,
    PaymentValidationResult,
} from "./payment-conversion";
import { validatePaymentMethod } from "./account-validation";
import type { ConversionInfo } from "~/components/common/payment-options";
import { PaymentMethod } from "~/components/payment/payment-process";


/**
 * Comprehensive payment handler that manages all payment validation and UI state
 */
export class PaymentHandler {
    private userPubKey: string;

    constructor(userPubKey: string) {
        this.userPubKey = userPubKey;
    }

    /**
     * Validate and prepare payment with full UI state
     */
    async preparePayment(
        method: PaymentMethod,
        amount: number
    ): Promise<{
        canProceed: boolean;
        showAlert: boolean;
        alertMessage?: string;
        conversionInfo?: ConversionInfo;
        validationResult: PaymentValidationResult;
    }> {
        let validationResult: PaymentValidationResult;

        if (method === "asset") {
            validationResult = await validatePlatformAssetPayment(
                this.userPubKey,
                amount
            );
        } else if (method === "usdc") {
            validationResult = await validateUSDCPayment(this.userPubKey, amount);
        } else {
            validationResult = await validateXLMPayment(this.userPubKey, amount);
        }

        // Handle response based on validation status
        if (validationResult.status === "success") {
            return {
                canProceed: true,
                showAlert: false,
                validationResult,
            };
        }

        if (validationResult.status === "account_inactive") {
            return {
                canProceed: false,
                showAlert: true,
                alertMessage: validationResult.message,
                validationResult,
            };
        }

        if (validationResult.status === "requires_conversion") {
            const conversionInfo: ConversionInfo = {
                isConverting: true,
                fromAsset: validationResult.xlmShortage ? "xlm" : method === "asset" ? "platform_asset" : "usdc",
                toAsset: method === "asset" ? "platform_asset" : method === "usdc" ? "usdc" : "xlm",
                fromAmount: validationResult.xlmShortage || validationResult.totalCost || 0,
                toAmount: validationResult.convertedAmount || amount,
                trustlineCost: validationResult.trustlineCost,
                xlmShortage: validationResult.xlmShortage,
                message: validationResult.message,
            };

            return {
                canProceed: validationResult.xlmShortage === undefined || validationResult.xlmShortage === 0,
                showAlert: !!validationResult.xlmShortage,
                alertMessage: validationResult.xlmShortage
                    ? `Insufficient XLM by ${validationResult.xlmShortage.toFixed(7)} XLM`
                    : undefined,
                conversionInfo,
                validationResult,
            };
        }

        // All other error cases
        return {
            canProceed: false,
            showAlert: true,
            alertMessage: validationResult.message,
            validationResult,
        };
    }

    /**
     * Get payment amounts for all available methods
     */
    async getPaymentAmounts(amountInUSD: number): Promise<{
        platformAssetAmount?: number;
        usdcAmount?: number;
        xlmAmount?: number;
    }> {
        const validation = await validatePaymentMethod(
            this.userPubKey,
            "asset",
            amountInUSD
        );

        let platformAssetAmount: number | undefined;
        let usdcAmount: number | undefined;
        let xlmAmount: number | undefined;

        if (validation.canPay) {
            platformAssetAmount = amountInUSD;
        }

        try {
            const usdcValidation = await validatePaymentMethod(
                this.userPubKey,
                "usdc",
                amountInUSD
            );
            if (usdcValidation.canPay) {
                usdcAmount = amountInUSD;
            }
        } catch (error) {
            console.warn("USDC validation failed:", error);
        }

        try {
            const xlmValidation = await validatePaymentMethod(
                this.userPubKey,
                "xlm",
                amountInUSD
            );
            if (xlmValidation.canPay) {
                xlmAmount = amountInUSD;
            }
        } catch (error) {
            console.warn("XLM validation failed:", error);
        }

        return {
            platformAssetAmount,
            usdcAmount,
            xlmAmount,
        };
    }

    /**
     * Check if payment requires conversion (for UI updates)
     */
    async needsConversion(method: PaymentMethod, amount: number): Promise<boolean> {
        const validation = await validatePaymentMethod(
            this.userPubKey,
            method,
            amount
        );
        return validation.requiresConversion;
    }

    /**
     * Get detailed conversion costs
     */
    async getConversionCosts(
        method: PaymentMethod,
        amount: number
    ): Promise<{
        xlmNeeded?: number;
        trustCost?: number;
        assetCost?: number;
        totalXLMRequired?: number;
    }> {
        const validation = await validatePaymentMethod(
            this.userPubKey,
            method,
            amount
        );

        return {
            xlmNeeded: validation.xlmNeeded,
            trustCost: 0.5, // Standard trustline cost
        };
    }
}

/**
 * Quick validation helper for components
 */
export async function quickValidatePayment(
    userPubKey: string,
    method: PaymentMethod,
    amount: number
): Promise<boolean> {
    try {
        const validation = await validatePaymentMethod(userPubKey, method, amount);
        return validation.canPay;
    } catch (error) {
        console.error("Payment validation failed:", error);
        return false;
    }
}

/**
 * Get all payment method details for dropdown/selection UI
 */
export async function getPaymentMethodDetails(
    userPubKey: string,
    amount: number
): Promise<
    Array<{
        method: PaymentMethod;
        available: boolean;
        requiresConversion: boolean;
        displayName: string;
        icon: string;
        costMessage?: string;
    }>
> {
    const methods: Array<{
        method: PaymentMethod;
        available: boolean;
        requiresConversion: boolean;
        displayName: string;
        icon: string;
        costMessage?: string;
    }> = [];

    // Check PLATFORM_ASSET
    try {
        const assetValidation = await validatePaymentMethod(
            userPubKey,
            "asset",
            amount
        );
        methods.push({
            method: "asset",
            available: assetValidation.canPay,
            requiresConversion: assetValidation.requiresConversion,
            displayName: "Bandcoin",
            icon: "coins",
            costMessage: assetValidation.message,
        });
    } catch (error) {
        console.warn("Asset validation error:", error);
    }

    // Check USDC
    try {
        const usdcValidation = await validatePaymentMethod(
            userPubKey,
            "usdc",
            amount
        );
        methods.push({
            method: "usdc",
            available: usdcValidation.canPay,
            requiresConversion: usdcValidation.requiresConversion,
            displayName: "USDC",
            icon: "dollar-sign",
            costMessage: usdcValidation.message,
        });
    } catch (error) {
        console.warn("USDC validation error:", error);
    }

    // Check XLM
    try {
        const xlmValidation = await validatePaymentMethod(
            userPubKey,
            "xlm",
            amount
        );
        methods.push({
            method: "xlm",
            available: xlmValidation.canPay,
            requiresConversion: xlmValidation.requiresConversion,
            displayName: "Stellar Lumens",
            icon: "dollar-sign",
            costMessage: xlmValidation.message,
        });
    } catch (error) {
        console.warn("XLM validation error:", error);
    }

    return methods;
}

import { Asset } from "@stellar/stellar-sdk";
import {
    validatePlatformAssetPayment,
    validateUSDCPayment,
    validateXLMPayment,
    convertXLMToPlatformAsset,
    convertXLMToUSDC,
    convertPlatformAssetToXLM,
} from "../payment-conversion";
import {
    getAssetBalance,
    getNativeBalance,
    checkTrustline,
    addTrustlineSetup,
} from "../helper";
import { PLATFORM_ASSET } from "../constant";
import { USDC_ASSET_CODE, USDC_ISSUER } from "~/lib/usdc";
import {
    getXLMPrice,
    getPlatformAssetPrice,
    getAssetToUSDCRate,
} from "../fan/get_token_price";
import { PaymentMethod } from "~/components/payment/payment-process";



export interface TransactionConversionContext {
    paymentMethod: PaymentMethod;
    requiredAmount: number;
    userPubKey: string;
    conversionNeeded: boolean;
    convertedFromXLM?: number;
    convertedFromAsset?: string;
    trustlineCostXLM?: number;
}

export interface BountyPaymentResult {
    success: boolean;
    requiresConversion: boolean;
    conversionContext?: TransactionConversionContext;
    message: string;
    xdrTransaction?: string;
    error?: string;
}

/**
 * Validate bounty payment with automatic conversion handling
 */
export async function validateBountyPayment(
    paymentMethod: PaymentMethod,
    amount: number,
    userPubKey: string
): Promise<BountyPaymentResult> {
    try {
        if (paymentMethod === "asset") {
            const validation = await validatePlatformAssetPayment(userPubKey, amount);

            if (validation.status === "success") {
                return {
                    success: true,
                    requiresConversion: false,
                    message: "Payment validation successful",
                };
            }

            if (validation.status === "account_inactive") {
                return {
                    success: false,
                    requiresConversion: false,
                    message: validation.message,
                    error: "ACCOUNT_INACTIVE",
                };
            }

            if (validation.status === "requires_conversion") {
                const xlmNeeded = validation.totalCost ?? 0;
                const xlmBalance = await getNativeBalance(userPubKey);
                const xlmToConvert = xlmNeeded - xlmBalance;

                return {
                    success: true,
                    requiresConversion: true,
                    conversionContext: {
                        paymentMethod: "asset",
                        requiredAmount: amount,
                        userPubKey,
                        conversionNeeded: true,
                        convertedFromXLM: xlmToConvert,
                        convertedFromAsset: "xlm",
                        trustlineCostXLM: validation.trustlineCost,
                    },
                    message: `Conversion needed: ${xlmToConvert.toFixed(7)} XLM to ${PLATFORM_ASSET.code}`,
                };
            }

            return {
                success: false,
                requiresConversion: false,
                message: validation.message,
                error: validation.status,
            };
        } else if (paymentMethod === "usdc") {
            const validation = await validateUSDCPayment(userPubKey, amount);

            if (validation.status === "success") {
                return {
                    success: true,
                    requiresConversion: false,
                    message: "Payment validation successful",
                };
            }

            if (validation.status === "account_inactive") {
                return {
                    success: false,
                    requiresConversion: false,
                    message: validation.message,
                    error: "ACCOUNT_INACTIVE",
                };
            }

            if (validation.status === "requires_conversion") {
                const xlmNeeded = validation.totalCost ?? 0;
                const xlmBalance = await getNativeBalance(userPubKey);
                const xlmToConvert = xlmNeeded - xlmBalance;

                return {
                    success: true,
                    requiresConversion: true,
                    conversionContext: {
                        paymentMethod: "usdc",
                        requiredAmount: amount,
                        userPubKey,
                        conversionNeeded: true,
                        convertedFromXLM: xlmToConvert,
                        convertedFromAsset: "xlm",
                        trustlineCostXLM: validation.trustlineCost,
                    },
                    message: `Conversion needed: ${xlmToConvert.toFixed(7)} XLM to USDC`,
                };
            }

            return {
                success: false,
                requiresConversion: false,
                message: validation.message,
                error: validation.status,
            };
        } else if (paymentMethod === "xlm") {
            const validation = await validateXLMPayment(userPubKey, amount);

            if (validation.status === "success") {
                return {
                    success: true,
                    requiresConversion: false,
                    message: "Payment validation successful",
                };
            }

            if (validation.status === "requires_conversion") {
                // Need to convert PLATFORM_ASSET to XLM
                const platformNeeded = validation.originalAmount;

                return {
                    success: true,
                    requiresConversion: true,
                    conversionContext: {
                        paymentMethod: "xlm",
                        requiredAmount: amount,
                        userPubKey,
                        conversionNeeded: true,
                        convertedFromXLM: amount,
                        convertedFromAsset: PLATFORM_ASSET.code,
                    },
                    message: `Conversion needed: ${platformNeeded.toFixed(7)} ${PLATFORM_ASSET.code} to XLM`,
                };
            }

            return {
                success: false,
                requiresConversion: false,
                message: validation.message,
                error: "INSUFFICIENT_XLM",
            };
        }

        return {
            success: false,
            requiresConversion: false,
            message: "Invalid payment method",
        };
    } catch (error) {
        console.error("Error validating bounty payment:", error);
        return {
            success: false,
            requiresConversion: false,
            message: error instanceof Error ? error.message : "Unknown error",
            error: "VALIDATION_ERROR",
        };
    }
}

/**
 * Calculate XLM needed for conversion (including trust costs)
 */
export async function calculateConversionXLMRequired(
    paymentMethod: PaymentMethod,
    amount: number,
    userPubKey: string
): Promise<number> {
    const TRUSTLINE_RESERVE = 0.5;
    const TX_FEE = 0.00001;

    if (paymentMethod === "asset") {
        const hasTrust = await checkTrustline(
            userPubKey,
            PLATFORM_ASSET.code,
            PLATFORM_ASSET.issuer
        );

        if (!hasTrust) {
            const xlmPrice = await getXLMPrice();
            const platformPrice = await getPlatformAssetPrice();
            const assetCostXLM = (amount * platformPrice) / xlmPrice;
            return TRUSTLINE_RESERVE + assetCostXLM + TX_FEE;
        }

        return TX_FEE;
    } else if (paymentMethod === "usdc") {
        const hasTrust = await checkTrustline(
            userPubKey,
            USDC_ASSET_CODE,
            USDC_ISSUER
        );

        if (!hasTrust) {
            const xlmPrice = await getXLMPrice();
            const usdcPrice = await getAssetToUSDCRate();
            const assetCostXLM = (amount * usdcPrice) / xlmPrice;
            return TRUSTLINE_RESERVE + assetCostXLM + TX_FEE;
        }

        return TX_FEE;
    }

    return TX_FEE;
}





/**
 * Create conversion transaction if needed
 * This function handles XLM to Asset conversion via mother account
 */
export async function createConversionTransaction(
    context: TransactionConversionContext,
    motherPubKey: string
): Promise<string> {
    // This would need to interact with a DEX or conversion service
    // For now, returning placeholder - integrate with your actual conversion logic
    throw new Error(
        "Conversion transaction creation must be implemented based on your DEX/conversion service"
    );
}

import { Asset } from "@stellar/stellar-sdk";
import {
    checkTrustline,
    getAssetBalance,
    getNativeBalance,
    getReservedXLM,
} from "./helper";
import {
    getXLMPrice,
    getPlatformAssetPrice,
    getAssetToUSDCRate,
    getXlmNumberForUSD,
    getplatformAssetNumberForXLM,
    getXLMNumberForPlatformAsset,
} from "./fan/get_token_price";
import { PLATFORM_ASSET } from "./constant";
import { USDC_ASSET_CODE, USDC_ISSUER } from "~/lib/usdc";

export type PaymentValidationStatus =
    | "success"
    | "account_inactive"
    | "insufficient_xlm"
    | "insufficient_balance"
    | "requires_conversion";

export interface PaymentValidationResult {
    status: PaymentValidationStatus;
    message: string;
    conversionNeeded?: boolean;
    convertedAmount?: number;
    originalAmount: number;
    paymentAsset: "platform_asset" | "usdc" | "xlm";
    trustlineCost?: number;
    totalCost?: number;
    xlmShortage?: number;
}

export interface PaymentConversionInfo {
    fromAsset: "platform_asset" | "usdc" | "xlm";
    toAsset: "platform_asset" | "usdc" | "xlm";
    originalAmount: number;
    convertedAmount: number;
    conversionRate: number;
    trustlineCost: number;
    assetPrice: number;
    totalXLMRequired: number;
    availableXLM: number;
    xlmShortage: number;
    canConvert: boolean;
    message: string;
}

const TRUSTLINE_RESERVE_XLM = 0.5; // XLM required for trustline
const BASE_TRANSACTION_FEE_XLM = 0.00001; // Minimal transaction fee

/**
 * Calculate total XLM needed for trustline and asset operations
 */
export async function calculateTrustlineCost(
    needsTrust: boolean,
    needsAdditionalTrust?: boolean
): Promise<number> {
    if (!needsTrust && !needsAdditionalTrust) return BASE_TRANSACTION_FEE_XLM;

    let cost = BASE_TRANSACTION_FEE_XLM;
    if (needsTrust) cost += TRUSTLINE_RESERVE_XLM;
    if (needsAdditionalTrust) cost += TRUSTLINE_RESERVE_XLM;

    return cost;
}

/**
 * Validate and handle PLATFORM_ASSET payment
 */
export async function validatePlatformAssetPayment(
    userPubKey: string,
    requiredAmount: number
): Promise<PaymentValidationResult> {
    try {
        // Check trustlines
        const hasPlatformTrust = await checkTrustline(
            userPubKey,
            PLATFORM_ASSET.code,
            PLATFORM_ASSET.issuer
        );
        const hasXLMBalance = (await getNativeBalance(userPubKey)) > 0;

        // Case 1: User doesn't have trust on PLATFORM and XLM
        if (!hasPlatformTrust && !hasXLMBalance) {
            return {
                status: "account_inactive",
                message: "Your account isn't active. Please activate your account.",
                paymentAsset: "platform_asset",
                originalAmount: requiredAmount,
            };
        }

        // Case 2: User doesn't have trust on PLATFORM but has XLM
        if (!hasPlatformTrust && hasXLMBalance) {
            const xlmBalance = await getNativeBalance(userPubKey);
            const xlmPrice = await getXLMPrice();
            const trustlineCost = await calculateTrustlineCost(true);

            // Calculate total cost: trustline + conversion + buffer
            const platformPrice = await getPlatformAssetPrice();
            const assetPrice = (requiredAmount * platformPrice) / xlmPrice;
            const totalXLMNeeded = trustlineCost + assetPrice;

            if (xlmBalance < totalXLMNeeded) {
                return {
                    status: "insufficient_xlm",
                    message: `Insufficient XLM. Need ${totalXLMNeeded.toFixed(7)} XLM (including ${trustlineCost} for trust). You have ${xlmBalance.toFixed(7)} XLM.`,
                    paymentAsset: "platform_asset",
                    originalAmount: requiredAmount,
                    conversionNeeded: true,
                    trustlineCost: trustlineCost,
                    xlmShortage: totalXLMNeeded - xlmBalance,
                };
            }

            return {
                status: "requires_conversion",
                message: `Will convert ${assetPrice.toFixed(7)} XLM to PLATFORM_ASSET`,
                paymentAsset: "platform_asset",
                originalAmount: requiredAmount,
                conversionNeeded: true,
                convertedAmount: requiredAmount,
                trustlineCost: trustlineCost,
                totalCost: totalXLMNeeded,
            };
        }

        // Case 3: User has trust on PLATFORM
        const platformBalance = await getAssetBalance(
            userPubKey,
            PLATFORM_ASSET.code,
            PLATFORM_ASSET.issuer
        );
        const xlmBalance = await getNativeBalance(userPubKey);

        if (platformBalance < requiredAmount) {
            return {
                status: "insufficient_balance",
                message: `Insufficient ${PLATFORM_ASSET.code} balance. Need ${requiredAmount}, you have ${platformBalance.toFixed(7)}.`,
                paymentAsset: "platform_asset",
                originalAmount: requiredAmount,
            };
        }

        // Check if user has enough XLM for transaction fee
        if (xlmBalance < BASE_TRANSACTION_FEE_XLM) {
            return {
                status: "insufficient_xlm",
                message: "Insufficient XLM for transaction fee",
                paymentAsset: "platform_asset",
                originalAmount: requiredAmount,
            };
        }

        return {
            status: "success",
            message: "Payment can proceed with PLATFORM_ASSET",
            paymentAsset: "platform_asset",
            originalAmount: requiredAmount,
        };
    } catch (error) {
        console.error("Error validating platform asset payment:", error);
        throw error;
    }
}

/**
 * Validate and handle USDC payment
 */
export async function validateUSDCPayment(
    userPubKey: string,
    requiredAmount: number
): Promise<PaymentValidationResult> {
    try {
        // Check trustlines
        const hasUSDCTrust = await checkTrustline(
            userPubKey,
            USDC_ASSET_CODE,
            USDC_ISSUER
        );
        const hasXLMBalance = (await getNativeBalance(userPubKey)) > 0;

        // Case 1: User doesn't have trust on USDC and XLM
        if (!hasUSDCTrust && !hasXLMBalance) {
            return {
                status: "account_inactive",
                message: "Your account isn't active. Please activate your account.",
                paymentAsset: "usdc",
                originalAmount: requiredAmount,
            };
        }

        // Case 2: User doesn't have trust on USDC but has XLM
        if (!hasUSDCTrust && hasXLMBalance) {
            const xlmBalance = await getNativeBalance(userPubKey);
            const xlmPrice = await getXLMPrice();
            const usdcPrice = await getAssetToUSDCRate();
            const trustlineCost = await calculateTrustlineCost(true);

            // Calculate XLM needed for USDC amount at current rate
            const assetCostInXLM = (requiredAmount * usdcPrice) / xlmPrice;
            const totalXLMNeeded = trustlineCost + assetCostInXLM;

            if (xlmBalance < totalXLMNeeded) {
                return {
                    status: "insufficient_xlm",
                    message: `Insufficient XLM. Need ${totalXLMNeeded.toFixed(7)} XLM (including ${trustlineCost} for trust). You have ${xlmBalance.toFixed(7)} XLM.`,
                    paymentAsset: "usdc",
                    originalAmount: requiredAmount,
                    conversionNeeded: true,
                    trustlineCost: trustlineCost,
                    xlmShortage: totalXLMNeeded - xlmBalance,
                };
            }

            return {
                status: "requires_conversion",
                message: `Will convert ${assetCostInXLM.toFixed(7)} XLM to USDC`,
                paymentAsset: "usdc",
                originalAmount: requiredAmount,
                conversionNeeded: true,
                convertedAmount: requiredAmount,
                trustlineCost: trustlineCost,
                totalCost: totalXLMNeeded,
            };
        }

        // Case 3: User has trust on USDC
        const usdcBalance = await getAssetBalance(
            userPubKey,
            USDC_ASSET_CODE,
            USDC_ISSUER
        );
        const xlmBalance = await getNativeBalance(userPubKey);

        if (usdcBalance < requiredAmount) {
            return {
                status: "insufficient_balance",
                message: `Insufficient USDC balance. Need ${requiredAmount}, you have ${usdcBalance.toFixed(7)}.`,
                paymentAsset: "usdc",
                originalAmount: requiredAmount,
            };
        }

        // Check if user has enough XLM for transaction fee
        if (xlmBalance < BASE_TRANSACTION_FEE_XLM) {
            return {
                status: "insufficient_xlm",
                message: "Insufficient XLM for transaction fee",
                paymentAsset: "usdc",
                originalAmount: requiredAmount,
            };
        }

        return {
            status: "success",
            message: "Payment can proceed with USDC",
            paymentAsset: "usdc",
            originalAmount: requiredAmount,
        };
    } catch (error) {
        console.error("Error validating USDC payment:", error);
        throw error;
    }
}

/**
 * Validate and handle XLM payment
 */
export async function validateXLMPayment(
    userPubKey: string,
    requiredXLMAmount: number
): Promise<PaymentValidationResult> {
    try {
        const xlmBalance = await getNativeBalance(userPubKey);
        const reservedXLM = await getReservedXLM(userPubKey);
        const availableXLM = xlmBalance - reservedXLM;

        // Case 1: User doesn't have enough XLM
        if (availableXLM < requiredXLMAmount) {
            const platformAssetBalance = await getAssetBalance(
                userPubKey,
                PLATFORM_ASSET.code,
                PLATFORM_ASSET.issuer
            );

            // Case 2: User has PLATFORM_ASSET, convert it to XLM
            if (platformAssetBalance > 0) {
                const xlmNeeded = requiredXLMAmount - availableXLM;
                const xlmPrice = await getXLMPrice();
                const platformPrice = await getPlatformAssetPrice();

                // How much PLATFORM_ASSET needed to convert to XLM
                const platformNeeded = (xlmNeeded * xlmPrice) / platformPrice;

                if (platformAssetBalance >= platformNeeded) {
                    return {
                        status: "requires_conversion",
                        message: `Will convert ${platformNeeded.toFixed(7)} ${PLATFORM_ASSET.code} to ${xlmNeeded.toFixed(7)} XLM`,
                        paymentAsset: "xlm",
                        originalAmount: requiredXLMAmount,
                        conversionNeeded: true,
                        convertedAmount: requiredXLMAmount,
                    };
                }
            }

            return {
                status: "insufficient_xlm",
                message: `Insufficient XLM. Need ${requiredXLMAmount.toFixed(7)} XLM, available: ${availableXLM.toFixed(7)} XLM.`,
                paymentAsset: "xlm",
                originalAmount: requiredXLMAmount,
                xlmShortage: requiredXLMAmount - availableXLM,
            };
        }

        // Case 3: User has enough XLM
        return {
            status: "success",
            message: "Payment can proceed with XLM",
            paymentAsset: "xlm",
            originalAmount: requiredXLMAmount,
        };
    } catch (error) {
        console.error("Error validating XLM payment:", error);
        throw error;
    }
}

/**
 * Convert XLM to PLATFORM_ASSET
 */
export async function convertXLMToPlatformAsset(
    xlmAmount: number
): Promise<number> {
    return await getplatformAssetNumberForXLM(xlmAmount);
}

/**
 * Convert PLATFORM_ASSET to XLM
 */
export async function convertPlatformAssetToXLM(
    platformAmount: number
): Promise<number> {
    return await getXLMNumberForPlatformAsset(platformAmount);
}

/**
 * Convert XLM to USDC
 */
export async function convertXLMToUSDC(xlmAmount: number): Promise<number> {
    const xlmPrice = await getXLMPrice();
    const usdcPrice = await getAssetToUSDCRate();
    return (xlmAmount * xlmPrice) / usdcPrice;
}

/**
 * Convert USDC to XLM
 */
export async function convertUSDCToXLM(usdcAmount: number): Promise<number> {
    const xlmPrice = await getXLMPrice();
    const usdcPrice = await getAssetToUSDCRate();
    return (usdcAmount * usdcPrice) / xlmPrice;
}

/**
 * Get comprehensive payment conversion info for UI display
 */
export async function getPaymentConversionInfo(
    fromAsset: "platform_asset" | "usdc" | "xlm",
    toAsset: "platform_asset" | "usdc" | "xlm",
    amount: number,
    userPubKey: string
): Promise<PaymentConversionInfo> {
    const xlmPrice = await getXLMPrice();
    const platformPrice = await getPlatformAssetPrice();
    const usdcPrice = await getAssetToUSDCRate();
    const xlmBalance = await getNativeBalance(userPubKey);
    const trustlineCost = await calculateTrustlineCost(true);

    let convertedAmount = amount;
    let conversionRate = 1;
    let assetPrice = 0;
    let totalXLMRequired = trustlineCost + BASE_TRANSACTION_FEE_XLM;

    if (fromAsset === "xlm" && toAsset === "platform_asset") {
        convertedAmount = await convertXLMToPlatformAsset(amount);
        conversionRate = convertedAmount / amount;
        assetPrice = amount * xlmPrice / platformPrice;
        totalXLMRequired = trustlineCost + amount;
    } else if (fromAsset === "xlm" && toAsset === "usdc") {
        convertedAmount = await convertXLMToUSDC(amount);
        conversionRate = convertedAmount / amount;
        assetPrice = amount * xlmPrice / usdcPrice;
        totalXLMRequired = trustlineCost + amount;
    } else if (fromAsset === "platform_asset" && toAsset === "xlm") {
        convertedAmount = await convertPlatformAssetToXLM(amount);
        conversionRate = convertedAmount / amount;
        assetPrice = (amount * platformPrice) / xlmPrice;
        totalXLMRequired = assetPrice + BASE_TRANSACTION_FEE_XLM;
    } else if (fromAsset === "usdc" && toAsset === "xlm") {
        convertedAmount = await convertUSDCToXLM(amount);
        conversionRate = convertedAmount / amount;
        assetPrice = (amount * usdcPrice) / xlmPrice;
        totalXLMRequired = assetPrice + BASE_TRANSACTION_FEE_XLM;
    }

    const xlmShortage = Math.max(0, totalXLMRequired - xlmBalance);

    return {
        fromAsset,
        toAsset,
        originalAmount: amount,
        convertedAmount,
        conversionRate,
        trustlineCost,
        assetPrice,
        totalXLMRequired,
        availableXLM: xlmBalance,
        xlmShortage,
        canConvert: xlmShortage === 0,
        message:
            xlmShortage > 0
                ? `Need ${xlmShortage.toFixed(7)} more XLM to perform this conversion`
                : `Will convert ${amount} ${fromAsset} to ${convertedAmount.toFixed(7)} ${toAsset}`,
    };
}

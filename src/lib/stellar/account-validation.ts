import {
    checkTrustline,
    getNativeBalance,
    getAssetBalance,
    getReservedXLM,
} from "./helper";
import {
    getXLMPrice,
    getPlatformAssetPrice,
    getAssetToUSDCRate,
} from "./fan/get_token_price";
import { PLATFORM_ASSET } from "./constant";
import { USDC_ASSET_CODE, USDC_ISSUER } from "~/lib/usdc";

export interface AccountBalances {
    nativeXLM: number;
    availableXLM: number;
    reservedXLM: number;
    platformAssetBalance: number;
    usdcBalance: number;
    hasPlatformTrust: boolean;
    hasUSDCTrust: boolean;
}

export interface AssetPrice {
    xlmUSD: number;
    platformAssetUSD: number;
    usdcUSD: number;
    platformToXLM: number;
    usdcToXLM: number;
}

export interface PaymentPossibility {
    canPayWithPlatformAsset: boolean;
    canPayWithUSDC: boolean;
    canPayWithXLM: boolean;
    platformAssetAmount?: number;
    usdcAmount?: number;
    xlmAmount?: number;
    requiresConversionPlatformAsset: boolean;
    requiresConversionUSDC: boolean;
    requiresConversionXLM: boolean;
    trustlineCostXLM: number;
}

const TRUSTLINE_RESERVE_XLM = 0.5;
const TX_FEE_XLM = 0.00001;

/**
 * Get comprehensive account balances and trustline status
 */
export async function getAccountBalances(
    userPubKey: string
): Promise<AccountBalances> {
    try {
        const nativeXLM = await getNativeBalance(userPubKey);
        const reservedXLM = await getReservedXLM(userPubKey);
        const availableXLM = nativeXLM - reservedXLM;

        const hasPlatformTrust = await checkTrustline(
            userPubKey,
            PLATFORM_ASSET.code,
            PLATFORM_ASSET.issuer
        );

        const hasUSDCTrust = await checkTrustline(
            userPubKey,
            USDC_ASSET_CODE,
            USDC_ISSUER
        );

        const platformAssetBalance = hasPlatformTrust
            ? await getAssetBalance(userPubKey, PLATFORM_ASSET.code, PLATFORM_ASSET.issuer)
            : 0;

        const usdcBalance = hasUSDCTrust
            ? await getAssetBalance(userPubKey, USDC_ASSET_CODE, USDC_ISSUER)
            : 0;

        return {
            nativeXLM,
            availableXLM,
            reservedXLM,
            platformAssetBalance,
            usdcBalance,
            hasPlatformTrust,
            hasUSDCTrust,
        };
    } catch (error) {
        console.error("Error fetching account balances:", error);
        throw error;
    }
}

/**
 * Get current asset prices
 */
export async function getAssetPrices(): Promise<AssetPrice> {
    try {
        const xlmUSD = await getXLMPrice();
        const platformAssetUSD = await getPlatformAssetPrice();
        const usdcUSD = await getAssetToUSDCRate();

        return {
            xlmUSD,
            platformAssetUSD,
            usdcUSD,
            platformToXLM: platformAssetUSD / xlmUSD,
            usdcToXLM: usdcUSD / xlmUSD,
        };
    } catch (error) {
        console.error("Error fetching asset prices:", error);
        throw error;
    }
}

/**
 * Check all payment possibilities for a given amount
 */
export async function checkPaymentPossibilities(
    userPubKey: string,
    requiredUSDAmount: number
): Promise<PaymentPossibility> {
    try {
        const balances = await getAccountBalances(userPubKey);
        const prices = await getAssetPrices();

        // Calculate amounts needed
        const platformAssetAmount = (requiredUSDAmount / prices.platformAssetUSD) * 1.01; // 1% buffer
        const usdcAmount = (requiredUSDAmount / prices.usdcUSD) * 1.01; // 1% buffer
        const xlmAmount = (requiredUSDAmount / prices.xlmUSD) * 1.01; // 1% buffer

        // Check PLATFORM_ASSET payment
        const canPayWithPlatformAsset =
            balances.hasPlatformTrust &&
            balances.platformAssetBalance >= platformAssetAmount &&
            balances.availableXLM >= TX_FEE_XLM;

        const requiresConversionPlatformAsset =
            !balances.hasPlatformTrust && balances.availableXLM >= xlmAmount + TRUSTLINE_RESERVE_XLM;

        // Check USDC payment
        const canPayWithUSDC =
            balances.hasUSDCTrust &&
            balances.usdcBalance >= usdcAmount &&
            balances.availableXLM >= TX_FEE_XLM;

        const requiresConversionUSDC =
            !balances.hasUSDCTrust && balances.availableXLM >= xlmAmount + TRUSTLINE_RESERVE_XLM;

        // Check XLM payment
        const canPayWithXLM = balances.availableXLM >= xlmAmount + TX_FEE_XLM;

        const requiresConversionXLM =
            !canPayWithXLM &&
            balances.platformAssetBalance > 0 &&
            balances.platformAssetBalance * prices.platformToXLM >= xlmAmount + TX_FEE_XLM;

        const trustlineCostXLM = TRUSTLINE_RESERVE_XLM;

        return {
            canPayWithPlatformAsset,
            canPayWithUSDC,
            canPayWithXLM,
            platformAssetAmount,
            usdcAmount,
            xlmAmount,
            requiresConversionPlatformAsset,
            requiresConversionUSDC,
            requiresConversionXLM,
            trustlineCostXLM,
        };
    } catch (error) {
        console.error("Error checking payment possibilities:", error);
        throw error;
    }
}

/**
 * Validate if user can pay with specific method
 */
export async function validatePaymentMethod(
    userPubKey: string,
    method: "asset" | "usdc" | "xlm",
    requiredAmount: number
): Promise<{
    canPay: boolean;
    requiresConversion: boolean;
    message: string;
    xlmNeeded?: number;
}> {
    try {
        const balances = await getAccountBalances(userPubKey);
        const prices = await getAssetPrices();

        if (method === "asset") {
            // Check if user has platform asset trust
            if (!balances.hasPlatformTrust) {
                // Check if they have XLM to create trust and buy asset
                const xlmNeeded = requiredAmount * prices.platformToXLM + TRUSTLINE_RESERVE_XLM;
                const canDoConversion = balances.availableXLM >= xlmNeeded;

                return {
                    canPay: canDoConversion,
                    requiresConversion: true,
                    message: canDoConversion
                        ? `Will create trustline and convert ${(xlmNeeded - TRUSTLINE_RESERVE_XLM).toFixed(7)} XLM to ${PLATFORM_ASSET.code}`
                        : `Need ${xlmNeeded.toFixed(7)} XLM (have ${balances.availableXLM.toFixed(7)})`,
                    xlmNeeded: xlmNeeded,
                };
            }

            // User has trust, check balance
            const hasBalance =
                balances.platformAssetBalance >= requiredAmount &&
                balances.availableXLM >= TX_FEE_XLM;

            return {
                canPay: hasBalance,
                requiresConversion: false,
                message: hasBalance
                    ? `Ready to pay ${requiredAmount.toFixed(7)} ${PLATFORM_ASSET.code}`
                    : `Insufficient ${PLATFORM_ASSET.code} balance`,
            };
        } else if (method === "usdc") {
            if (!balances.hasUSDCTrust) {
                const xlmNeeded = requiredAmount * prices.usdcToXLM + TRUSTLINE_RESERVE_XLM;
                const canDoConversion = balances.availableXLM >= xlmNeeded;

                return {
                    canPay: canDoConversion,
                    requiresConversion: true,
                    message: canDoConversion
                        ? `Will create trustline and convert ${(xlmNeeded - TRUSTLINE_RESERVE_XLM).toFixed(7)} XLM to USDC`
                        : `Need ${xlmNeeded.toFixed(7)} XLM (have ${balances.availableXLM.toFixed(7)})`,
                    xlmNeeded: xlmNeeded,
                };
            }

            const hasBalance =
                balances.usdcBalance >= requiredAmount &&
                balances.availableXLM >= TX_FEE_XLM;

            return {
                canPay: hasBalance,
                requiresConversion: false,
                message: hasBalance
                    ? `Ready to pay ${requiredAmount.toFixed(7)} USDC`
                    : `Insufficient USDC balance`,
            };
        } else if (method === "xlm") {
            if (balances.availableXLM >= requiredAmount) {
                return {
                    canPay: true,
                    requiresConversion: false,
                    message: `Ready to pay ${requiredAmount.toFixed(7)} XLM`,
                };
            }

            // Check if user can convert platform asset to XLM
            if (balances.platformAssetBalance > 0) {
                const xlmFromAsset = balances.platformAssetBalance * prices.platformToXLM;
                const totalXLMAvailable = balances.availableXLM + xlmFromAsset;

                if (totalXLMAvailable >= requiredAmount) {
                    return {
                        canPay: true,
                        requiresConversion: true,
                        message: `Will convert ${(requiredAmount - balances.availableXLM).toFixed(7)} ${PLATFORM_ASSET.code} to XLM`,
                        xlmNeeded: requiredAmount - balances.availableXLM,
                    };
                }
            }

            return {
                canPay: false,
                requiresConversion: false,
                message: `Insufficient XLM. Need ${requiredAmount.toFixed(7)}, have ${balances.availableXLM.toFixed(7)}`,
                xlmNeeded: requiredAmount - balances.availableXLM,
            };
        }

        return {
            canPay: false,
            requiresConversion: false,
            message: "Invalid payment method",
        };
    } catch (error) {
        console.error("Error validating payment method:", error);
        return {
            canPay: false,
            requiresConversion: false,
            message: error instanceof Error ? error.message : "Validation error",
        };
    }
}

/**
 * Get recommended payment method based on user's balances
 */
export async function getRecommendedPaymentMethod(
    userPubKey: string,
    requiredAmount: number
): Promise<{
    recommended: "asset" | "usdc" | "xlm" | null;
    availableMethods: Array<{
        method: "asset" | "usdc" | "xlm";
        canPay: boolean;
        requiresConversion: boolean;
    }>;
}> {
    try {
        const assetValidation = await validatePaymentMethod(
            userPubKey,
            "asset",
            requiredAmount
        );
        const usdcValidation = await validatePaymentMethod(
            userPubKey,
            "usdc",
            requiredAmount
        );
        const xlmValidation = await validatePaymentMethod(
            userPubKey,
            "xlm",
            requiredAmount
        );

        const availableMethods = [];

        if (assetValidation.canPay) {
            availableMethods.push({
                method: "asset" as const,
                canPay: true,
                requiresConversion: assetValidation.requiresConversion,
            });
        }

        if (usdcValidation.canPay) {
            availableMethods.push({
                method: "usdc" as const,
                canPay: true,
                requiresConversion: usdcValidation.requiresConversion,
            });
        }

        if (xlmValidation.canPay) {
            availableMethods.push({
                method: "xlm" as const,
                canPay: true,
                requiresConversion: xlmValidation.requiresConversion,
            });
        }

        // Prefer method without conversion
        let recommended: "asset" | "usdc" | "xlm" | null = null;

        const noConversion = availableMethods.find((m) => !m.requiresConversion);
        if (noConversion) {
            recommended = noConversion.method;
        } else if (availableMethods.length > 0) {
            // If all require conversion, pick first available
            recommended = availableMethods[0].method;
        }

        return {
            recommended,
            availableMethods,
        };
    } catch (error) {
        console.error("Error getting recommended payment method:", error);
        return {
            recommended: null,
            availableMethods: [],
        };
    }
}

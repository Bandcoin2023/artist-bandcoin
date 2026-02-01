import {
    getAssetBalance,
    getNativeBalance,
    checkTrustline,
    getReservedXLM,
} from "../helper";
import { PLATFORM_ASSET } from "../constant";
import { USDC_ASSET_CODE, USDC_ISSUER } from "~/lib/usdc";
import {
    getXLMPrice,
    getPlatformAssetPrice,
    getAssetToUSDCRate,
} from "../fan/get_token_price";
import type { PaymentMethod } from "~/components/payment/payment-process";



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
 * Calculate balance requirements for PLATFORM_ASSET bounty
 * Mirrors backend: SendBountyBalanceToMotherAccountViaAsset
 * 
 * CASE 1: Account not active (insufficient XLM for minimum reserve) → BLOCK
 * CASE 2: No PLATFORM trust but has XLM → Convert XLM to PLATFORM
 * CASE 3: Has PLATFORM trust but insufficient balance AND has XLM → Convert XLM to PLATFORM
 * CASE 4: Normal flow - has sufficient balance
 */
export async function calculatePlatformAssetBountyRequirements(
    userPubKey: string,
    prize: number,
    fees = 0
): Promise<{
    totalAmount: number;
    userXLMBalance: number;
    userPlatformBalance: number;
    hasPlatformTrust: boolean;
    baseReserve: number;
    platformTrustReserve: number;
    totalXlmReserve: number;
    xlmForConversion: number;
    platformFromConversion: number;
    effectivePlatformBalance: number;
    canProceed: boolean;
    message: string;
    requiresConversion: boolean;
}> {
    const totalAmount = prize + fees;
    const baseReserve = await getReservedXLM(userPubKey);
    const userXLMBalance = await getNativeBalance(userPubKey);
    const userPlatformBalance = await getAssetBalance(
        userPubKey,
        PLATFORM_ASSET.code,
        PLATFORM_ASSET.issuer
    ).catch(() => 0);
    const hasPlatformTrust = await checkTrustline(
        userPubKey,
        PLATFORM_ASSET.code,
        PLATFORM_ASSET.issuer
    );

    const platformTrustReserve = hasPlatformTrust ? 0 : 0.5;
    const totalXlmReserve = baseReserve + platformTrustReserve;

    let platformFromConversion = 0;
    let xlmForConversion = 0;
    let canProceed = false;
    let message = "";
    let requiresConversion = false;

    // CASE 1: Account not active (insufficient XLM for minimum reserve)
    if (!hasPlatformTrust && userXLMBalance < totalXlmReserve) {
        message = `Account not active. Need ${totalXlmReserve.toFixed(7)} XLM for reserve but only have ${userXLMBalance.toFixed(7)} XLM`;
        canProceed = false;
    }
    // CASE 2: No PLATFORM trust but has XLM → Convert XLM to PLATFORM
    else if (!hasPlatformTrust && userXLMBalance >= totalXlmReserve) {
        requiresConversion = true;
        const { getXLMNumberForPlatformAsset } = await import("../fan/get_token_price");
        const xlmNeeded = (await getXLMNumberForPlatformAsset(totalAmount)) + 0.5 + totalXlmReserve; // +0.5 for conversion + reserve
        xlmForConversion = xlmNeeded - totalXlmReserve - 0.5; // Actual XLM to convert
        platformFromConversion = totalAmount;
        message = `Will convert ${xlmForConversion.toFixed(7)} XLM to ~${platformFromConversion.toFixed(7)} ${PLATFORM_ASSET.code}`;
        canProceed = userXLMBalance >= xlmNeeded;
    }
    // CASE 3: Has PLATFORM trust but insufficient balance AND has XLM → Convert XLM to PLATFORM
    else if (
        hasPlatformTrust &&
        userPlatformBalance < totalAmount &&
        userXLMBalance > totalXlmReserve
    ) {
        requiresConversion = true;
        const { getXLMNumberForPlatformAsset } = await import("../fan/get_token_price");
        const platformShortage = totalAmount - userPlatformBalance;
        const xlmNeeded = await getXLMNumberForPlatformAsset(platformShortage);
        const availableXlm = userXLMBalance - totalXlmReserve;

        xlmForConversion = xlmNeeded;
        platformFromConversion = platformShortage;
        message = `Convert ${xlmForConversion.toFixed(7)} XLM to ~${platformFromConversion.toFixed(7)} ${PLATFORM_ASSET.code}`;
        canProceed = availableXlm >= xlmForConversion;
    }
    // CASE 4: Normal flow - has sufficient balance
    else if (hasPlatformTrust && userPlatformBalance >= totalAmount) {
        message = `Sufficient ${PLATFORM_ASSET.code} balance available`;
        canProceed = true;
    } else {
        message = `Insufficient ${PLATFORM_ASSET.code} balance. Need ${totalAmount.toFixed(7)}, have ${userPlatformBalance.toFixed(7)}`;
        canProceed = false;
    }

    const effectivePlatformBalance = userPlatformBalance + platformFromConversion;

    return {
        totalAmount,
        userXLMBalance,
        userPlatformBalance,
        hasPlatformTrust,
        baseReserve,
        platformTrustReserve,
        totalXlmReserve,
        xlmForConversion,
        platformFromConversion,
        effectivePlatformBalance,
        canProceed,
        message,
        requiresConversion,
    };
}

/**
 * Calculate balance requirements for USDC bounty
 * Mirrors backend: SendBountyBalanceToMotherAccountViaUSDC
 * 
 * CASE 1: Account not active (insufficient XLM for minimum reserve) → BLOCK
 * CASE 2: No USDC trust but has XLM → Convert XLM to USDC (includes 0.5 XLM buffer + trustline cost)
 * CASE 3: Has USDC trust but insufficient balance AND has XLM → Convert XLM to USDC
 * CASE 4: Normal flow - has sufficient balance
 */
export async function calculateUSDCBountyRequirements(
    userPubKey: string,
    prize: number,
    fees = 0
): Promise<{
    totalAmount: number;
    userXLMBalance: number;
    userUSDCBalance: number;
    hasUSDCTrust: boolean;
    baseReserve: number;
    usdcTrustReserve: number;
    totalXlmReserve: number;
    xlmForConversion: number;
    usdcFromConversion: number;
    effectiveUSDCBalance: number;
    canProceed: boolean;
    message: string;
    requiresConversion: boolean;
}> {
    const totalAmount = prize + fees;
    const baseReserve = await getReservedXLM(userPubKey);
    const userXLMBalance = await getNativeBalance(userPubKey);
    const userUSDCBalance = await getAssetBalance(
        userPubKey,
        USDC_ASSET_CODE,
        USDC_ISSUER
    ).catch(() => 0);
    const hasUSDCTrust = await checkTrustline(
        userPubKey,
        USDC_ASSET_CODE,
        USDC_ISSUER
    );

    const usdcTrustReserve = hasUSDCTrust ? 0 : 0.5;
    const totalXlmReserve = baseReserve + usdcTrustReserve;

    let usdcFromConversion = 0;
    let xlmForConversion = 0;
    let canProceed = false;
    let message = "";
    let requiresConversion = false;

    // CASE 1: Account not active (insufficient XLM for minimum reserve)
    if (!hasUSDCTrust && userXLMBalance < totalXlmReserve) {
        message = `Account not active. Need ${totalXlmReserve.toFixed(7)} XLM for reserve but only have ${userXLMBalance.toFixed(7)} XLM`;
        canProceed = false;
    }
    // CASE 2: No USDC trust but has XLM → Convert XLM to USDC
    else if (!hasUSDCTrust && userXLMBalance >= totalXlmReserve) {
        requiresConversion = true;
        const { getXLMNumberForUSDC } = await import("../fan/get_token_price");
        const xlmNeeded = (await getXLMNumberForUSDC(totalAmount)) + 0.5 + totalXlmReserve; // +0.5 for conversion + reserve
        xlmForConversion = xlmNeeded - totalXlmReserve - 0.5; // Actual XLM to convert
        usdcFromConversion = totalAmount;
        message = `Will convert ${xlmForConversion.toFixed(7)} XLM to ~${usdcFromConversion.toFixed(7)} USDC`;
        canProceed = userXLMBalance >= xlmNeeded;
    }
    // CASE 3: Has USDC trust but insufficient balance AND has XLM → Convert XLM to USDC
    else if (
        hasUSDCTrust &&
        userUSDCBalance < totalAmount &&
        userXLMBalance > totalXlmReserve
    ) {
        requiresConversion = true;
        const { getXLMNumberForUSDC } = await import("../fan/get_token_price");
        const usdcShortage = totalAmount - userUSDCBalance;
        const xlmNeeded = await getXLMNumberForUSDC(usdcShortage);
        const availableXlm = userXLMBalance - totalXlmReserve;

        xlmForConversion = xlmNeeded;
        usdcFromConversion = usdcShortage;
        message = `Convert ${xlmForConversion.toFixed(7)} XLM to ~${usdcFromConversion.toFixed(7)} USDC`;
        canProceed = availableXlm >= xlmForConversion;
    }
    // CASE 4: Normal flow - has sufficient balance
    else if (hasUSDCTrust && userUSDCBalance >= totalAmount) {
        message = `Sufficient USDC balance available`;
        canProceed = true;
    } else {
        message = `Insufficient USDC balance. Need ${totalAmount.toFixed(7)}, have ${userUSDCBalance.toFixed(7)}`;
        canProceed = false;
    }

    const effectiveUSDCBalance = userUSDCBalance + usdcFromConversion;

    return {
        totalAmount,
        userXLMBalance,
        userUSDCBalance,
        hasUSDCTrust,
        baseReserve,
        usdcTrustReserve,
        totalXlmReserve,
        xlmForConversion,
        usdcFromConversion,
        effectiveUSDCBalance,
        canProceed,
        message,
        requiresConversion,
    };
}

/**
 * Calculate balance requirements for XLM bounty
 * Mirrors backend: SendBountyBalanceToMotherAccountViaXLM
 * 
 * CASE 1: No PLATFORM trust and insufficient XLM → BLOCK (can't convert)
 * CASE 2: Has PLATFORM trust but no PLATFORM balance and insufficient XLM → BLOCK
 * CASE 3: Has PLATFORM but insufficient XLM → Convert PLATFORM to XLM
 * CASE 4: Normal flow - has sufficient XLM
 */
export async function calculateXLMBountyRequirements(
    userPubKey: string,
    prizeInXLM: number,
    fees = 0
): Promise<{
    totalAmount: number;
    userXLMBalance: number;
    userPlatformBalance: number;
    hasPlatformTrust: boolean;
    baseReserve: number;
    platformTrustReserve: number;
    totalXlmReserve: number;
    totalXlmNeeded: number;
    platformForConversion: number;
    xlmFromConversion: number;
    canProceed: boolean;
    message: string;
    requiresConversion: boolean;
}> {
    const totalAmount = prizeInXLM + fees;
    const baseReserve = await getReservedXLM(userPubKey);
    const userXLMBalance = await getNativeBalance(userPubKey);
    const userPlatformBalance = await getAssetBalance(
        userPubKey,
        PLATFORM_ASSET.code,
        PLATFORM_ASSET.issuer
    ).catch(() => 0);
    const hasPlatformTrust = await checkTrustline(
        userPubKey,
        PLATFORM_ASSET.code,
        PLATFORM_ASSET.issuer
    );

    const platformTrustReserve = hasPlatformTrust ? 0 : 0.5;
    const totalXlmReserve = baseReserve + platformTrustReserve;
    const totalXlmNeeded = totalAmount + totalXlmReserve;

    let canProceed = false;
    let message = "";
    let requiresConversion = false;
    let platformForConversion = 0;
    let xlmFromConversion = 0;

    // CASE 1: No PLATFORM trust and insufficient XLM for transaction
    // They cannot convert PLATFORM to XLM — block XDR creation early.
    if (!hasPlatformTrust && userXLMBalance < totalXlmNeeded) {
        const xlmNeeded = totalXlmNeeded - userXLMBalance;
        message = `Insufficient XLM to complete bounty. You need ${totalXlmNeeded.toFixed(2)} XLM but have ${userXLMBalance.toFixed(2)} XLM. Short by ${xlmNeeded.toFixed(2)} XLM. Please add more XLM or use a different payment method.`;
        canProceed = false;
    }
    // CASE 2: Has PLATFORM trust but no PLATFORM balance and insufficient XLM
    else if (
        hasPlatformTrust &&
        userPlatformBalance <= 0 &&
        userXLMBalance < totalXlmNeeded
    ) {
        const xlmNeeded = totalXlmNeeded - userXLMBalance;
        message = `Insufficient XLM for bounty. You need ${totalXlmNeeded.toFixed(2)} XLM but have ${userXLMBalance.toFixed(2)} XLM. You're short by ${xlmNeeded.toFixed(2)} XLM. Consider funding your XLM balance or using PLATFORM to convert.`;
        canProceed = false;
    }
    // CASE 3: Has PLATFORM but insufficient XLM → Convert PLATFORM to XLM
    else if (userXLMBalance < totalXlmNeeded && userPlatformBalance > 0) {
        requiresConversion = true;
        const xlmShortage = totalXlmNeeded - userXLMBalance;
        const xlmPrice = await getXLMPrice();
        const platformPrice = await getPlatformAssetPrice();
        platformForConversion = (xlmShortage * xlmPrice) / platformPrice;
        xlmFromConversion = xlmShortage;

        message = `Will convert ~${platformForConversion.toFixed(7)} ${PLATFORM_ASSET.code} to ${xlmShortage.toFixed(7)} XLM`;
        canProceed = userPlatformBalance >= platformForConversion;
    }
    // CASE 4: Normal flow - has sufficient XLM
    else if (userXLMBalance >= totalXlmNeeded) {
        message = `Sufficient XLM balance available`;
        canProceed = true;
    } else {
        message = `Insufficient funds for XLM bounty`;
        canProceed = false;
    }

    return {
        totalAmount,
        userXLMBalance,
        userPlatformBalance,
        hasPlatformTrust,
        baseReserve,
        platformTrustReserve,
        totalXlmReserve,
        totalXlmNeeded,
        platformForConversion,
        xlmFromConversion,
        canProceed,
        message,
        requiresConversion,
    };
}

/**
 * Create conversion transaction if needed
 * This function handles XLM to Asset conversion via mother account
 */
export async function createConversionTransaction(
    _context: TransactionConversionContext,
    _motherPubKey: string
): Promise<string> {
    // This would need to interact with a DEX or conversion service
    // For now, returning placeholder - integrate with your actual conversion logic
    throw new Error(
        "Conversion transaction creation must be implemented based on your DEX/conversion service"
    );
}

import {
    getAssetBalance,
    getNativeBalance,
    checkTrustline,
    getReservedXLM,
} from "../helper";
import { PLATFORM_ASSET, PLATFORM_FEE, TrxBaseFeeInPlatformAsset } from "../constant";
import {
    getXLMPrice,
    getPlatformAssetPrice,
} from "../fan/get_token_price";
import type { PaymentMethod } from "~/components/payment/payment-process";

export interface NFTPaymentContext {
    paymentMethod: PaymentMethod;
    requiredAmount: number;
    userPubKey: string;
    conversionNeeded: boolean;
    convertedFromXLM?: number;
    convertedFromAsset?: string;
    trustlineCostXLM?: number;
}

export interface NFTPaymentResult {
    success: boolean;
    requiresConversion: boolean;
    conversionContext?: NFTPaymentContext;
    message: string;
    xdrTransaction?: string;
    error?: string;
}

/**
 * Calculate balance requirements for PLATFORM_ASSET NFT creation
 * 
 * CASE 1: Account not active (insufficient XLM for minimum reserve) → BLOCK
 * CASE 2: No PLATFORM trust but has XLM → Convert XLM to PLATFORM
 * CASE 3: Has PLATFORM trust but insufficient balance AND has XLM → Convert XLM to PLATFORM
 * CASE 4: Normal flow - has sufficient balance
 */
export async function calculatePlatformAssetNFTRequirements(
    userPubKey: string,
    requiredAmount: number
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
    const totalAmount = requiredAmount + Number(PLATFORM_FEE) +
        Number(TrxBaseFeeInPlatformAsset)
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
        xlmForConversion = (xlmNeeded + platformTrustReserve) - totalXlmReserve - 0.5; // Actual XLM to convert
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
 * Calculate balance requirements for XLM NFT creation
 * 
 * CASE 1: No PLATFORM trust and insufficient XLM → BLOCK (can't convert)
 * CASE 2: Has PLATFORM trust but no PLATFORM balance and insufficient XLM → BLOCK
 * CASE 3: Has PLATFORM but insufficient XLM → Convert PLATFORM to XLM
 * CASE 4: Normal flow - has sufficient XLM
 */
export async function calculateXLMNFTRequirements(
    userPubKey: string,
    requiredXLM: number
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
    const totalAmount = requiredXLM;
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
        message = `Insufficient XLM to create NFT. You need ${totalXlmNeeded.toFixed(2)} XLM but have ${userXLMBalance.toFixed(2)} XLM. Short by ${xlmNeeded.toFixed(2)} XLM. Please add more XLM or use PLATFORM payment method.`;
        canProceed = false;
    }
    // CASE 2: Has PLATFORM trust but no PLATFORM balance and insufficient XLM
    else if (
        hasPlatformTrust &&
        userPlatformBalance <= 0 &&
        userXLMBalance < totalXlmNeeded
    ) {
        const xlmNeeded = totalXlmNeeded - userXLMBalance;
        message = `Insufficient XLM for NFT creation. You need ${totalXlmNeeded.toFixed(2)} XLM but have ${userXLMBalance.toFixed(2)} XLM. You're short by ${xlmNeeded.toFixed(2)} XLM. Consider funding your XLM balance or using PLATFORM to convert.`;
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
        message = `Insufficient funds for XLM NFT creation`;
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

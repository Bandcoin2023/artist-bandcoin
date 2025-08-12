export * from "package/connect_wallet/src/lib/stellar/constant";

// Fee for transaction in bandcoin
// in xlm
export const PLATFORM_FEE_IN_XLM = 0.005;
export const trxBaseFeeInXLM = 0.005;

// simplified fee (trxBaseFee + platform fee)
export const SIMPLIFIED_FEE = 2050; // in bandcoin
export const SIMPLIFIED_FEE_IN_XLM = 0.01; // in xlm

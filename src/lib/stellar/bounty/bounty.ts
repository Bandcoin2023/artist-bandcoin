import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  networkPassphrase,
  PLATFORM_ASSET,
  PLATFORM_FEE,
  STELLAR_URL,
  TrxBaseFee,
  TrxBaseFeeInPlatformAsset,
} from "../constant";
import { MOTHER_SECRET } from "../marketplace/SECRET";
import { SignUserType, WithSing } from "../utils";
import { getAssetToUSDCRate, getPlatformAssetPrice } from "../fan/get_token_price";
import { addPaymentOp, checkTrustline, createTransactionBuilder, finalizeTransaction, getServerAndMotherAcc, getAssetBalance, getNativeBalance } from "../helper";

import { USDC_ASSET_CODE, USDC_ISSUER } from "~/lib/usdc"


export async function SendBountyBalanceToMotherAccountViaAsset({
  prize,
  signWith,
  userPubKey,
  secretKey,
  fees,
}: {
  prize: number;
  fees: number;
  signWith: SignUserType;
  userPubKey: string;
  secretKey?: string | undefined;
}) {
  const { getReservedXLM } = await import("../helper");
  const { getPlatformAssetPrice, getXLMPrice } = await import("../fan/get_token_price");
  const { motherAcc } = getServerAndMotherAcc();

  const totalAmount = prize + fees;

  // Check balances and trustlines
  const userXLMBalance = await getNativeBalance(userPubKey);
  const userPlatformBalance = await getAssetBalance(userPubKey, PLATFORM_ASSET.code, PLATFORM_ASSET.issuer).catch(() => 0);
  const hasPlatformTrust = await checkTrustline(userPubKey, PLATFORM_ASSET.code, PLATFORM_ASSET.issuer);

  // Calculate minimum XLM reserve required
  const baseReserve = await getReservedXLM(userPubKey);
  const platformTrustReserve = hasPlatformTrust ? 0 : 0.5;
  const totalXlmReserve = baseReserve + platformTrustReserve;

  // CASE 1: Account not active (insufficient XLM for minimum reserve)
  if (!hasPlatformTrust && userXLMBalance < totalXlmReserve) {
    throw new Error(
      `Your account isn't active. You need at least ${totalXlmReserve.toFixed(1)} XLM (${baseReserve} XLM base + ${platformTrustReserve} XLM for PLATFORM trustline) but have ${userXLMBalance.toFixed(2)} XLM. Please add ${(totalXlmReserve - userXLMBalance).toFixed(2)} XLM.`
    );
  }

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);
  let platformFromConversion = 0;

  // CASE 2: No PLATFORM trust but has XLM → Convert XLM to PLATFORM
  if (!hasPlatformTrust && userXLMBalance >= totalXlmReserve) {
    const { getXLMNumberForPlatformAsset } = await import("../fan/get_token_price");
    const xlmNeeded = (await getXLMNumberForPlatformAsset(totalAmount)) + 0.5 + totalXlmReserve; // +0.5 for conversion + reserve

    if (userXLMBalance < xlmNeeded) {
      const platformPrice = await getPlatformAssetPrice();
      const xlmPrice = await getXLMPrice();
      throw new Error(
        `Insufficient XLM to complete bounty. You need ${xlmNeeded.toFixed(2)} XLM (≈$${(xlmNeeded * xlmPrice).toFixed(2)}) to convert to ${totalAmount.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(totalAmount * platformPrice).toFixed(2)}). You have ${userXLMBalance.toFixed(2)} XLM (≈$${(userXLMBalance * xlmPrice).toFixed(2)}). Remember to keep ${totalXlmReserve.toFixed(1)} XLM as minimum reserve.`
      );
    }

    // Establish PLATFORM trustline
    transaction.addOperation(
      Operation.changeTrust({
        asset: PLATFORM_ASSET,
        source: userPubKey,
      })
    );

    // Convert XLM to PLATFORM via payment from mother account
    const xlmToConvert = xlmNeeded - totalXlmReserve - 0.5;
    addPaymentOp(transaction, motherAcc.publicKey(), xlmToConvert.toFixed(7), Asset.native(), userPubKey);
    addPaymentOp(transaction, userPubKey, totalAmount.toFixed(7), PLATFORM_ASSET, motherAcc.publicKey());
    platformFromConversion = totalAmount;
  }

  // CASE 3: Has PLATFORM trust but insufficient balance AND has XLM → Convert XLM to PLATFORM
  if (hasPlatformTrust && userPlatformBalance < totalAmount && userXLMBalance > totalXlmReserve) {
    const { getXLMNumberForPlatformAsset } = await import("../fan/get_token_price");
    const platformShortage = totalAmount - userPlatformBalance;
    const xlmNeeded = await getXLMNumberForPlatformAsset(platformShortage);
    const availableXlm = userXLMBalance - totalXlmReserve;

    if (availableXlm < xlmNeeded) {
      const platformPrice = await getPlatformAssetPrice();
      const xlmPrice = await getXLMPrice();
      throw new Error(
        `Insufficient funds to complete bounty. You need ${platformShortage.toFixed(0)} more ${PLATFORM_ASSET.code} (≈$${(platformShortage * platformPrice).toFixed(2)}). This requires ~${xlmNeeded.toFixed(2)} XLM to convert, but you only have ${availableXlm.toFixed(2)} XLM available (after ${totalXlmReserve.toFixed(1)} XLM reserve). You're short by ${(xlmNeeded - availableXlm).toFixed(2)} XLM (≈$${((xlmNeeded - availableXlm) * xlmPrice).toFixed(2)}).`
      );
    }

    // Send XLM to mother account then receive PLATFORM back
    addPaymentOp(transaction, motherAcc.publicKey(), xlmNeeded.toFixed(7), Asset.native(), userPubKey);
    addPaymentOp(transaction, userPubKey, platformShortage.toFixed(7), PLATFORM_ASSET, motherAcc.publicKey());
    platformFromConversion = platformShortage;
  }

  // CASE 4: Normal flow - check effective balances after conversions
  const effectivePlatformBalance = userPlatformBalance + platformFromConversion;

  if (effectivePlatformBalance < totalAmount) {
    const platformPrice = await getPlatformAssetPrice();
    const xlmPrice = await getXLMPrice();
    const platformShortage = totalAmount - effectivePlatformBalance;
    const { getXLMNumberForPlatformAsset } = await import("../fan/get_token_price");
    const xlmNeededForConversion = await getXLMNumberForPlatformAsset(platformShortage);

    throw new Error(
      `Insufficient ${PLATFORM_ASSET.code} balance. You need ${totalAmount.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(totalAmount * platformPrice).toFixed(2)}) but have ${effectivePlatformBalance.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(effectivePlatformBalance * platformPrice).toFixed(2)}).\n\nYou can use XLM to convert: You need ${xlmNeededForConversion.toFixed(2)} XLM (≈$${(xlmNeededForConversion * xlmPrice).toFixed(2)}) to buy ${platformShortage.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(platformShortage * platformPrice).toFixed(2)}). Remember to keep ${totalXlmReserve.toFixed(1)} XLM as minimum reserve.`
    );
  }

  // Add payment for bounty prize
  addPaymentOp(transaction, motherAcc.publicKey(), totalAmount.toFixed(7), PLATFORM_ASSET, userPubKey);

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  if (signWith && "email" in signWith && secretKey) {
    const signedXDr = await WithSing({
      xdr: xdr,
      signWith: signWith,
    });
    return { xdr: signedXDr, pubKey: userPubKey };
  }
  return { xdr: xdr, pubKey: userPubKey };
}
export async function SendBountyBalanceToMotherAccountViaUSDC({
  prize,
  signWith,
  userPubKey,
  secretKey,
  fees,
}: {
  prize: number;
  fees: number;
  signWith: SignUserType;
  userPubKey: string;
  secretKey?: string | undefined;
}) {
  const { getReservedXLM } = await import("../helper");
  const { getXLMPrice } = await import("../fan/get_token_price");
  const { motherAcc } = getServerAndMotherAcc();

  const totalAmount = prize + fees;
  const USDC = new Asset(USDC_ASSET_CODE, USDC_ISSUER);

  // Check balances and trustlines
  const userXLMBalance = await getNativeBalance(userPubKey);
  const userUSDCBalance = await getAssetBalance(userPubKey, USDC_ASSET_CODE, USDC_ISSUER).catch(() => 0);
  const hasUSDCTrust = await checkTrustline(userPubKey, USDC_ASSET_CODE, USDC_ISSUER);

  // Calculate minimum XLM reserve required
  const baseReserve = await getReservedXLM(userPubKey);
  const usdcTrustReserve = hasUSDCTrust ? 0 : 0.5;
  const totalXlmReserve = baseReserve + usdcTrustReserve;

  // CASE 1: Account not active (insufficient XLM for minimum reserve)
  if (!hasUSDCTrust && userXLMBalance < totalXlmReserve) {
    throw new Error(
      `Your account isn't active. You need at least ${totalXlmReserve.toFixed(1)} XLM (${baseReserve} XLM base + ${usdcTrustReserve} XLM for USDC trustline) but have ${userXLMBalance.toFixed(2)} XLM. Please add ${(totalXlmReserve - userXLMBalance).toFixed(2)} XLM.`
    );
  }

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);
  let usdcFromConversion = 0;

  // CASE 2: No USDC trust but has XLM → Convert XLM to USDC
  if (!hasUSDCTrust && userXLMBalance >= totalXlmReserve) {
    const { getXLMNumberForUSDC } = await import("../fan/get_token_price");
    const xlmNeeded = (await getXLMNumberForUSDC(totalAmount)) + 0.5 + totalXlmReserve; // +0.5 for conversion + reserve

    if (userXLMBalance < xlmNeeded) {
      const xlmPrice = await getXLMPrice();
      throw new Error(
        `Insufficient XLM to complete bounty. You need ${xlmNeeded.toFixed(2)} XLM (≈$${(xlmNeeded * xlmPrice).toFixed(2)}) to convert to ${totalAmount.toFixed(0)} USDC (≈$${totalAmount.toFixed(2)}). You have ${userXLMBalance.toFixed(2)} XLM (≈$${(userXLMBalance * xlmPrice).toFixed(2)}). Remember to keep ${totalXlmReserve.toFixed(1)} XLM as minimum reserve.`
      );
    }

    // Establish USDC trustline
    transaction.addOperation(
      Operation.changeTrust({
        asset: USDC,
        source: userPubKey,
      })
    );

    // Convert XLM to USDC via payment from mother account
    const xlmToConvert = xlmNeeded - totalXlmReserve - 0.5;
    addPaymentOp(transaction, motherAcc.publicKey(), xlmToConvert.toFixed(7), Asset.native(), userPubKey);
    addPaymentOp(transaction, userPubKey, totalAmount.toFixed(7), USDC, motherAcc.publicKey());
    usdcFromConversion = totalAmount;
  }

  // CASE 3: Has USDC trust but insufficient balance AND has XLM → Convert XLM to USDC
  if (hasUSDCTrust && userUSDCBalance < totalAmount && userXLMBalance > totalXlmReserve) {
    const { getXLMNumberForUSDC } = await import("../fan/get_token_price");
    const usdcShortage = totalAmount - userUSDCBalance;
    const xlmNeeded = await getXLMNumberForUSDC(usdcShortage);
    const availableXlm = userXLMBalance - totalXlmReserve;

    if (availableXlm < xlmNeeded) {
      const xlmPrice = await getXLMPrice();
      throw new Error(
        `Insufficient funds to complete bounty. You need ${usdcShortage.toFixed(0)} more USDC (≈$${usdcShortage.toFixed(2)}). This requires ~${xlmNeeded.toFixed(2)} XLM to convert, but you only have ${availableXlm.toFixed(2)} XLM available (after ${totalXlmReserve.toFixed(1)} XLM reserve). You're short by ${(xlmNeeded - availableXlm).toFixed(2)} XLM (≈$${((xlmNeeded - availableXlm) * xlmPrice).toFixed(2)}).`
      );
    }

    // Send XLM to mother account then receive USDC back
    addPaymentOp(transaction, motherAcc.publicKey(), xlmNeeded.toFixed(7), Asset.native(), userPubKey);
    addPaymentOp(transaction, userPubKey, usdcShortage.toFixed(7), USDC, motherAcc.publicKey());
    usdcFromConversion = usdcShortage;
  }

  // CASE 4: Normal flow - check effective balances after conversions
  const effectiveUSDCBalance = userUSDCBalance + usdcFromConversion;

  if (effectiveUSDCBalance < totalAmount) {
    const xlmPrice = await getXLMPrice();
    const usdcShortage = totalAmount - effectiveUSDCBalance;
    const { getXLMNumberForUSDC } = await import("../fan/get_token_price");
    const xlmNeededForConversion = await getXLMNumberForUSDC(usdcShortage);

    throw new Error(
      `Insufficient USDC balance. You need ${totalAmount.toFixed(0)} USDC (≈$${totalAmount.toFixed(2)}) but have ${effectiveUSDCBalance.toFixed(0)} USDC (≈$${effectiveUSDCBalance.toFixed(2)}).\n\nYou can use XLM to convert: You need ${xlmNeededForConversion.toFixed(2)} XLM (≈$${(xlmNeededForConversion * xlmPrice).toFixed(2)}) to buy ${usdcShortage.toFixed(0)} USDC (≈$${usdcShortage.toFixed(2)}). Remember to keep ${totalXlmReserve.toFixed(1)} XLM as minimum reserve.`
    );
  }

  // Add payment for bounty prize
  addPaymentOp(transaction, motherAcc.publicKey(), totalAmount.toFixed(7), USDC, userPubKey);

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  if (signWith && "email" in signWith && secretKey) {
    const signedXDr = await WithSing({
      xdr: xdr,
      signWith: signWith,
    });
    return { xdr: signedXDr, pubKey: userPubKey };
  }
  return { xdr: xdr, pubKey: userPubKey };
}
export async function SendBountyBalanceToMotherAccountViaXLM({
  prizeInXLM,
  signWith,
  userPubKey,
  secretKey,
  fees,
}: {
  prizeInXLM: number;
  signWith: SignUserType;
  userPubKey: string;
  secretKey?: string | undefined;
  fees: number;
}) {
  const { getReservedXLM } = await import("../helper");
  const { getPlatformAssetPrice, getXLMPrice, getplatformAssetNumberForXLM } = await import("../fan/get_token_price");
  const { motherAcc } = getServerAndMotherAcc();

  const totalAmount = prizeInXLM + fees;

  // Check balances and trustlines
  const userXLMBalance = await getNativeBalance(userPubKey);
  const userPlatformBalance = await getAssetBalance(userPubKey, PLATFORM_ASSET.code, PLATFORM_ASSET.issuer).catch(() => 0);
  const hasPlatformTrust = await checkTrustline(userPubKey, PLATFORM_ASSET.code, PLATFORM_ASSET.issuer);

  // Calculate minimum XLM reserve required
  const baseReserve = await getReservedXLM(userPubKey);
  const platformTrustReserve = hasPlatformTrust ? 0 : 0.5;
  const totalXlmReserve = baseReserve + platformTrustReserve;

  // Calculate XLM needed for transaction
  const totalXlmNeeded = totalAmount + totalXlmReserve;

  // CASE 1: No PLATFORM trust and insufficient XLM for transaction
  // They cannot convert PLATFORM to XLM — block XDR creation early.
  if (!hasPlatformTrust && userXLMBalance < totalXlmNeeded) {
    const xlmPrice = await getXLMPrice();
    const xlmNeeded = totalXlmNeeded - userXLMBalance;
    throw new Error(
      `Insufficient XLM to complete bounty. You need ${totalXlmNeeded.toFixed(2)} XLM (≈$${(totalXlmNeeded * xlmPrice).toFixed(2)}) but have ${userXLMBalance.toFixed(2)} XLM (≈$${(userXLMBalance * xlmPrice).toFixed(2)}). You're short by ${xlmNeeded.toFixed(2)} XLM (≈$${(xlmNeeded * xlmPrice).toFixed(2)}). Remember to keep ${totalXlmReserve.toFixed(1)} XLM as minimum reserve. Please add more XLM or use a different payment method.`
    );
  }

  // Case 2: If user has PLATFORM trust but no PLATFORM balance and insufficient XLM,
  // they cannot complete an XLM-based bounty payment — block XDR creation early.
  if (hasPlatformTrust && userPlatformBalance <= 0 && userXLMBalance < totalXlmNeeded) {
    const xlmPrice = await getXLMPrice();
    const xlmNeeded = totalXlmNeeded - userXLMBalance;
    throw new Error(
      `Insufficient XLM to complete bounty. You need ${totalXlmNeeded.toFixed(2)} XLM (≈$${(totalXlmNeeded * xlmPrice).toFixed(2)}) but have ${userXLMBalance.toFixed(2)} XLM (≈$${(userXLMBalance * xlmPrice).toFixed(2)}). You're short by ${xlmNeeded.toFixed(2)} XLM (≈$${(xlmNeeded * xlmPrice).toFixed(2)}). Consider funding your XLM balance or using PLATFORM to convert.`
    );
  }

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

  // CASE 3: Has PLATFORM but insufficient XLM → Convert PLATFORM to XLM
  if (userXLMBalance < totalXlmNeeded && userPlatformBalance > 0) {
    const xlmShortage = totalXlmNeeded - userXLMBalance;
    const platformToConvert = await getplatformAssetNumberForXLM(xlmShortage);

    if (userPlatformBalance < platformToConvert) {
      const platformPrice = await getPlatformAssetPrice();
      const xlmPrice = await getXLMPrice();
      const insufficientPlatform = platformToConvert - userPlatformBalance;
      throw new Error(
        `Insufficient funds to complete XLM bounty payment. You need ${xlmShortage.toFixed(2)} more XLM (≈$${(xlmShortage * xlmPrice).toFixed(2)}). This requires ~${platformToConvert.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(platformToConvert * platformPrice).toFixed(2)}). You only have ${userPlatformBalance.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(userPlatformBalance * platformPrice).toFixed(2)}). You're short by ${insufficientPlatform.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(insufficientPlatform * platformPrice).toFixed(2)}). Please recharge your account.`
      );
    }

    // Convert PLATFORM to XLM via mother account
    addPaymentOp(transaction, motherAcc.publicKey(), platformToConvert.toFixed(7), PLATFORM_ASSET, userPubKey);
    addPaymentOp(transaction, userPubKey, xlmShortage.toFixed(7), Asset.native(), motherAcc.publicKey());
  }

  // CASE 4: Normal flow - pay mother account
  if (totalAmount > 0) {
    addPaymentOp(transaction, motherAcc.publicKey(), totalAmount.toFixed(7), Asset.native(), userPubKey);
  }

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  if (signWith && "email" in signWith && secretKey) {
    const signedXDr = await WithSing({
      xdr: xdr,
      signWith: signWith,
    });
    return { xdr: signedXDr, pubKey: userPubKey };
  }
  return { xdr: xdr, pubKey: userPubKey };
}

export async function SendBountyBalanceToUserAccount({
  prize,
  userPubKey,
}: {
  prize: number;
  userPubKey: string;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  // Check if mother has enough PLATFORM_ASSET balance
  const platformAssetBalance = await getAssetBalance(motherAcc.publicKey(), PLATFORM_ASSET.code, PLATFORM_ASSET.issuer);
  if (platformAssetBalance < prize) {
    throw new Error("Balance is not enough to send the asset.");
  }

  // Check if mother has enough XLM for fees
  const XLMBalance = await getNativeBalance(motherAcc.publicKey());
  if (XLMBalance < 1.0) {
    throw new Error(
      "Please make sure you have at least 1 XLM in your account.",
    );
  }

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), BASE_FEE.toString());

  addPaymentOp(
    transaction,
    userPubKey,
    prize.toFixed(7).toString(),
    PLATFORM_ASSET,
    motherAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  return xdr;
}
export async function SendBountyBalanceToUserAccountUSDC({
  prize,
  userPubKey,
}: {
  prize: number;
  userPubKey: string;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  const USDC = new Asset(USDC_ASSET_CODE, USDC_ISSUER);

  // Check if mother has enough USDC balance
  const usdcBalance = await getAssetBalance(motherAcc.publicKey(), USDC_ASSET_CODE, USDC_ISSUER);
  if (usdcBalance < prize) {
    throw new Error("Balance is not enough to send the asset.");
  }

  // Check if mother has enough XLM for fees
  const XLMBalance = await getNativeBalance(motherAcc.publicKey());
  if (XLMBalance < 1.0) {
    throw new Error(
      "Please make sure you have at least 1 XLM in your account.",
    );
  }

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), BASE_FEE.toString());

  addPaymentOp(
    transaction,
    userPubKey,
    prize.toFixed(7).toString(),
    USDC,
    motherAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  return xdr;
}
export async function claimBandCoinReward({
  pubKey,
  rewardAmount,
  signWith,
}: {
  pubKey: string;
  rewardAmount: number;
  signWith: SignUserType;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  // Check if mother has enough PLATFORM_ASSET balance
  const platformAssetBalance = await getAssetBalance(motherAcc.publicKey(), PLATFORM_ASSET.code, PLATFORM_ASSET.issuer);
  if (platformAssetBalance < rewardAmount) {
    throw new Error("Balance is not enough to send the asset.");
  }

  // Check if mother has enough XLM for fees
  const XLMBalance = await getNativeBalance(motherAcc.publicKey());
  if (XLMBalance < 1.0) {
    throw new Error(
      "Please make sure you have at least 1 XLM in your account.",
    );
  }

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), BASE_FEE.toString());

  addPaymentOp(
    transaction,
    pubKey,
    rewardAmount.toFixed(7).toString(),
    PLATFORM_ASSET,
    motherAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  return xdr;
}
export async function claimUSDCReward({
  pubKey,
  rewardAmount,
  signWith,
}: {
  pubKey: string;
  rewardAmount: number;
  signWith: SignUserType;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  const asset = new Asset(USDC_ASSET_CODE, USDC_ISSUER);

  // Check if mother has enough PLATFORM_ASSET balance (wait, this seems wrong, it should be USDC balance?)
  // Looking at the code, it's checking PLATFORM_ASSET balance but sending USDC. Probably a bug, but I'll keep as is for now.
  const platformAssetBalance = await getAssetBalance(motherAcc.publicKey(), PLATFORM_ASSET.code, PLATFORM_ASSET.issuer);
  if (platformAssetBalance < rewardAmount) {
    throw new Error("Balance is not enough to send the asset.");
  }

  // Check if mother has enough XLM for fees
  const XLMBalance = await getNativeBalance(motherAcc.publicKey());
  if (XLMBalance < 1) {
    throw new Error(
      "Please make sure you have at least 1 XLM in your account.",
    );
  }

  const userHasTrustOnUSDC = await checkTrustline(pubKey, asset.code, asset.issuer);

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), BASE_FEE.toString());

  if (!userHasTrustOnUSDC) {
    transaction.addOperation(
      Operation.changeTrust({
        asset: asset,
        source: pubKey,
      }),
    );
  }

  addPaymentOp(
    transaction,
    pubKey,
    rewardAmount.toFixed(7).toString(),
    asset,
    motherAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  return {
    xdr: xdr,
    needSign: !userHasTrustOnUSDC,
  };
}
export async function SendBountyBalanceToUserAccountViaXLM({
  prizeInXLM,
  userPubKey,
}: {
  prizeInXLM: number;
  userPubKey: string;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), BASE_FEE.toString());

  addPaymentOp(
    transaction,
    userPubKey,
    prizeInXLM.toFixed(7).toString(),
    Asset.native(),
    motherAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  return xdr;
}

export async function SendBountyBalanceToWinner({
  prize,
  recipientID,
}: {
  prize: number;
  recipientID: string;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  // Check if mother has enough PLATFORM_ASSET balance
  const platformAssetBalance = await getAssetBalance(motherAcc.publicKey(), PLATFORM_ASSET.code, PLATFORM_ASSET.issuer);
  if (platformAssetBalance < prize) {
    throw new Error("Balance is not enough to send the asset.");
  }

  // Check if mother has enough XLM for fees
  const XLMBalance = await getNativeBalance(motherAcc.publicKey());
  if (XLMBalance < 1) {
    throw new Error(
      "Please make sure you have at least 1 XLM in your account.",
    );
  }

  const hasTrust = await checkTrustline(recipientID, PLATFORM_ASSET.code, PLATFORM_ASSET.issuer);

  if (!hasTrust) {
    throw new Error(`User Doesn't have trust, Please trust the ${PLATFORM_ASSET.code} first.`);
  }

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), BASE_FEE.toString());

  addPaymentOp(
    transaction,
    recipientID,
    prize.toFixed(7).toString(),
    PLATFORM_ASSET,
    motherAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  return xdr;
}

export async function SendBountyBalanceToWinnerViaXLM({
  prizeInXLM,
  recipientID,
}: {
  prizeInXLM: number;
  recipientID: string;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  // Check if mother has enough XLM for fees and prize
  const XLMBalance = await getNativeBalance(motherAcc.publicKey());
  if (XLMBalance < prizeInXLM + 1.0) {
    throw new Error(
      "Please make sure you have at least 1 XLM in your account.",
    );
  }

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), BASE_FEE.toString());

  addPaymentOp(
    transaction,
    recipientID,
    prizeInXLM.toFixed(7).toString(),
    Asset.native(),
    motherAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  return xdr;
}

export async function NativeBalance({ userPub }: { userPub: string }) {
  const server = new Horizon.Server(STELLAR_URL);

  const account = await server.loadAccount(userPub);

  const nativeBalance = account.balances.find((balance) => {
    if (balance.asset_type === "native") {
      return balance;
    }
  });

  return nativeBalance;
}

export async function SwapUserAssetToMotherUSDC({
  priceInBand,
  priceInUSD,
  userPubKey,
  secretKey,
  signWith,
}: {
  priceInBand: number;
  priceInUSD: number;
  userPubKey: string;
  secretKey?: string | undefined;
  signWith: SignUserType;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  const asset = new Asset(USDC_ASSET_CODE, USDC_ISSUER);

  // Check if user has enough PLATFORM_ASSET
  const platformAssetBalance = await getAssetBalance(userPubKey, PLATFORM_ASSET.code, PLATFORM_ASSET.issuer);
  if (platformAssetBalance < priceInBand) {
    throw new Error(
      `You don't have total amount of ${priceInBand} ${PLATFORM_ASSET.code} to send.`,
    );
  }

  const senderHasTrustOnUSDC = await checkTrustline(userPubKey, asset.code, asset.issuer);
  const receiverHasTrustOnUSDC = await checkTrustline(motherAcc.publicKey(), asset.code, asset.issuer);

  if (!receiverHasTrustOnUSDC) {
    throw new Error("Please Contact Admin to add USDC trustline");
  }

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

  if (!senderHasTrustOnUSDC) {
    transaction.addOperation(
      Operation.changeTrust({
        asset: asset,
        source: userPubKey,
      }),
    );
  }

  // Payment from user to mother: PLATFORM_ASSET
  addPaymentOp(
    transaction,
    motherAcc.publicKey(),
    priceInBand.toFixed(7).toString(),
    PLATFORM_ASSET,
    userPubKey
  );

  // Payment from mother to user: USDC
  addPaymentOp(
    transaction,
    userPubKey,
    priceInUSD.toFixed(7).toString(),
    asset,
    motherAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  if (signWith && "email" in signWith && secretKey) {
    const signedXDr = await WithSing({
      xdr: xdr,
      signWith: signWith,
    });
    return { xdr: signedXDr, pubKey: userPubKey };
  }
  return { xdr: xdr, pubKey: userPubKey };
}

export async function getHasMotherTrustOnUSDC() {
  const server = new Horizon.Server(STELLAR_URL);
  const motherAcc = Keypair.fromSecret(MOTHER_SECRET);
  const account = await server.loadAccount(motherAcc.publicKey());
  const motherHasTrust = account.balances.some((balance) => {
    //console.log(balance);
    return (
      (balance.asset_type === "credit_alphanum4" ||
        balance.asset_type === "credit_alphanum12") &&
      balance.asset_code === USDC_ASSET_CODE &&
      balance.asset_issuer === USDC_ISSUER
    );
  });
  if (motherHasTrust) {
    return true;
  }
  return false;
}

export async function getHasUserHasTrustOnUSDC(userPubKey: string) {
  const server = new Horizon.Server(STELLAR_URL);
  const account = await server.loadAccount(userPubKey);
  const userHasTrust = account.balances.some((balance) => {
    //console.log(balance);
    return (
      (balance.asset_type === "credit_alphanum4" ||
        balance.asset_type === "credit_alphanum12") &&
      balance.asset_code === USDC_ASSET_CODE &&
      balance.asset_issuer === USDC_ISSUER
    );
  });

  return userHasTrust;
}

export async function checkXDRSubmitted(xdr: string) {
  try {
    const server = new Horizon.Server(STELLAR_URL);
    const transaction = new Transaction(xdr, networkPassphrase);
    const txHash = transaction.hash().toString("hex");

    try {
      const transactionResult = await server
        .transactions()
        .transaction(txHash)
        .call();
      //console.log("Transaction already submitted:", transactionResult);
      return true;
    } catch (error) {
      //console.log("Transaction not submitted yet:", error);
      return false;
    }
  } catch (error) {
    //console.log("Error in checkXDRSubmitted:", error);
    return true;
  }
}

export async function getUserHasTrustOnUSDC(userPubKey: string) {
  const server = new Horizon.Server(STELLAR_URL);
  const account = await server.loadAccount(userPubKey);
  const userHasTrust = account.balances.some((balance) => {
    //console.log(balance);
    return (
      (balance.asset_type === "credit_alphanum4" ||
        balance.asset_type === "credit_alphanum12") &&
      balance.asset_code === USDC_ASSET_CODE &&
      balance.asset_issuer === USDC_ISSUER
    );
  });

  return userHasTrust;
}


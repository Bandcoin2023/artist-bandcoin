import {
  Asset,
  Keypair,
  Operation,
} from "@stellar/stellar-sdk";
import {
  PLATFORM_ASSET,
  PLATFORM_FEE,

  TrxBaseFee,
  TrxBaseFeeInPlatformAsset,

} from "./constant";
import { getplatformAssetNumberForXLM, getXLMPrice, getPlatformAssetPrice } from "./fan/get_token_price";
import type { AccountType } from "./fan/utils";
import type { SignUserType } from "./utils";
import { WithSing } from "./utils";
import { addPaymentOp, createTransactionBuilder, finalizeTransaction, getServerAndMotherAcc, checkTrustline, getNativeBalance, getAssetBalance, getReservedXLM } from "./helper";

//bandcoin,actionverse
export async function createUniAsset({
  pubkey,
  code,
  limit,
  signWith,
  homeDomain,
  storageSecret,
  ipfsHash,
}: {
  pubkey: string;
  code: string;
  limit: string;
  storageSecret: string;
  signWith: SignUserType;
  homeDomain: string;
  ipfsHash: string;
}) {
  // Step 1: Extract the IPFS hash from the provided URL
  const extractHash = ipfsHash.split("/").pop();

  if (!extractHash) {
    throw new Error("Invalid ipfsHash");
  }

  // Step 2: Generate a new random keypair for the asset issuer
  const issuerAcc = Keypair.random();
  // Get the storage account keypair from the provided secret
  const assetStorage = Keypair.fromSecret(storageSecret);
  // Get the platform's mother account
  const { motherAcc } = getServerAndMotherAcc();

  // Step 3: Create the asset object with the code and issuer's public key
  const asset = new Asset(code, issuerAcc.publicKey());

  // Step 4: Calculate the platform asset needed for 2 XLM refund
  const requiredAsset2refundXlm = await getplatformAssetNumberForXLM(2);
  // Calculate total platform fee including base fees
  const total =
    requiredAsset2refundXlm +
    Number(PLATFORM_FEE) +
    Number(TrxBaseFeeInPlatformAsset);
  console.log(`Total platform fee in ${PLATFORM_ASSET.code}: ${total.toFixed(2)}`);
  // Step 4a: Check user balances for conversion scenarios
  const userXLMBalance = await getNativeBalance(pubkey);
  const userPlatformBalance = await getAssetBalance(
    pubkey,
    PLATFORM_ASSET.code,
    PLATFORM_ASSET.issuer
  ).catch(() => 0);

  const hasPlatformTrust = await checkTrustline(
    pubkey,
    PLATFORM_ASSET.code,
    PLATFORM_ASSET.issuer
  );
  const baseReserve = await getReservedXLM(pubkey);
  const platformTrustReserve = hasPlatformTrust ? 0 : 0.5;
  const totalXlmReserve = baseReserve + platformTrustReserve;

  // Step 5: Create transaction builder starting from mother account
  const Tx1 = await createTransactionBuilder(
    motherAcc.publicKey(),
    TrxBaseFee
  );

  // Track conversion amounts to calculate effective balance
  let platformFromConversion = 0;
  const platformPrice = await getPlatformAssetPrice();
  const xlmPrice = await getXLMPrice();

  // Step 5a: Handle conversion scenarios for PLATFORM asset payment
  // CASE 1: Account not active (insufficient XLM for minimum reserve)
  if (!hasPlatformTrust && userXLMBalance < totalXlmReserve) {
    throw new Error(
      `Your account isn't active. You need at least ${totalXlmReserve.toFixed(1)} XLM (${baseReserve} XLM base + ${platformTrustReserve} XLM for ${PLATFORM_ASSET.code} trustline) but have ${userXLMBalance.toFixed(2)} XLM. Please add ${(totalXlmReserve - userXLMBalance).toFixed(2)} XLM.`
    );
  }

  // CASE 2: No PLATFORM trust but has XLM → Convert XLM to PLATFORM
  if (!hasPlatformTrust && userXLMBalance >= totalXlmReserve) {
    const { getXLMNumberForPlatformAsset } = await import("./fan/get_token_price");
    const xlmNeeded = (await getXLMNumberForPlatformAsset(total)) + 0.5 + totalXlmReserve; // +0.5 for conversion + reserve

    if (userXLMBalance < xlmNeeded) {
      throw new Error(
        `Insufficient XLM to complete NFT creation. You need ${xlmNeeded.toFixed(2)} XLM (≈$${(xlmNeeded * xlmPrice).toFixed(2)}) to convert to ${total.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(total * platformPrice).toFixed(2)}). You have ${userXLMBalance.toFixed(2)} XLM (≈$${(userXLMBalance * xlmPrice).toFixed(2)}). Remember to keep ${totalXlmReserve.toFixed(1)} XLM as minimum reserve.`
      );
    }

    // Establish PLATFORM trustline
    Tx1.addOperation(
      Operation.changeTrust({
        asset: PLATFORM_ASSET,
        source: pubkey,
      })
    );

    // Convert XLM to PLATFORM via payment from mother account
    const xlmToConvert = (xlmNeeded + platformTrustReserve) - totalXlmReserve - 0.5;
    addPaymentOp(Tx1, motherAcc.publicKey(), xlmToConvert.toFixed(7), Asset.native(), pubkey);
    addPaymentOp(Tx1, pubkey, total.toFixed(7), PLATFORM_ASSET, motherAcc.publicKey());
    platformFromConversion = total;
  }

  // CASE 3: Has PLATFORM trust but insufficient balance AND has XLM → Convert XLM to PLATFORM
  if (hasPlatformTrust && userPlatformBalance < total && userXLMBalance > totalXlmReserve) {
    const { getXLMNumberForPlatformAsset } = await import("./fan/get_token_price");
    const platformShortage = total - userPlatformBalance;
    const xlmNeeded = await getXLMNumberForPlatformAsset(platformShortage);
    const availableXlm = userXLMBalance - totalXlmReserve;

    if (availableXlm < xlmNeeded) {
      throw new Error(
        `Insufficient funds to complete NFT creation. You need ${platformShortage.toFixed(0)} more ${PLATFORM_ASSET.code} (≈$${(platformShortage * platformPrice).toFixed(2)}). This requires ~${xlmNeeded.toFixed(2)} XLM to convert, but you only have ${availableXlm.toFixed(2)} XLM available (after ${totalXlmReserve.toFixed(1)} XLM reserve). You're short by ${(xlmNeeded - availableXlm).toFixed(2)} XLM (≈$${((xlmNeeded - availableXlm) * xlmPrice).toFixed(2)}).`
      );
    }

    // Send XLM to mother account then receive PLATFORM back
    addPaymentOp(Tx1, motherAcc.publicKey(), xlmNeeded.toFixed(7), Asset.native(), pubkey);
    addPaymentOp(Tx1, pubkey, platformShortage.toFixed(7), PLATFORM_ASSET, motherAcc.publicKey());
    platformFromConversion = platformShortage;
  }

  // CASE 4: Normal flow - check effective balances after conversions
  const effectivePlatformBalance = userPlatformBalance + platformFromConversion;

  if (effectivePlatformBalance < total) {
    const platformShortage = total - effectivePlatformBalance;
    const { getXLMNumberForPlatformAsset } = await import("./fan/get_token_price");
    const xlmNeededForConversion = await getXLMNumberForPlatformAsset(platformShortage);

    throw new Error(
      `Insufficient ${PLATFORM_ASSET.code} balance. You need ${total.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(total * platformPrice).toFixed(2)}) but have ${effectivePlatformBalance.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(effectivePlatformBalance * platformPrice).toFixed(2)}). \\n\\nYou can use XLM to convert: You need ${xlmNeededForConversion.toFixed(2)} XLM (≈$${(xlmNeededForConversion * xlmPrice).toFixed(2)}) to buy ${platformShortage.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(platformShortage * platformPrice).toFixed(2)}). Remember to keep ${totalXlmReserve.toFixed(1)} XLM as minimum reserve.`
    );
  }

  // Step 6: Add payment for platform fee in platform asset from user to mother
  addPaymentOp(
    Tx1,
    motherAcc.publicKey(),
    total.toString(),
    PLATFORM_ASSET,
    pubkey
  );

  // Step 7: Send 2 XLM to storage account for trustline setup
  addPaymentOp(
    Tx1,
    assetStorage.publicKey(),
    "2",
    Asset.native(),
    motherAcc.publicKey()
  );

  // Step 8: Create the issuer account with starting balance
  Tx1.addOperation(
    Operation.createAccount({
      destination: issuerAcc.publicKey(),
      startingBalance: "1.5",
      source: assetStorage.publicKey(),
    })
  );

  // Step 9: Add trustline for the asset on storage account
  Tx1.addOperation(
    Operation.changeTrust({
      asset,
      limit: limit,
      source: assetStorage.publicKey(),
    })
  );

  // Step 10: Send the full token supply to storage account
  addPaymentOp(
    Tx1,
    assetStorage.publicKey(),
    limit,
    asset,
    issuerAcc.publicKey()
  );

  // Step 11: Set the home domain for the issuer account
  Tx1.addOperation(
    Operation.setOptions({
      homeDomain,
      source: issuerAcc.publicKey(),
    })
  );

  // Step 12: Store the IPFS hash as data on the issuer account
  Tx1.addOperation(
    Operation.manageData({
      name: "ipfshash",
      value: extractHash,
      source: issuerAcc.publicKey(),
    })
  );

  // Step 13: Finalize the transaction with signatures from mother, issuer, and storage
  const xdr = finalizeTransaction(Tx1, [
    motherAcc,
    issuerAcc,
    assetStorage,
  ]);

  // Step 14: Add user signature
  const signedXDr = await WithSing({ xdr, signWith });

  // Step 15: Return the signed XDR and issuer account details
  const issuer: AccountType = {
    publicKey: issuerAcc.publicKey(),
    secretKey: issuerAcc.secret(),
  };

  return { xdr: signedXDr, issuer };
}

export async function createUniAssetWithXLM({
  pubkey,
  code,
  limit,
  signWith,
  homeDomain,
  storageSecret,
  ipfsHash,
}: {
  pubkey: string;
  code: string;
  limit: string;
  actionAmount: string;
  storageSecret: string;
  signWith: SignUserType;
  homeDomain: string;
  ipfsHash: string;
}) {
  // Step 1: Generate a new random keypair for the asset issuer
  const issuerAcc = Keypair.random();
  // Get the storage account keypair from the provided secret
  const assetStorage = Keypair.fromSecret(storageSecret);
  // Get the platform's mother account
  const { motherAcc: PLATFORM_MOTHER_ACC } = getServerAndMotherAcc();

  // Step 2: Create the asset object with the code and issuer's public key
  const asset = new Asset(code, issuerAcc.publicKey());

  // Step 2a: Calculate XLM needed for transaction (2 XLM platform fee + 2 XLM for storage)
  const xlmNeededForTransaction = 2; // Platform fee (2 XLM) + storage setup (2 XLM)

  // Step 2b: Check user balances for conversion scenarios
  const userXLMBalance = await getNativeBalance(pubkey);
  const userPlatformBalance = await getAssetBalance(
    pubkey,
    PLATFORM_ASSET.code,
    PLATFORM_ASSET.issuer
  ).catch(() => 0);
  const hasPlatformTrust = await checkTrustline(
    pubkey,
    PLATFORM_ASSET.code,
    PLATFORM_ASSET.issuer
  );
  const baseReserve = await getReservedXLM(pubkey);
  const platformTrustReserve = hasPlatformTrust ? 0 : 0.5;
  const totalXlmReserve = baseReserve + platformTrustReserve;
  const totalXlmNeeded = xlmNeededForTransaction + totalXlmReserve;

  // Step 3: Create transaction builder starting from the user's account
  const Tx1 = await createTransactionBuilder(pubkey, TrxBaseFee);

  const xlmPrice = await getXLMPrice();
  const platformPrice = await getPlatformAssetPrice();

  // Step 3a: Handle conversion scenarios for XLM payment
  // CASE 1: No PLATFORM trust and insufficient XLM for transaction
  // They cannot convert PLATFORM to XLM — block XDR creation early.
  if (!hasPlatformTrust && userXLMBalance < totalXlmNeeded) {
    const xlmNeeded = totalXlmNeeded - userXLMBalance;
    throw new Error(
      `Insufficient XLM to create NFT. You need ${totalXlmNeeded.toFixed(2)} XLM (≈$${(totalXlmNeeded * xlmPrice).toFixed(2)}) but have ${userXLMBalance.toFixed(2)} XLM (≈$${(userXLMBalance * xlmPrice).toFixed(2)}). You're short by ${xlmNeeded.toFixed(2)} XLM (≈$${(xlmNeeded * xlmPrice).toFixed(2)}). Remember to keep ${totalXlmReserve.toFixed(1)} XLM as minimum reserve. Please add more XLM or use PLATFORM payment method.`
    );
  }

  // CASE 2: Has PLATFORM trust but no PLATFORM balance and insufficient XLM
  // They cannot complete an XLM-based NFT creation — block XDR creation early.
  if (hasPlatformTrust && userPlatformBalance <= 0 && userXLMBalance < totalXlmNeeded) {
    const xlmNeeded = totalXlmNeeded - userXLMBalance;
    throw new Error(
      `Insufficient XLM to create NFT. You need ${totalXlmNeeded.toFixed(2)} XLM (≈$${(totalXlmNeeded * xlmPrice).toFixed(2)}) but have ${userXLMBalance.toFixed(2)} XLM (≈$${(userXLMBalance * xlmPrice).toFixed(2)}). You're short by ${xlmNeeded.toFixed(2)} XLM (≈$${(xlmNeeded * xlmPrice).toFixed(2)}). Consider funding your XLM balance or using PLATFORM to convert.`
    );
  }

  // CASE 3: Has PLATFORM but insufficient XLM → Convert PLATFORM to XLM
  if (userXLMBalance < totalXlmNeeded && userPlatformBalance > 0) {
    const xlmShortage = totalXlmNeeded - userXLMBalance;
    const { getplatformAssetNumberForXLM } = await import("./fan/get_token_price");
    const platformToConvert = await getplatformAssetNumberForXLM(xlmShortage);

    if (userPlatformBalance < platformToConvert) {
      const insufficientPlatform = platformToConvert - userPlatformBalance;
      throw new Error(
        `Insufficient funds to complete NFT creation with XLM. You need ${xlmShortage.toFixed(2)} more XLM (≈$${(xlmShortage * xlmPrice).toFixed(2)}). This requires ~${platformToConvert.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(platformToConvert * platformPrice).toFixed(2)}). You only have ${userPlatformBalance.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(userPlatformBalance * platformPrice).toFixed(2)}). You're short by ${insufficientPlatform.toFixed(0)} ${PLATFORM_ASSET.code} (≈$${(insufficientPlatform * platformPrice).toFixed(2)}). Please recharge your account or use PLATFORM payment method instead.`
      );
    }

    // Convert PLATFORM to XLM via mother account
    addPaymentOp(Tx1, PLATFORM_MOTHER_ACC.publicKey(), platformToConvert.toFixed(7), PLATFORM_ASSET, pubkey);
    addPaymentOp(Tx1, pubkey, xlmShortage.toFixed(7), Asset.native(), PLATFORM_MOTHER_ACC.publicKey());
  }


  // Step 4: Send 2 XLM to storage account for trustline setup
  addPaymentOp(
    Tx1,
    assetStorage.publicKey(),
    "2",
    Asset.native()
  );

  // Step 5: Create the issuer account with starting balance
  Tx1.addOperation(
    Operation.createAccount({
      destination: issuerAcc.publicKey(),
      startingBalance: "1.5",
      source: assetStorage.publicKey(),
    })
  );

  // Step 6: Add trustline for the asset on storage account
  Tx1.addOperation(
    Operation.changeTrust({
      asset,
      limit: limit,
      source: assetStorage.publicKey(),
    })
  );

  // Step 7: Send the full token supply to storage account
  addPaymentOp(
    Tx1,
    assetStorage.publicKey(),
    limit,
    asset,
    issuerAcc.publicKey()
  );

  // Step 8: Set the home domain for the issuer account
  Tx1.addOperation(
    Operation.setOptions({
      homeDomain,
      source: issuerAcc.publicKey(),
    })
  );

  // Step 9: Store the IPFS hash as data on the issuer account
  Tx1.addOperation(
    Operation.manageData({
      name: "ipfshash",
      value: ipfsHash,
      source: issuerAcc.publicKey(),
    })
  );

  // Step 10: Finalize the transaction with signatures from issuer and storage
  const xdr = finalizeTransaction(Tx1, [issuerAcc, assetStorage]);

  // Step 11: Add user signature
  const signedXDr = await WithSing({ xdr, signWith });

  // Step 12: Return the signed XDR and issuer account details
  const issuer: AccountType = {
    publicKey: issuerAcc.publicKey(),
    secretKey: issuerAcc.secret(),
  };

  return { xdr: signedXDr, issuer };
}
import { Asset, Keypair } from "@stellar/stellar-sdk";
import {
  PLATFORM_ASSET,
  SIMPLIFIED_FEE,
  SIMPLIFIED_FEE_IN_XLM,
  TrxBaseFee,
} from "../../constant";
import type { SignUserType } from "../../utils";
import { WithSing } from "../../utils";
import { getplatformAssetNumberForXLM } from "../../fan/get_token_price";
import {
  getServerAndMotherAcc,
  createTransactionBuilder,
  checkTrustline,
  addTrustlineSetup,
  addPaymentOp,
  finalizeTransaction,
  getAssetBalance,
  getNativeBalance,
} from "../../helper";

// Shared helper for building and signing transaction
async function buildAssetBuyTransaction({
  signWith,
  code,
  amountToSell,
  issuer,
  storageSecret,
  userId,
  price,
  paymentAsset,
  xlm,
}: {
  signWith: SignUserType;
  code: string;
  amountToSell: number;
  issuer: string;
  price: number;
  storageSecret: string;
  userId: string;
  paymentAsset: Asset;
  xlm?: boolean;
}) {
  try {
    const assetToBuy = new Asset(code, issuer);
    const { motherAcc } = getServerAndMotherAcc();
    const storageKeypair = Keypair.fromSecret(storageSecret);

    // Validate trustline
    const hasTrust = await checkTrustline(userId, assetToBuy.code, assetToBuy.issuer);

    // Validate balances
    let storageBalance;
    if (assetToBuy.isNative()) {
      storageBalance = await getNativeBalance(storageKeypair.publicKey());
    } else {
      storageBalance = await getAssetBalance(storageKeypair.publicKey(), assetToBuy.code, assetToBuy.issuer);
    }

    if (storageBalance < amountToSell) {
      throw new Error("Insufficient asset balance in storage account.");
    }

    let userBalance;
    if (paymentAsset.isNative()) {
      userBalance = await getNativeBalance(userId);
    } else {
      userBalance = await getAssetBalance(userId, paymentAsset.code, paymentAsset.issuer);
    }

    if (userBalance < price) {
      throw new Error("User has insufficient balance for payment.");
    }

    // calculate fee for xlm and platform asset
    let totalFee = 0;
    const trxXlmRequired = hasTrust ? 0.5 : 0; // xlm required for trustline

    if (xlm) {
      totalFee = trxXlmRequired + SIMPLIFIED_FEE_IN_XLM;
    } else {
      const requiredAsset2refundXlm =
        await getplatformAssetNumberForXLM(trxXlmRequired);
      totalFee = requiredAsset2refundXlm + SIMPLIFIED_FEE;
    }

    const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

    // Add trustline if missing
    if (!hasTrust) {
      addTrustlineSetup(transaction, userId, assetToBuy, motherAcc.publicKey());
    }

    // Transfer asset to user
    addPaymentOp(
      transaction,
      userId,
      amountToSell.toFixed(7),
      assetToBuy,
      storageKeypair.publicKey()
    );

    // Transfer payment from user to storage
    addPaymentOp(
      transaction,
      storageKeypair.publicKey(),
      (price + totalFee).toFixed(7),
      paymentAsset,
      userId
    );

    const xdr = finalizeTransaction(transaction, [motherAcc, storageKeypair]);

    const signedXdr = await WithSing({
      xdr,
      signWith,
    });

    return {
      xdr: signedXdr,
    };
  } catch (error) {
    console.error("Error building asset buy transaction:", error);
    throw error;
  }
}

// Buy using platform asset
export const GetPageAssetBuyXDRInPlatform = async (params: {
  code: string;
  amountToSell: number;
  issuer: string;
  price: number;
  storageSecret: string;
  userId: string;
  signWith: SignUserType;
}) => {
  return await buildAssetBuyTransaction({
    ...params,
    paymentAsset: PLATFORM_ASSET,
  });
};

// Buy using native XLM
export const GetPageAssetBuyXDRInXLM = async (params: {
  code: string;
  amountToSell: number;
  issuer: string;
  priceXLM: number;
  storageSecret: string;
  userId: string;
  signWith: SignUserType;
}) => {
  const { priceXLM, ...rest } = params;
  return await buildAssetBuyTransaction({
    ...rest,
    price: priceXLM,
    paymentAsset: Asset.native(),
    xlm: true,
  });
};

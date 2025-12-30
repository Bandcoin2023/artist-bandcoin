import { Asset, Keypair } from "@stellar/stellar-sdk";
import {
  PLATFORM_ASSET,
  PLATFORM_FEE,
  TrxBaseFee,
  TrxBaseFeeInPlatformAsset,
} from "../../constant";
import { getplatformAssetNumberForXLM } from "../../fan/get_token_price";
import type { SignUserType } from "../../utils";
import { WithSing } from "../../utils";
import {
  getServerAndMotherAcc,
  createTransactionBuilder,
  checkTrustline,
  addTrustlineSetup,
  addPaymentOp,
  finalizeTransaction,
} from "../../helper";

export async function sendNft2StorageXDR({
  assetCode,
  issuerPub,
  assetAmount,
  userPub,
  storageSec,
  signWith,
}: {
  userPub: string;
  storageSec: string;
  assetCode: string;
  issuerPub: string;
  assetAmount: string;
  signWith: SignUserType;
}) {
  const asset = new Asset(assetCode, issuerPub);
  const { motherAcc } = getServerAndMotherAcc();
  const storageAcc = Keypair.fromSecret(storageSec);

  const hasTrust = await checkTrustline(storageAcc.publicKey(), asset.code, asset.issuer);

  const totalFee =
    Number(PLATFORM_FEE) +
    Number(TrxBaseFeeInPlatformAsset) +
    (hasTrust ? 0 : await getplatformAssetNumberForXLM(0.5));

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

  if (!hasTrust) {
    addTrustlineSetup(transaction, storageAcc.publicKey(), asset, motherAcc.publicKey());
  }

  addPaymentOp(
    transaction,
    motherAcc.publicKey(),
    totalFee.toFixed(7),
    PLATFORM_ASSET,
    userPub
  );

  addPaymentOp(
    transaction,
    storageAcc.publicKey(),
    assetAmount,
    asset,
    userPub
  );

  const xdr = finalizeTransaction(transaction, [motherAcc, storageAcc]);

  return await WithSing({ xdr, signWith });
}

export async function sendNftback({
  assetCode,
  issuerPub,
  assetAmount,
  userPub,
  storageSecret,
  signWith,
}: {
  userPub: string;
  storageSecret: string;
  assetCode: string;
  issuerPub: string;
  assetAmount: string;
  signWith: SignUserType;
}) {
  const asset = new Asset(assetCode, issuerPub);
  const storageAcc = Keypair.fromSecret(storageSecret);
  const { motherAcc } = getServerAndMotherAcc();

  const hasTrust = await checkTrustline(userPub, assetCode, issuerPub);

  const totalFee =
    Number(TrxBaseFeeInPlatformAsset) +
    Number(PLATFORM_FEE) +
    (hasTrust ? 0 : await getplatformAssetNumberForXLM(0.5));

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

  // Add platform fee
  addPaymentOp(
    transaction,
    motherAcc.publicKey(),
    totalFee.toFixed(7),
    PLATFORM_ASSET,
    userPub
  );

  if (!hasTrust) {
    addTrustlineSetup(transaction, userPub, asset, motherAcc.publicKey());
  }

  addPaymentOp(
    transaction,
    userPub,
    assetAmount,
    asset,
    storageAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [storageAcc, motherAcc]);

  return await WithSing({ xdr, signWith });
}

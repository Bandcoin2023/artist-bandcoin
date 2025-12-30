import {
  Asset,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { env } from "~/env";
import {
  PLATFORM_ASSET,
  PLATFORM_FEE,
  STELLAR_URL,
  TrxBaseFee,
  TrxBaseFeeInPlatformAsset,
  networkPassphrase,
} from "../constant";
import { SignUserType, WithSing } from "../utils";
import { P } from "pino";
import { getplatformAssetNumberForXLM } from "./get_token_price";
import { getServerAndMotherAcc, createTransactionBuilder, addPaymentOp, finalizeTransaction, addTrustlineSetup } from "../helper";

export async function createRedeemXDRAsset({
  creatorId,
  signWith,
  maxRedeems,
}: {
  creatorId: string;
  maxRedeems: number;
  signWith: SignUserType;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

  // (0.5 xlm + trxBaseFee + platformFee ) * maxRedeems
  const trustPrice = await getplatformAssetNumberForXLM(0.5);
  const totalAmount =
    Number(trustPrice + Number(TrxBaseFeeInPlatformAsset) + Number(PLATFORM_FEE)) * maxRedeems;

  addPaymentOp(
    transaction,
    motherAcc.publicKey(),
    totalAmount.toFixed(7),
    PLATFORM_ASSET,
    creatorId
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  const signedXdr = WithSing({ xdr, signWith });

  return signedXdr;
}

export async function createRedeemXDRNative({
  creatorId,
  signWith,
  maxRedeems,
}: {
  creatorId: string;
  maxRedeems: number;
  signWith: SignUserType;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  const trustPrice = 0.5;
  const xlmPlatformFee = 2;
  const amount = Number(trustPrice + TrxBaseFee) * maxRedeems + xlmPlatformFee;

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

  addPaymentOp(
    transaction,
    motherAcc.publicKey(),
    amount.toFixed(7),
    Asset.native(),
    creatorId
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  const signedXdr = WithSing({ xdr, signWith });

  return signedXdr;
}

export async function claimRedeemXDR({
  creatorId,
  signWith,
  assetCode,
  assetIssuer,
  userPub,
  storageSecret,
}: {
  creatorId: string;
  assetIssuer: string;
  assetCode: string;
  signWith: SignUserType;
  userPub: string;
  storageSecret: string;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  const asset = new Asset(assetCode, assetIssuer);

  const assetStorage = Keypair.fromSecret(storageSecret);

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

  // here total cost = 0.5 xlm + trxBaseFee
  addTrustlineSetup(transaction, userPub, asset, motherAcc.publicKey());

  addPaymentOp(
    transaction,
    userPub,
    "1",
    asset,
    assetStorage.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [motherAcc, assetStorage]);

  const signedXdr = WithSing({ xdr, signWith });

  return signedXdr;
}

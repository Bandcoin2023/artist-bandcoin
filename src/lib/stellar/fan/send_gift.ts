import { Asset, Claimant, Operation, Keypair } from "@stellar/stellar-sdk";
import { PLATFORM_ASSET, TrxBaseFee, TrxBaseFeeInPlatformAsset } from "../constant";
import type { MyAssetType } from "./utils";
import type { SignUserType } from "../utils";
import { WithSing } from "../utils";
import { getplatformAssetNumberForXLM } from "./get_token_price";
import { getServerAndMotherAcc, createTransactionBuilder, addPaymentOp, finalizeTransaction, checkTrustline, getAssetBalance } from "../helper";

export async function sendGift({
  customerPubkey,
  creatorPageAsset,
  creatorPub,
  price,
  creatorStorageSec,
  signWith,
}: {
  customerPubkey: string;
  creatorPageAsset: MyAssetType;
  price: number;
  creatorPub: string;
  creatorStorageSec: string;
  signWith: SignUserType;
}) {
  const { motherAcc } = getServerAndMotherAcc();
  const asset = new Asset(creatorPageAsset.code, creatorPageAsset.issuer);
  const assetStorage = Keypair.fromSecret(creatorStorageSec);

  // Check if storage has enough asset
  const tokens = await getAssetBalance(assetStorage.publicKey(), creatorPageAsset.code, creatorPageAsset.issuer);
  if (Number(tokens) < price) {
    throw new Error("Not enough balance");
  }

  const extraCost = await getplatformAssetNumberForXLM(1);
  const transactionFee = Number(TrxBaseFee) + Number(TrxBaseFeeInPlatformAsset) + extraCost;

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

  // Always add the fee payment
  addPaymentOp(
    transaction,
    motherAcc.publicKey(),
    transactionFee.toFixed(7),
    PLATFORM_ASSET,
    creatorPub
  );

  if (creatorPageAsset.code !== PLATFORM_ASSET.code && creatorPageAsset.issuer !== PLATFORM_ASSET.issuer) {
    const checkReciverHasTrust = await checkTrustline(customerPubkey, creatorPageAsset.code, creatorPageAsset.issuer);
    if (!checkReciverHasTrust) {
      const claimants: Claimant[] = [
        new Claimant(customerPubkey, Claimant.predicateUnconditional()),
      ];

      // Add 1 XLM to storage for reserve
      addPaymentOp(
        transaction,
        assetStorage.publicKey(),
        "1",
        Asset.native(),
        motherAcc.publicKey()
      );

      // Add create claimable balance
      transaction.addOperation(
        Operation.createClaimableBalance({
          amount: price.toFixed(7),
          asset,
          source: assetStorage.publicKey(),
          claimants: claimants,
        })
      );

      const xdr = finalizeTransaction(transaction, [assetStorage, motherAcc]);
      const signedXdr = WithSing({ xdr, signWith });
      return signedXdr;
    } else {
      // Add payment of asset
      addPaymentOp(
        transaction,
        customerPubkey,
        price.toFixed(7),
        asset,
        assetStorage.publicKey()
      );
    }
    const xdr = finalizeTransaction(transaction, [motherAcc, assetStorage]);
    const signedXdr = WithSing({ xdr, signWith });
    return signedXdr;
  }
}


export const sendGitfAsPlatformAsset = async ({
  reciver,
  creatorId,
  amount,
  assetCode,
  assetIssuer,
  signWith,
}: {
  reciver: string,
  creatorId: string,
  amount: number,
  assetCode: string,
  assetIssuer: string,
  signWith: SignUserType,
}) => {
  const asset = new Asset(assetCode, assetIssuer);

  // Check sender balance
  const token = await getAssetBalance(creatorId, assetCode, assetIssuer);
  if (Number(token) < amount) {
    throw new Error("Not enough balance");
  }

  // Check receiver trustline
  const hasReciverTrust = await checkTrustline(reciver, assetCode, assetIssuer);
  if (!hasReciverTrust) {
    throw new Error("Reciver has no trustline");
  }

  const transaction = await createTransactionBuilder(creatorId, TrxBaseFee);

  addPaymentOp(
    transaction,
    reciver,
    amount.toFixed(7),
    asset,
    creatorId
  );

  const xdr = finalizeTransaction(transaction, []);
  const signedXdr = WithSing({ xdr, signWith });
  return signedXdr;
};
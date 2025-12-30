import { Asset, Keypair } from "@stellar/stellar-sdk";
import { STORAGE_SECRET } from "../SECRET";
import { STROOP, PLATFORM_ASSET, TrxBaseFee } from "../../constant";
import { createTransactionBuilder, addPaymentOp, finalizeTransaction } from "../../helper";

export async function covertSiteAsset2XLM(props: {
  siteAssetAmount: number;
  pubkey: string;
  xlm: string;
  secret: string;
}) {
  // take siteAsset and send xlm from storage
  const { pubkey, siteAssetAmount, xlm, secret } = props;

  const assetAmount = (Number(siteAssetAmount) * Number(STROOP))
    .toFixed(7)
    .toString();

  const storageAcc = Keypair.fromSecret(STORAGE_SECRET);
  const pubAcc = Keypair.fromSecret(secret);

  const transaction = await createTransactionBuilder(pubkey, TrxBaseFee);

  // Send XLM to user from storage
  addPaymentOp(
    transaction,
    pubkey,
    xlm,
    Asset.native(),
    storageAcc.publicKey()
  );

  // Send site asset from user to storage
  addPaymentOp(
    transaction,
    storageAcc.publicKey(),
    assetAmount,
    PLATFORM_ASSET,
    pubkey
  );

  const transectionXDR = finalizeTransaction(transaction, [storageAcc, pubAcc]);

  return transectionXDR;
}

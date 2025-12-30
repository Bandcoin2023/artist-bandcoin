import { Keypair, Operation } from "@stellar/stellar-sdk";
import { STORAGE_SECRET } from "../SECRET";
import { PLATFORM_ASSET, TrxBaseFee } from "../../constant";
import {
  getServerAndMotherAcc,
  createTransactionBuilder,
  checkTrustline,
  addTrustlineSetup,
  addPaymentOp,
  finalizeTransaction,
} from "../../helper";

export async function sendSiteAsset2pub(
  pubkey: string,
  siteAssetAmount: number,
  // secret: string, // have secret means that the user don't have trust
) {
  // 1. Create trustline - wadzzo
  // 2. Send X amount - wadzzo

  const { motherAcc } = getServerAndMotherAcc();

  const hasTrust = await checkTrustline(pubkey, PLATFORM_ASSET.code, PLATFORM_ASSET.issuer);

  if (!hasTrust)
    throw new Error(`User does not have trustline for ${PLATFORM_ASSET.code}`);

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

  addPaymentOp(
    transaction,
    pubkey,
    siteAssetAmount.toFixed(7),
    PLATFORM_ASSET,
    motherAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  return xdr;
}

export async function sendXLM_SiteAsset(props: {
  siteAssetAmount: number;
  pubkey: string;
  xlm: number;
  secret: string;
}) {
  const { pubkey, siteAssetAmount, xlm, secret } = props;
  // change wadzooNum to 1 fo testing

  const storageAcc = Keypair.fromSecret(STORAGE_SECRET);
  const pubAcc = Keypair.fromSecret(secret);

  const transaction = await createTransactionBuilder(storageAcc.publicKey(), TrxBaseFee);

  // Create account
  transaction.addOperation(
    Operation.createAccount({
      destination: pubkey,
      startingBalance: xlm.toString(),
    }),
  );

  // Add trustline
  addTrustlineSetup(transaction, pubkey, PLATFORM_ASSET, storageAcc.publicKey());

  // Send asset
  addPaymentOp(
    transaction,
    pubkey,
    siteAssetAmount.toString(),
    PLATFORM_ASSET,
    storageAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [storageAcc, pubAcc]);

  return xdr;
}

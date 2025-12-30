import { Asset } from "@stellar/stellar-sdk";
import type { SignUserType } from "../utils";
import { WithSing } from "../utils";
import type { MyAssetType } from "./utils";
import { getServerAndMotherAcc, createTransactionBuilder, addTrustlineSetup, finalizeTransaction } from "../helper";
import { TrxBaseFee } from "../constant";

/**
 * Following a creator don't need fee from user.
 * All fee will be paid by platform.
 *
 */
export async function follow_creator({
  userPubkey,
  creatorPageAsset,
  signWith,
}: {
  userPubkey: string;
  creatorPageAsset: MyAssetType;
  signWith: SignUserType;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  const asset = new Asset(creatorPageAsset.code, creatorPageAsset.issuer);

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

  addTrustlineSetup(transaction, userPubkey, asset, motherAcc.publicKey());

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  const signedXdr = WithSing({ xdr, signWith });

  return signedXdr;
}

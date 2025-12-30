import { Asset, Operation, Keypair } from "@stellar/stellar-sdk";
import type { MyAssetType } from "../fan/utils";
import type { SignUserType } from "../utils";
import { WithSing } from "../utils";
import { TrxBaseFee } from "../constant";
import { createTransactionBuilder, addPaymentOp, finalizeTransaction } from "../helper";

export async function ClaimXDR({
  asset,
  amount,
  storageSecret,
  receiver,
  signWith,
}: {
  asset: MyAssetType;
  amount: string;
  storageSecret: string;
  receiver: string;
  signWith: SignUserType;
}) {
  const storageAcc = Keypair.fromSecret(storageSecret);
  const claimAsset = new Asset(asset.code, asset.issuer);

  const transaction = await createTransactionBuilder(receiver, TrxBaseFee);

  transaction.addOperation(
    Operation.changeTrust({
      asset: claimAsset,
    }),
  );

  addPaymentOp(
    transaction,
    receiver,
    amount,
    claimAsset,
    storageAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [storageAcc]);

  const signedXDr = await WithSing({
    xdr: xdr,
    signWith,
  });

  return signedXDr;
}

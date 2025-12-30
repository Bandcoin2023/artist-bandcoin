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

  TrxBaseFee,
  TrxBaseFeeInPlatformAsset,

} from "./constant";
import { getplatformAssetNumberForXLM } from "./fan/get_token_price";
import { AccountType } from "./fan/utils";
import { SignUserType, WithSing } from "./utils";
import { addPaymentOp, createTransactionBuilder, finalizeTransaction, getServerAndMotherAcc } from "./helper";

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

  // Step 5: Create transaction builder starting from mother account
  const Tx1 = await createTransactionBuilder(
    motherAcc.publicKey(),
    TrxBaseFee
  );

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

  // Step 3: Create transaction builder starting from the user's account
  const Tx1 = await createTransactionBuilder(pubkey, TrxBaseFee);

  // Step 4: Pay platform fee of 2 XLM to mother account
  addPaymentOp(
    Tx1,
    PLATFORM_MOTHER_ACC.publicKey(),
    "2",
    Asset.native()
  );

  // Step 5: Send 2 XLM to storage account for trustline setup
  addPaymentOp(
    Tx1,
    assetStorage.publicKey(),
    "2",
    Asset.native()
  );

  // Step 6: Create the issuer account with starting balance
  Tx1.addOperation(
    Operation.createAccount({
      destination: issuerAcc.publicKey(),
      startingBalance: "1.5",
      source: assetStorage.publicKey(),
    })
  );

  // Step 7: Add trustline for the asset on storage account
  Tx1.addOperation(
    Operation.changeTrust({
      asset,
      limit: limit,
      source: assetStorage.publicKey(),
    })
  );

  // Step 8: Send the full token supply to storage account
  addPaymentOp(
    Tx1,
    assetStorage.publicKey(),
    limit,
    asset,
    issuerAcc.publicKey()
  );

  // Step 9: Set the home domain for the issuer account
  Tx1.addOperation(
    Operation.setOptions({
      homeDomain,
      source: issuerAcc.publicKey(),
    })
  );

  // Step 10: Store the IPFS hash as data on the issuer account
  Tx1.addOperation(
    Operation.manageData({
      name: "ipfshash",
      value: ipfsHash,
      source: issuerAcc.publicKey(),
    })
  );

  // Step 11: Finalize the transaction with signatures from issuer and storage
  const xdr = finalizeTransaction(Tx1, [issuerAcc, assetStorage]);

  // Step 12: Add user signature
  const signedXDr = await WithSing({ xdr, signWith });

  // Step 13: Return the signed XDR and issuer account details
  const issuer: AccountType = {
    publicKey: issuerAcc.publicKey(),
    secretKey: issuerAcc.secret(),
  };

  return { xdr: signedXDr, issuer };
}

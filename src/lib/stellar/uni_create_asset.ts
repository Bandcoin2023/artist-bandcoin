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
} from "./constant";
import { getplatformAssetNumberForXLM } from "./fan/get_token_price";
import { AccountType } from "./fan/utils";
import { SignUserType, WithSing } from "./utils";

const log = console;

// transection variables

export async function createUniAsset({
  pubkey,
  code,
  limit,
  signWith,
  homeDomain,
  storageSecret,
  ipfsHash,
  actionAmount,
  issuer,
  issuerNowCreated
}: {
  pubkey: string;
  code: string;
  limit: string;
  actionAmount: string;
  storageSecret: string;
  signWith: SignUserType;
  homeDomain: string;
  ipfsHash: string;
  issuer: AccountType;
  issuerNowCreated: boolean
}) {
  const server = new Horizon.Server(STELLAR_URL);

  const extractHash = ipfsHash.split("/").pop();

  if (!extractHash) {
    throw new Error("Invalid ipfsHash");
  }

  // accounts
  const issuerAcc = Keypair.fromSecret(issuer.secretKey);
  const assetStorage = Keypair.fromSecret(storageSecret);
  const PLATFORM_MOTHER_ACC = Keypair.fromSecret(env.MOTHER_SECRET);

  const asset = new Asset(code, issuerAcc.publicKey());

  const requiredAsset2refundXlm = await getplatformAssetNumberForXLM(2);
  const total =
    requiredAsset2refundXlm +
    Number(PLATFORM_FEE) +
    Number(TrxBaseFeeInPlatformAsset);

  const transactionInitializer = await server.loadAccount(
    PLATFORM_MOTHER_ACC.publicKey(),
  );
  const Tx1 = new TransactionBuilder(transactionInitializer, {
    fee: TrxBaseFee,
    networkPassphrase,
  });

  // is admin is not creating the trx
  // console.log(signWith, "signWith");
  if (signWith === undefined || (signWith && !("isAdmin" in signWith))) {
    // first get action for required xlm. and platformFee
    Tx1.addOperation(
      Operation.payment({
        destination: PLATFORM_MOTHER_ACC.publicKey(),
        asset: PLATFORM_ASSET,
        amount: total.toString(),
        source: pubkey,
      }),
    );
  }

  // send this required xlm to storage so that it can lock new  trusting asset (0.5xlm)
  Tx1.addOperation(
    Operation.payment({
      destination: assetStorage.publicKey(),
      asset: Asset.native(),
      amount: "2",
      source: PLATFORM_MOTHER_ACC.publicKey(),
    }),
  )

  //if  issuer created then fund with 1.5 xlm otherwise fund only "0.5" xlm to create trustline
  if (issuerNowCreated) {
    // create issuer account
    Tx1.addOperation(
      Operation.createAccount({
        destination: issuerAcc.publicKey(),
        startingBalance: "1.5",
        source: assetStorage.publicKey(),
      }),
    )
  }
  else {
    Tx1.addOperation(
      Operation.payment({
        destination: issuerAcc.publicKey(),
        asset: Asset.native(),
        amount: "0.5",
        source: assetStorage.publicKey(),
      }),
    )
  }
  // 2
  Tx1.addOperation(
    Operation.changeTrust({
      asset,
      limit: limit,
      source: assetStorage.publicKey(),
    }),
  )

    // 3
    .addOperation(
      Operation.payment({
        asset,
        amount: limit,
        source: issuerAcc.publicKey(),
        destination: assetStorage.publicKey(),
      }),
    )
    // 4
    .addOperation(
      Operation.setOptions({
        homeDomain,
        source: issuerAcc.publicKey(),
      }),
    )
    .addOperation(
      Operation.manageData({
        name: "ipfshash",
        value: extractHash,
        source: issuerAcc.publicKey(),
      }),
    )

    .setTimeout(0);

  const buildTrx = Tx1.build();

  // sign
  buildTrx.sign(PLATFORM_MOTHER_ACC, issuerAcc, assetStorage);
  const xdr = buildTrx.toXDR();

  const signedXDr = await WithSing({
    xdr: xdr,
    signWith: signWith && "isAdmin" in signWith ? undefined : signWith,
  });


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
  issuer,
  issuerNowCreated
}: {
  pubkey: string;
  code: string;
  limit: string;
  actionAmount: string;
  storageSecret: string;
  signWith: SignUserType;
  homeDomain: string;
  ipfsHash: string;
  issuer: AccountType
  issuerNowCreated: boolean
}) {
  const server = new Horizon.Server(STELLAR_URL);

  // accounts
  const issuerAcc = Keypair.fromSecret(issuer.secretKey);
  const asesetStorage = Keypair.fromSecret(storageSecret);
  const PLATFORM_MOTHER_ACC = Keypair.fromSecret(env.MOTHER_SECRET);

  const asset = new Asset(code, issuerAcc.publicKey());

  // here pubkey should be change for admin
  const transactionInitializer = await server.loadAccount(pubkey);

  const Tx1 = new TransactionBuilder(transactionInitializer, {
    fee: TrxBaseFee,
    networkPassphrase,
  });

  // is admin is not creating the trx
  if (signWith === undefined || (signWith && !("isAdmin" in signWith))) {
    // first get action for required xlm. and platformFee
    Tx1.addOperation(
      Operation.payment({
        destination: PLATFORM_MOTHER_ACC.publicKey(),
        asset: Asset.native(),
        amount: "2",
      }),
    );
  }

  // send this required xlm to storage so that it can lock new  trusting asset (0.5xlm)
  Tx1.addOperation(
    Operation.payment({
      destination: asesetStorage.publicKey(),
      asset: Asset.native(),
      amount: "2",
    }),
  )

  if (issuerNowCreated) {
    // create issuer account
    Tx1.addOperation(
      Operation.createAccount({
        destination: issuerAcc.publicKey(),
        startingBalance: "1.5",
        source: asesetStorage.publicKey(),
      }),
    )
  }
  else {
    // create issuer account
    Tx1.addOperation(
      Operation.payment({
        destination: issuerAcc.publicKey(),
        asset: Asset.native(),
        amount: "0.5",
        source: asesetStorage.publicKey(),
      }),
    )
  }

  // 2
  Tx1.addOperation(
    Operation.changeTrust({
      asset,
      limit: limit,
      source: asesetStorage.publicKey(),
    }),
  )

    // 3
    .addOperation(
      Operation.payment({
        asset,
        amount: limit,
        source: issuerAcc.publicKey(),
        destination: asesetStorage.publicKey(),
      }),
    )
    // 4
    .addOperation(
      Operation.setOptions({
        homeDomain,
        source: issuerAcc.publicKey(),
      }),
    )
    .addOperation(
      Operation.manageData({
        name: "ipfshash",
        value: ipfsHash,
        source: issuerAcc.publicKey(),
      }),
    )

    .setTimeout(0);

  const buildTrx = Tx1.build();

  // sign
  buildTrx.sign(issuerAcc, asesetStorage);
  const xdr = buildTrx.toXDR();

  const signedXDr = await WithSing({
    xdr: xdr,
    signWith: signWith && "isAdmin" in signWith ? undefined : signWith,
  });

  return { xdr: signedXDr, issuer };
}

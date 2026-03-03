import {
  Asset,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { MyAssetType } from "../fan/utils";
import { SignUserType, WithSing } from "../utils";
import { networkPassphrase, PLATFORM_ASSET, STELLAR_URL, TrxBaseFee } from "../constant";

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
  const server = new Horizon.Server(STELLAR_URL);

  const storageAcc = Keypair.fromSecret(storageSecret);
  const claimAsset = new Asset(asset.code, asset.issuer);

  // const motherAccount = Keypair.fromSecret(env.MOTHER_SECRET);

  const transactionInializer = await server.loadAccount(receiver);

  const Tx1 = new TransactionBuilder(transactionInializer, {
    fee: TrxBaseFee,
    networkPassphrase,
  })

    .addOperation(
      Operation.changeTrust({
        asset: claimAsset,
      }),
    )
    .addOperation(
      Operation.payment({
        amount: amount,
        asset: claimAsset,
        source: storageAcc.publicKey(),
        destination: receiver,
      }),
    )

    .setTimeout(0)
    .build();

  Tx1.sign(storageAcc);

  const xdr = Tx1.toXDR();
  const signedXDr = await WithSing({
    xdr: xdr,
    signWith,
  });

  return signedXDr;
}

export async function xdr_sendPlatformToStorage({
  destination,
  source,
  amount,
  signWith,
}: {
  destination: string;
  source: string;
  amount: number;
  signWith: SignUserType;
}) {
  const server = new Horizon.Server(STELLAR_URL);

  const destinationAcc = Keypair.fromSecret(destination);

  //check source account balance is enough
  const sourceAccount = await server.loadAccount(source);

  const balance = sourceAccount.balances.find(
    (balance) => {
      if (balance.asset_type === "credit_alphanum4" || balance.asset_type === "credit_alphanum12") {
        if (balance.asset_code === PLATFORM_ASSET.code && balance.asset_issuer === PLATFORM_ASSET.issuer) {
          return true
        }
      }
    }
  );

  if (!balance) {
    throw new Error("Source account does not have the required asset balance");
  }

  if (parseFloat(balance.balance) < parseFloat(amount.toFixed(7))) {
    throw new Error("Source account does not have enough balance");
  }

  //checking trust avalible on destination account
  const destinationAccount = await server.loadAccount(destinationAcc.publicKey());

  const hasTrustLine = destinationAccount.balances.some(
    (balance) => {
      if (balance.asset_type === "credit_alphanum4" || balance.asset_type === "credit_alphanum12") {
        if (balance.asset_code === PLATFORM_ASSET.code && balance.asset_issuer === PLATFORM_ASSET.issuer) {
          return true
        }
      }
    }
  );

  const transactionBuilder = new TransactionBuilder(sourceAccount, {
    fee: TrxBaseFee,
    networkPassphrase,
  });

  if (!hasTrustLine) {
    transactionBuilder.addOperation(
      Operation.changeTrust({
        asset: PLATFORM_ASSET,
        source: destinationAcc.publicKey(),
      }),
    );
  }

  transactionBuilder.addOperation(
    Operation.payment({
      amount: amount.toFixed(7),
      asset: PLATFORM_ASSET,
      destination: destinationAcc.publicKey(),
    }),
  );


  const transaction = transactionBuilder.setTimeout(0).build();

  if (!hasTrustLine) {
    transaction.sign(destinationAcc);
  }

  const xdr = transaction.toXDR();

  const signedXDr = await WithSing({
    xdr: xdr,
    signWith,
  });
  return signedXDr;
}
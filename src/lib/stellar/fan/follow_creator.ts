import {
  Asset,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { env } from "~/env";
import { PLATFORM_ASSET, PLATFORM_FEE, STELLAR_URL, TrxBaseFee, TrxBaseFeeInPlatformAsset, networkPassphrase } from "../constant";
import { SignUserType, WithSing } from "../utils";
import { MyAssetType } from "./utils";
import { getplatformAssetNumberForXLM } from "./get_token_price";

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
  const server = new Horizon.Server(STELLAR_URL);
  const loadUserAccount = await server.loadAccount(userPubkey);
  const asset = new Asset(creatorPageAsset.code, creatorPageAsset.issuer);

  const platformPrice = await getplatformAssetNumberForXLM(0.5);
  const totalCost = platformPrice + Number(PLATFORM_FEE) + Number(TrxBaseFeeInPlatformAsset)

  //checking user has enough balance
  const userBalance = loadUserAccount.balances.find((balance) => {
    if (
      balance.asset_type === "credit_alphanum12" ||
      balance.asset_type === "credit_alphanum4"
    ) {
      return balance.asset_code === PLATFORM_ASSET.code && balance.asset_issuer === PLATFORM_ASSET.issuer;
    }
  });

  if (!userBalance || Number(userBalance.balance) < totalCost) {
    throw new Error("Not enough balance to follow the creator");
  }



  const transactionInializer = await server.loadAccount(
    userPubkey,
  );

  const Tx1 = new TransactionBuilder(transactionInializer, {
    fee: "200", // mother paying fee but no return
    networkPassphrase,
  });

  Tx1.addOperation(
    Operation.payment({
      destination: userPubkey,
      asset: PLATFORM_ASSET,
      amount: totalCost.toFixed(7),
    }),
  )
    .addOperation(
      Operation.changeTrust({
        asset,
        source: userPubkey,
      }),
    )
    .setTimeout(0);

  const buildTrx = Tx1.build();

  buildTrx.sign();

  const xdr = buildTrx.toXDR();
  const singedXdr = WithSing({ xdr, signWith: signWith });

  return singedXdr;
}

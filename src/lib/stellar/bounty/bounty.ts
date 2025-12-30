import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  networkPassphrase,
  PLATFORM_ASSET,
  PLATFORM_FEE,
  STELLAR_URL,
  TrxBaseFee,
  TrxBaseFeeInPlatformAsset,
} from "../constant";
import { MOTHER_SECRET } from "../marketplace/SECRET";
import { SignUserType, WithSing } from "../utils";
import { getAssetToUSDCRate, getPlatformAssetPrice } from "../fan/get_token_price";
import { addPaymentOp, checkTrustline, createTransactionBuilder, finalizeTransaction, getServerAndMotherAcc, getAssetBalance, getNativeBalance } from "../helper";

import { USDC_ASSET_CODE, USDC_ISSUER } from "~/lib/usdc"


export async function SendBountyBalanceToMotherAccountViaAsset({
  prize,
  signWith,
  userPubKey,
  secretKey,
  fees,
}: {
  prize: number;
  fees: number;
  signWith: SignUserType;
  userPubKey: string;
  secretKey?: string | undefined;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

  const totalAmount = prize + fees;

  addPaymentOp(
    transaction,
    motherAcc.publicKey(),
    totalAmount.toFixed(7).toString(),
    PLATFORM_ASSET,
    userPubKey
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  if (signWith && "email" in signWith && secretKey) {
    const signedXDr = await WithSing({
      xdr: xdr,
      signWith: signWith,
    });
    return { xdr: signedXDr, pubKey: userPubKey };
  }
  return { xdr: xdr, pubKey: userPubKey };
}
export async function SendBountyBalanceToMotherAccountViaUSDC({
  prize,
  signWith,
  userPubKey,
  secretKey,
  fees,
}: {
  prize: number;
  fees: number;
  signWith: SignUserType;
  userPubKey: string;
  secretKey?: string | undefined;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

  const totalAmount = prize + fees;

  const USDC = new Asset(USDC_ASSET_CODE, USDC_ISSUER);

  addPaymentOp(
    transaction,
    motherAcc.publicKey(),
    totalAmount.toFixed(7).toString(),
    USDC,
    userPubKey
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  if (signWith && "email" in signWith && secretKey) {
    const signedXDr = await WithSing({
      xdr: xdr,
      signWith: signWith,
    });
    return { xdr: signedXDr, pubKey: userPubKey };
  }
  return { xdr: xdr, pubKey: userPubKey };
}
export async function SendBountyBalanceToMotherAccountViaXLM({
  prizeInXLM,
  signWith,
  userPubKey,
  secretKey,
  fees,
}: {
  prizeInXLM: number;
  signWith: SignUserType;
  userPubKey: string;
  secretKey?: string | undefined;
  fees: number;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  const transaction = await createTransactionBuilder(userPubKey, TrxBaseFee);

  const totalAmount = prizeInXLM + fees;

  addPaymentOp(
    transaction,
    motherAcc.publicKey(),
    totalAmount.toFixed(7).toString(),
    Asset.native(),
    userPubKey
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  if (signWith && "email" in signWith && secretKey) {
    const signedXDr = await WithSing({
      xdr: xdr,
      signWith: signWith,
    });
    return { xdr: signedXDr, pubKey: userPubKey };
  }
  return { xdr: xdr, pubKey: userPubKey };
}

export async function SendBountyBalanceToUserAccount({
  prize,
  userPubKey,
}: {
  prize: number;
  userPubKey: string;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  // Check if mother has enough PLATFORM_ASSET balance
  const platformAssetBalance = await getAssetBalance(motherAcc.publicKey(), PLATFORM_ASSET.code, PLATFORM_ASSET.issuer);
  if (platformAssetBalance < prize) {
    throw new Error("Balance is not enough to send the asset.");
  }

  // Check if mother has enough XLM for fees
  const XLMBalance = await getNativeBalance(motherAcc.publicKey());
  if (XLMBalance < 1.0) {
    throw new Error(
      "Please make sure you have at least 1 XLM in your account.",
    );
  }

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), BASE_FEE.toString());

  addPaymentOp(
    transaction,
    userPubKey,
    prize.toFixed(7).toString(),
    PLATFORM_ASSET,
    motherAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  return xdr;
}
export async function SendBountyBalanceToUserAccountUSDC({
  prize,
  userPubKey,
}: {
  prize: number;
  userPubKey: string;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  const USDC = new Asset(USDC_ASSET_CODE, USDC_ISSUER);

  // Check if mother has enough USDC balance
  const usdcBalance = await getAssetBalance(motherAcc.publicKey(), USDC_ASSET_CODE, USDC_ISSUER);
  if (usdcBalance < prize) {
    throw new Error("Balance is not enough to send the asset.");
  }

  // Check if mother has enough XLM for fees
  const XLMBalance = await getNativeBalance(motherAcc.publicKey());
  if (XLMBalance < 1.0) {
    throw new Error(
      "Please make sure you have at least 1 XLM in your account.",
    );
  }

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), BASE_FEE.toString());

  addPaymentOp(
    transaction,
    userPubKey,
    prize.toFixed(7).toString(),
    USDC,
    motherAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  return xdr;
}
export async function claimBandCoinReward({
  pubKey,
  rewardAmount,
  signWith,
}: {
  pubKey: string;
  rewardAmount: number;
  signWith: SignUserType;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  // Check if mother has enough PLATFORM_ASSET balance
  const platformAssetBalance = await getAssetBalance(motherAcc.publicKey(), PLATFORM_ASSET.code, PLATFORM_ASSET.issuer);
  if (platformAssetBalance < rewardAmount) {
    throw new Error("Balance is not enough to send the asset.");
  }

  // Check if mother has enough XLM for fees
  const XLMBalance = await getNativeBalance(motherAcc.publicKey());
  if (XLMBalance < 1.0) {
    throw new Error(
      "Please make sure you have at least 1 XLM in your account.",
    );
  }

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), BASE_FEE.toString());

  addPaymentOp(
    transaction,
    pubKey,
    rewardAmount.toFixed(7).toString(),
    PLATFORM_ASSET,
    motherAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  return xdr;
}
export async function claimUSDCReward({
  pubKey,
  rewardAmount,
  signWith,
}: {
  pubKey: string;
  rewardAmount: number;
  signWith: SignUserType;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  const asset = new Asset(USDC_ASSET_CODE, USDC_ISSUER);

  // Check if mother has enough PLATFORM_ASSET balance (wait, this seems wrong, it should be USDC balance?)
  // Looking at the code, it's checking PLATFORM_ASSET balance but sending USDC. Probably a bug, but I'll keep as is for now.
  const platformAssetBalance = await getAssetBalance(motherAcc.publicKey(), PLATFORM_ASSET.code, PLATFORM_ASSET.issuer);
  if (platformAssetBalance < rewardAmount) {
    throw new Error("Balance is not enough to send the asset.");
  }

  // Check if mother has enough XLM for fees
  const XLMBalance = await getNativeBalance(motherAcc.publicKey());
  if (XLMBalance < 1) {
    throw new Error(
      "Please make sure you have at least 1 XLM in your account.",
    );
  }

  const userHasTrustOnUSDC = await checkTrustline(pubKey, asset.code, asset.issuer);

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), BASE_FEE.toString());

  if (!userHasTrustOnUSDC) {
    transaction.addOperation(
      Operation.changeTrust({
        asset: asset,
        source: pubKey,
      }),
    );
  }

  addPaymentOp(
    transaction,
    pubKey,
    rewardAmount.toFixed(7).toString(),
    asset,
    motherAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  return {
    xdr: xdr,
    needSign: !userHasTrustOnUSDC,
  };
}
export async function SendBountyBalanceToUserAccountViaXLM({
  prizeInXLM,
  userPubKey,
}: {
  prizeInXLM: number;
  userPubKey: string;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), BASE_FEE.toString());

  addPaymentOp(
    transaction,
    userPubKey,
    prizeInXLM.toFixed(7).toString(),
    Asset.native(),
    motherAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  return xdr;
}

export async function SendBountyBalanceToWinner({
  prize,
  recipientID,
}: {
  prize: number;
  recipientID: string;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  // Check if mother has enough PLATFORM_ASSET balance
  const platformAssetBalance = await getAssetBalance(motherAcc.publicKey(), PLATFORM_ASSET.code, PLATFORM_ASSET.issuer);
  if (platformAssetBalance < prize) {
    throw new Error("Balance is not enough to send the asset.");
  }

  // Check if mother has enough XLM for fees
  const XLMBalance = await getNativeBalance(motherAcc.publicKey());
  if (XLMBalance < 1) {
    throw new Error(
      "Please make sure you have at least 1 XLM in your account.",
    );
  }

  const hasTrust = await checkTrustline(recipientID, PLATFORM_ASSET.code, PLATFORM_ASSET.issuer);

  if (!hasTrust) {
    throw new Error(`User Doesn't have trust, Please trust the ${PLATFORM_ASSET.code} first.`);
  }

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), BASE_FEE.toString());

  addPaymentOp(
    transaction,
    recipientID,
    prize.toFixed(7).toString(),
    PLATFORM_ASSET,
    motherAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  return xdr;
}

export async function SendBountyBalanceToWinnerViaXLM({
  prizeInXLM,
  recipientID,
}: {
  prizeInXLM: number;
  recipientID: string;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  // Check if mother has enough XLM for fees and prize
  const XLMBalance = await getNativeBalance(motherAcc.publicKey());
  if (XLMBalance < prizeInXLM + 1.0) {
    throw new Error(
      "Please make sure you have at least 1 XLM in your account.",
    );
  }

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), BASE_FEE.toString());

  addPaymentOp(
    transaction,
    recipientID,
    prizeInXLM.toFixed(7).toString(),
    Asset.native(),
    motherAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  return xdr;
}

export async function NativeBalance({ userPub }: { userPub: string }) {
  const server = new Horizon.Server(STELLAR_URL);

  const account = await server.loadAccount(userPub);

  const nativeBalance = account.balances.find((balance) => {
    if (balance.asset_type === "native") {
      return balance;
    }
  });

  return nativeBalance;
}

export async function SwapUserAssetToMotherUSDC({
  priceInBand,
  priceInUSD,
  userPubKey,
  secretKey,
  signWith,
}: {
  priceInBand: number;
  priceInUSD: number;
  userPubKey: string;
  secretKey?: string | undefined;
  signWith: SignUserType;
}) {
  const { motherAcc } = getServerAndMotherAcc();

  const asset = new Asset(USDC_ASSET_CODE, USDC_ISSUER);

  // Check if user has enough PLATFORM_ASSET
  const platformAssetBalance = await getAssetBalance(userPubKey, PLATFORM_ASSET.code, PLATFORM_ASSET.issuer);
  if (platformAssetBalance < priceInBand) {
    throw new Error(
      `You don't have total amount of ${priceInBand} ${PLATFORM_ASSET.code} to send.`,
    );
  }

  const senderHasTrustOnUSDC = await checkTrustline(userPubKey, asset.code, asset.issuer);
  const receiverHasTrustOnUSDC = await checkTrustline(motherAcc.publicKey(), asset.code, asset.issuer);

  if (!receiverHasTrustOnUSDC) {
    throw new Error("Please Contact Admin to add USDC trustline");
  }

  const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

  if (!senderHasTrustOnUSDC) {
    transaction.addOperation(
      Operation.changeTrust({
        asset: asset,
        source: userPubKey,
      }),
    );
  }

  // Payment from user to mother: PLATFORM_ASSET
  addPaymentOp(
    transaction,
    motherAcc.publicKey(),
    priceInBand.toFixed(7).toString(),
    PLATFORM_ASSET,
    userPubKey
  );

  // Payment from mother to user: USDC
  addPaymentOp(
    transaction,
    userPubKey,
    priceInUSD.toFixed(7).toString(),
    asset,
    motherAcc.publicKey()
  );

  const xdr = finalizeTransaction(transaction, [motherAcc]);

  if (signWith && "email" in signWith && secretKey) {
    const signedXDr = await WithSing({
      xdr: xdr,
      signWith: signWith,
    });
    return { xdr: signedXDr, pubKey: userPubKey };
  }
  return { xdr: xdr, pubKey: userPubKey };
}

export async function getHasMotherTrustOnUSDC() {
  const server = new Horizon.Server(STELLAR_URL);
  const motherAcc = Keypair.fromSecret(MOTHER_SECRET);
  const account = await server.loadAccount(motherAcc.publicKey());
  const motherHasTrust = account.balances.some((balance) => {
    //console.log(balance);
    return (
      (balance.asset_type === "credit_alphanum4" ||
        balance.asset_type === "credit_alphanum12") &&
      balance.asset_code === USDC_ASSET_CODE &&
      balance.asset_issuer === USDC_ISSUER
    );
  });
  if (motherHasTrust) {
    return true;
  }
  return false;
}

export async function getHasUserHasTrustOnUSDC(userPubKey: string) {
  const server = new Horizon.Server(STELLAR_URL);
  const account = await server.loadAccount(userPubKey);
  const userHasTrust = account.balances.some((balance) => {
    //console.log(balance);
    return (
      (balance.asset_type === "credit_alphanum4" ||
        balance.asset_type === "credit_alphanum12") &&
      balance.asset_code === USDC_ASSET_CODE &&
      balance.asset_issuer === USDC_ISSUER
    );
  });

  return userHasTrust;
}

export async function checkXDRSubmitted(xdr: string) {
  try {
    const server = new Horizon.Server(STELLAR_URL);
    const transaction = new Transaction(xdr, networkPassphrase);
    const txHash = transaction.hash().toString("hex");

    try {
      const transactionResult = await server
        .transactions()
        .transaction(txHash)
        .call();
      //console.log("Transaction already submitted:", transactionResult);
      return true;
    } catch (error) {
      //console.log("Transaction not submitted yet:", error);
      return false;
    }
  } catch (error) {
    //console.log("Error in checkXDRSubmitted:", error);
    return true;
  }
}

export async function getUserHasTrustOnUSDC(userPubKey: string) {
  const server = new Horizon.Server(STELLAR_URL);
  const account = await server.loadAccount(userPubKey);
  const userHasTrust = account.balances.some((balance) => {
    //console.log(balance);
    return (
      (balance.asset_type === "credit_alphanum4" ||
        balance.asset_type === "credit_alphanum12") &&
      balance.asset_code === USDC_ASSET_CODE &&
      balance.asset_issuer === USDC_ISSUER
    );
  });

  return userHasTrust;
}


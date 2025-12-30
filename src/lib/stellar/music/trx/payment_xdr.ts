import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { SignUserType, WithSing } from "../../utils";
import {
  PLATFORM_ASSET,
  PLATFORM_FEE,
  STELLAR_URL,
  TrxBaseFee,
  TrxBaseFeeInPlatformAsset,
} from "../../constant";
import { env } from "~/env";
import { StellarAccount } from "../../stellar";
import { getplatformAssetNumberForXLM, getPlatformAssetPrice } from "../../fan/get_token_price";
import { USDC_ASSET_CODE, USDC_ISSUER } from "~/lib/usdc"
import { addPaymentOp, addTrustlineSetup, checkTrustline, createTransactionBuilder, finalizeTransaction, getServerAndMotherAcc } from "../../helper";

export async function XDR4BuyUSDC({
  signWith,
  code,
  issuerPub,
  buyer,
  price,
  storageSecret,
  seller,
  usdcPriceRate,
}: {
  buyer: string;
  code: string;
  issuerPub: string;
  price: string;
  signWith: SignUserType;
  storageSecret: string;
  seller: string;
  usdcPriceRate: number;
}) {
  // Step 1: Create asset objects for the token being bought and USDC for payment
  const asset = new Asset(code, issuerPub);
  const USDC = new Asset(USDC_ASSET_CODE, USDC_ISSUER);

  // Step 2: Get keypairs for the storage account (holds the token) and mother account (platform account)
  const storageAcc = Keypair.fromSecret(storageSecret);
  const { motherAcc } = getServerAndMotherAcc();

  // Step 3: Create a transaction builder starting from the mother account with base fee
  const Tx2 = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

  // Step 4: Check if the buyer already has a trustline for this asset to avoid unnecessary operations
  const hasTrust = await checkTrustline(buyer, code, issuerPub);

  // Step 5: If no trustline, calculate how much platform asset is needed to cover 0.5 XLM for trustline setup
  const requiredAsset2refundXlm = hasTrust
    ? 0
    : await getplatformAssetNumberForXLM(0.5);

  // Step 6: Get the current price of the platform asset in USD for fee conversion
  const assetPriceInUsd = await getPlatformAssetPrice();

  // Step 7: Calculate total platform fee in platform asset units (includes XLM refund, platform fee, and transaction fee)
  const totalPlatformFee =
    requiredAsset2refundXlm +
    Number(PLATFORM_FEE) +
    Number(TrxBaseFeeInPlatformAsset);

  // Step 8: Convert the total platform fee from platform asset to USDC equivalent using the exchange rate
  const totalPlatformFeeInUSD =
    (totalPlatformFee * assetPriceInUsd) / usdcPriceRate;

  // Step 9: Add payment operation to pay the platform fee in USDC from the buyer
  addPaymentOp(
    Tx2,
    motherAcc.publicKey(),
    totalPlatformFeeInUSD.toFixed(7),
    USDC,
    buyer
  );

  // Step 10: If the asset has a price, add payment to the seller in USDC
  if (Number(price) > 0) {
    addPaymentOp(Tx2, seller, price, USDC, buyer);
  }

  // Step 11: If buyer doesn't have trustline, add operations to set it up (pay 0.5 XLM and create trustline)
  if (!hasTrust) {
    addTrustlineSetup(Tx2, buyer, asset, motherAcc.publicKey());
  }

  // Step 12: Add operation to transfer the token from storage account to buyer
  addPaymentOp(Tx2, buyer, "1", asset, storageAcc.publicKey());

  // Step 13: Finalize the transaction by building, signing with mother and storage accounts, and adding user signature
  const xdr = finalizeTransaction(Tx2, [motherAcc, storageAcc]);
  const singedXdr = await WithSing({ xdr, signWith });
  return singedXdr;
}

export async function XDR4BuyAsset({
  signWith,
  code,
  issuerPub,
  buyer,
  price,
  storageSecret,
  seller,
}: {
  buyer: string;
  code: string;
  issuerPub: string;
  price: string;
  signWith: SignUserType;
  storageSecret: string;
  seller: string;
}) {
  // Step 1: Create asset object for the token
  const asset = new Asset(code, issuerPub);
  const storageAcc = Keypair.fromSecret(storageSecret);
  const { motherAcc } = getServerAndMotherAcc();

  // Step 2: Create transaction builder from mother account
  const Tx2 = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

  // Step 3: Check if buyer has trustline for the asset
  const hasTrust = await checkTrustline(buyer, code, issuerPub);

  // Step 4: Calculate platform asset needed for 0.5 XLM if trustline setup is required
  const requiredAsset2refundXlm = hasTrust
    ? 0
    : await getplatformAssetNumberForXLM(0.5);

  // Step 5: Calculate total platform fee in platform asset units
  const totalPlatformFee =
    requiredAsset2refundXlm +
    Number(PLATFORM_FEE) +
    Number(TrxBaseFeeInPlatformAsset);

  // Step 6: Pay the platform fee in platform asset from buyer to mother account
  addPaymentOp(
    Tx2,
    motherAcc.publicKey(),
    totalPlatformFee.toString(),
    PLATFORM_ASSET,
    buyer
  );

  // Step 7: Pay the asset price to the seller in platform asset
  if (Number(price) > 0) {
    addPaymentOp(Tx2, seller, price, PLATFORM_ASSET, buyer);
  }

  // Step 8: Set up trustline if buyer doesn't have one
  if (!hasTrust) {
    addTrustlineSetup(Tx2, buyer, asset, motherAcc.publicKey());
  }

  // Step 9: Transfer the token to the buyer
  addPaymentOp(Tx2, buyer, "1", asset, storageAcc.publicKey());

  // Step 10: Pay an additional platform fee
  addPaymentOp(
    Tx2,
    motherAcc.publicKey(),
    PLATFORM_FEE,
    PLATFORM_ASSET
  );

  // Step 11: Finalize and sign the transaction
  const xdr = finalizeTransaction(Tx2, [motherAcc, storageAcc]);
  const singedXdr = await WithSing({ xdr, signWith });
  return singedXdr;
}

export async function XDR4BuyAssetWithXLM({
  signWith,
  code,
  issuerPub,
  buyer,
  priceInNative,
  storageSecret,
  seller,
}: {
  buyer: string;
  code: string;
  issuerPub: string;
  priceInNative: string;
  signWith: SignUserType;
  storageSecret: string;
  seller: string;
}) {
  // Step 1: Create asset object for the token
  const asset = new Asset(code, issuerPub);
  const storageAcc = Keypair.fromSecret(storageSecret);
  const { motherAcc } = getServerAndMotherAcc();

  // Step 2: Create transaction builder from buyer account (since paying with XLM from buyer)
  const Tx2 = await createTransactionBuilder(buyer, TrxBaseFee);

  // Step 3: Pay the price in XLM to the seller from buyer
  if (Number(priceInNative) > 0) {
    addPaymentOp(Tx2, seller, priceInNative, Asset.native(), buyer);
  }

  // Step 4: Check and set up trustline if buyer doesn't have one for the asset
  const hasTrust = await checkTrustline(buyer, code, issuerPub);
  if (!hasTrust) {
    Tx2.addOperation(
      Operation.changeTrust({
        asset: asset,
        source: buyer,
      })
    );
  }

  // Step 5: Transfer the token to the buyer
  addPaymentOp(Tx2, buyer, "1", asset, storageAcc.publicKey());

  // Step 6: Pay platform fee of 2 XLM to mother account
  addPaymentOp(Tx2, motherAcc.publicKey(), "2", Asset.native());

  // Step 7: Finalize and sign the transaction (only storage account signs here, user signs later)
  const xdr = finalizeTransaction(Tx2, [storageAcc]);
  const singedXdr = await WithSing({ xdr, signWith });
  return singedXdr;
}
export async function XDR4BuyAssetWithSquire({
  signWith,
  code,
  issuerPub,
  buyer,
  price,
  storageSecret,
  seller,
}: {
  buyer: string;
  code: string;
  issuerPub: string;
  price: string;
  signWith: SignUserType;
  storageSecret: string;
  seller: string;
}) {
  // Step 1: Create asset object for the token
  const asset = new Asset(code, issuerPub);
  const storageAcc = Keypair.fromSecret(storageSecret);
  const mother = Keypair.fromSecret(env.MOTHER_SECRET);

  // Step 2: Create transaction builder from mother account with base fee
  const Tx2 = await createTransactionBuilder(mother.publicKey(), BASE_FEE);

  // Step 3: Check if buyer has trustline for the asset
  const hasTrust = await checkTrustline(buyer, code, issuerPub);

  // Step 4: Pay the price in Squire (platform asset) to the seller
  if (Number(price) > 0) {
    addPaymentOp(Tx2, seller, price, PLATFORM_ASSET);
  }

  // Step 5: If no trustline, pay 0.5 XLM to buyer and create trustline
  if (!hasTrust) {
    Tx2.addOperation(
      Operation.payment({
        destination: buyer,
        amount: "0.5",
        asset: Asset.native(),
      })
    );
    Tx2.addOperation(
      Operation.changeTrust({
        asset: asset,
        source: buyer,
      })
    );
  }

  // Step 6: Transfer the token to the buyer
  addPaymentOp(Tx2, buyer, "1", asset, storageAcc.publicKey());

  // Step 7: Finalize and sign the transaction with storage and mother accounts, then user signs
  const xdr = finalizeTransaction(Tx2, [storageAcc, mother]);
  const singedXdr = await WithSing({ xdr, signWith });
  return singedXdr;
} 
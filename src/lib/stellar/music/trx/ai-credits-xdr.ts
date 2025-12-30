/**
 * Functions for generating XDR transactions for buying AI credits on the Stellar network.
 * Supports payments in USDC and platform asset.
 */
import {
    Asset,
    BASE_FEE,
    Horizon,
    Keypair,
    TransactionBuilder,
} from "@stellar/stellar-sdk";
import { SignUserType, WithSing } from "../../utils";
import {
    networkPassphrase,
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
import { addPaymentOp, createTransactionBuilder, finalizeTransaction, getServerAndMotherAcc } from "../../helper";

export async function XDR4BuyCreditsWithUSDC({
    signWith,
    buyer,
    usdcRate,
    totalPrice
}: {
    buyer: string;

    totalPrice: string;
    signWith: SignUserType;

    usdcRate: number;
}) {
    // Step 1: Get the platform's mother account keypair
    const { motherAcc } = getServerAndMotherAcc();
    // Step 2: Create the USDC asset object
    const USDC = new Asset(USDC_ASSET_CODE, USDC_ISSUER);

    // Step 3: Create a StellarAccount instance for the buyer to check balance
    const buyerAcc = await StellarAccount.create(buyer);

    // Step 4: Check if buyer has sufficient USDC balance
    const balance = buyerAcc.getTokenBalance(USDC_ASSET_CODE, USDC_ISSUER);
    if (Number(balance) < Number(totalPrice)) {
        throw new Error("Insufficient USDC balance");
    }

    // Step 5: Get the current price of the platform asset in USD for fee conversion
    const assetPriceInUsd = await getPlatformAssetPrice();

    // Step 6: Calculate the total platform fee in platform asset units
    const totalPlatformFee = Number(PLATFORM_FEE) + Number(TrxBaseFeeInPlatformAsset);

    // Step 7: Convert the platform fee to USDC equivalent using the exchange rate
    const totalPlatformFeeInUSD = ((totalPlatformFee * assetPriceInUsd) / usdcRate);

    // Step 8: Create a transaction builder starting from the mother account
    const Tx2 = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

    // Step 9: Add payment operation to pay the platform fee in USDC from buyer to mother
    addPaymentOp(
        Tx2,
        motherAcc.publicKey(),
        totalPlatformFeeInUSD.toFixed(7),
        USDC,
        buyer
    );

    // Step 10: Finalize the transaction by building, signing with mother account, and getting XDR
    const xdr = finalizeTransaction(Tx2, [motherAcc]);
    // Step 11: Add user signature to the XDR
    const singedXdr = await WithSing({ xdr, signWith });
    return singedXdr;
}

export async function XDR4BuyCreditsWithAsset({
    signWith,
    buyer,
    totalPrice
}: {
    buyer: string;

    totalPrice: string;
    signWith: SignUserType;

}) {
    // Note: This function is for buying more credits with platform asset

    // Step 1: Get the platform's mother account keypair
    const { motherAcc } = getServerAndMotherAcc();

    // Step 2: Create a StellarAccount instance for the buyer to check balance
    const buyerAcc = await StellarAccount.create(buyer);
    // Step 3: Check if buyer has sufficient platform asset balance
    const balance = buyerAcc.getTokenBalance(
        PLATFORM_ASSET.code,
        PLATFORM_ASSET.issuer,
    );
    console.log("balance", balance, "totalPrice", totalPrice);
    if (Number(balance) < Number(totalPrice)) {
        throw new Error("Insufficient platform asset balance");
    }

    // Step 4: Calculate the total platform fee including the credit price
    const totalPlatformFee = Number(PLATFORM_FEE) +
        Number(TrxBaseFeeInPlatformAsset) + Number(totalPrice);

    // Step 5: Create a transaction builder starting from the mother account
    const Tx2 = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

    // Step 6: Add payment operation to pay the total fee in platform asset from buyer to mother
    addPaymentOp(
        Tx2,
        motherAcc.publicKey(),
        totalPlatformFee.toString(),
        PLATFORM_ASSET,
        buyer
    );

    // Step 7: Finalize the transaction by building, signing with mother account, and getting XDR
    const xdr = finalizeTransaction(Tx2, [motherAcc]);
    // Step 8: Add user signature to the XDR
    const singedXdr = await WithSing({ xdr, signWith });
    return singedXdr;
}


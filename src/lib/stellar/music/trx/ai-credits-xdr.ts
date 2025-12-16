import {
    Asset,
    BASE_FEE,
    Horizon,
    Keypair,
    Operation,
    TransactionBuilder,
} from "@stellar/stellar-sdk";
import { networkPassphrase } from "./create_song_token";
import { SignUserType, WithSing } from "../../utils";
import {
    PLATFORM_ASSET,
    PLATFORM_FEE,
    STELLAR_URL,
    TrxBaseFee,
    TrxBaseFeeInPlatformAsset,
} from "../../constant";
import { env } from "~/env";
import { StellarAccount } from "../../marketplace/test/Account";
import { getplatformAssetNumberForXLM, getPlatformAssetPrice } from "../../fan/get_token_price";
import { USDC_ASSET_CODE, USDC_ISSUER } from "~/lib/usdc"

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

    const server = new Horizon.Server(STELLAR_URL);
    const motherAcc = Keypair.fromSecret(env.MOTHER_SECRET);
    const USDC = new Asset(USDC_ASSET_CODE, USDC_ISSUER);
    const transactionInializer = await server.loadAccount(motherAcc.publicKey());

    const buyerAcc = await StellarAccount.create(buyer);

    //checking buyer has enough balance of usdc
    const balance = buyerAcc.getTokenBalance(USDC_ASSET_CODE, USDC_ISSUER);
    if (Number(balance) < Number(totalPrice)) {
        throw new Error("Insufficient USDC balance");
    }

    const assetPriceInUsd = await getPlatformAssetPrice();

    const totalPlatformFee = Number(PLATFORM_FEE) + Number(TrxBaseFeeInPlatformAsset);

    const totalPlatformFeeInUSD = ((totalPlatformFee * assetPriceInUsd) / usdcRate);


    const Tx2 = new TransactionBuilder(transactionInializer, {
        fee: TrxBaseFee,
        networkPassphrase,
    });

    Tx2.addOperation(
        Operation.payment({
            destination: motherAcc.publicKey(),
            amount: totalPlatformFeeInUSD.toFixed(7),
            asset: USDC,
            source: buyer,
        }),
    ).setTimeout(0);

    const buildTrx = Tx2.build();

    buildTrx.sign(motherAcc);

    const xdr = buildTrx.toXDR();
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
    // this asset limit only for buying more item.
    const server = new Horizon.Server(STELLAR_URL);

    const motherAcc = Keypair.fromSecret(env.MOTHER_SECRET);

    const transactionInializer = await server.loadAccount(motherAcc.publicKey());

    const buyerAcc = await StellarAccount.create(buyer);
    // checking buyer has enough balance of platform asset
    const balance = buyerAcc.getTokenBalance(
        PLATFORM_ASSET.code,
        PLATFORM_ASSET.issuer,
    );
    console.log("balance", balance, "totalPrice", totalPrice);
    if (Number(balance) < Number(totalPrice)) {
        throw new Error("Insufficient platform asset balance");
    }

    const totalPlatformFee = Number(PLATFORM_FEE) +
        Number(TrxBaseFeeInPlatformAsset) + Number(totalPrice);

    const Tx2 = new TransactionBuilder(transactionInializer, {
        fee: TrxBaseFee,
        networkPassphrase,
    });

    Tx2.addOperation(
        Operation.payment({
            destination: motherAcc.publicKey(),
            amount: totalPlatformFee.toString(),
            asset: PLATFORM_ASSET,
            source: buyer,
        }),
    )
        .setTimeout(0);

    const buildTrx = Tx2.build();

    buildTrx.sign(motherAcc);

    const xdr = buildTrx.toXDR();
    const singedXdr = await WithSing({ xdr, signWith });
    return singedXdr;
}


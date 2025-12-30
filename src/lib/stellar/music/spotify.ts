import { Asset, BASE_FEE, Horizon, Keypair, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { STELLAR_URL, TrxBaseFee, networkPassphrase } from "../constant";
import { env } from "~/env";
import { StellarAccount } from "~/lib/stellar/stellar";

export const sendRewardAssetToStorage = async (
    {
        assetCode,
        maximumRewardAmount,
        assetIssuer,
        storageSecret,
        userId
    }: {
        assetCode: string;
        maximumRewardAmount: number;
        assetIssuer: string;
        storageSecret: string;
        userId: string;
    }
) => {
    const asset = new Asset(assetCode, assetIssuer);
    const server = new Horizon.Server(STELLAR_URL);
    const motherKeyPair = Keypair.fromSecret(env.MOTHER_SECRET);

    const transactionInializer = await server.loadAccount(motherKeyPair.publicKey());
    const storageKeyPair = Keypair.fromSecret(storageSecret);
    const storageAcc = await StellarAccount.create(storageKeyPair.publicKey());

    const hasTrust = storageAcc.hasTrustline(asset.code, asset.issuer);

    const Tx1 = new TransactionBuilder(transactionInializer, {
        fee: TrxBaseFee,
        networkPassphrase,
    })
    if (!hasTrust) {
        Tx1.addOperation(
            Operation.changeTrust({
                asset,
                source: storageKeyPair.publicKey(),
            })
        );
    }
    Tx1.addOperation(
        Operation.payment({
            destination: storageKeyPair.publicKey(),
            asset,
            source: userId,
            amount: maximumRewardAmount.toFixed(7),
        })
    ).setTimeout(0);
    const buildTrx = Tx1.build();
    if (!hasTrust) {
        buildTrx.sign(motherKeyPair, storageKeyPair);
    }
    else {
        buildTrx.sign(storageKeyPair);
    }
    return buildTrx.toXDR();

}


export const getClaimXDR = async (
    {
        assetCode,
        rewardAmount,
        assetIssuer,
        storageSecret,
        userId
    }: {
        assetCode: string;
        rewardAmount: number;
        assetIssuer: string;
        storageSecret: string;
        userId: string;
    }
) => {
    const asset = new Asset(assetCode, assetIssuer);
    const server = new Horizon.Server(STELLAR_URL);
    const motherKeyPair = Keypair.fromSecret(env.MOTHER_SECRET);

    const transactionInializer = await server.loadAccount(motherKeyPair.publicKey());
    const storageKeyPair = Keypair.fromSecret(storageSecret);
    const storageAcc = await StellarAccount.create(storageKeyPair.publicKey());
    const userAcc = await StellarAccount.create(userId);
    const hasTrust = userAcc.hasTrustline(asset.code, asset.issuer);

    const Tx1 = new TransactionBuilder(transactionInializer, {
        fee: TrxBaseFee,
        networkPassphrase,
    })
    if (!hasTrust) {
        Tx1.addOperation(
            Operation.changeTrust({
                asset,
                source: userId,
            })
        );
    }
    Tx1.addOperation(
        Operation.payment({
            destination: userId,
            asset,
            source: storageKeyPair.publicKey(),
            amount: rewardAmount.toFixed(7),
        })
    ).setTimeout(0);
    const buildTrx = Tx1.build();
    buildTrx.sign(motherKeyPair, storageKeyPair);
    return {
        xdr: buildTrx.toXDR(),
        needSign: !hasTrust,
    };

}

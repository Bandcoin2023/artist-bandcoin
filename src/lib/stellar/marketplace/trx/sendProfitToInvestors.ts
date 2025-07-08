import { networkPassphrase, PLATFORM_ASSET, STELLAR_URL, TrxBaseFee } from "../../constant";
import { Asset, Horizon, Keypair, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { MOTHER_SECRET, STORAGE_SECRET } from "../SECRET";

export const XDR4SendPlotToInvestorInXLM = async ({
    pubkey,
    TotalAmount,
    holders,
}: {
    pubkey: string;
    TotalAmount: number;
    holders: string[];
}) => {
    const server = new Horizon.Server(STELLAR_URL);
    const motherAcc = Keypair.fromSecret(MOTHER_SECRET);

    const loadMotherAcc = await server.loadAccount(motherAcc.publicKey());

    const loadUserAcc = await server.loadAccount(pubkey);

    const balance = loadUserAcc.balances.find((b) => b.asset_type === "native");
    if (!balance) {
        throw new Error("User account does not have XLM balance");
    }
    if (Number(balance.balance) < TotalAmount) {
        throw new Error("User account does not have enough XLM balance");
    }


    const Tx2 = new TransactionBuilder(loadMotherAcc, {
        fee: TrxBaseFee,
        networkPassphrase,
    });


    const paymentForPerPerson = TotalAmount / holders.length;

    Tx2.addOperation(
        Operation.payment({
            destination: motherAcc.publicKey(),
            amount: TotalAmount.toPrecision(7),
            asset: Asset.native(),
            source: pubkey,
        }),
    );

    holders.forEach((holder) => {
        Tx2.addOperation(
            Operation.payment({
                destination: holder,
                amount: paymentForPerPerson.toPrecision(7),
                asset: Asset.native(),
            }),
        );
    });

    Tx2.setTimeout(0);

    const buildTrx = Tx2.build();

    buildTrx.sign(motherAcc);

    const xdr = buildTrx.toXDR();
    return xdr;

}
export const XDR4SendPlotToInvestorInUSDC = async ({
    pubkey,
    TotalAmount,
    holders,
}: {
    pubkey: string;
    TotalAmount: number;
    holders: string[];
}) => {
    const server = new Horizon.Server(STELLAR_URL);
    const motherAcc = Keypair.fromSecret(MOTHER_SECRET);

    const loadMotherAcc = await server.loadAccount(motherAcc.publicKey());


    const Tx2 = new TransactionBuilder(loadMotherAcc, {
        fee: TrxBaseFee,
        networkPassphrase,
    });


    const paymentForPerPerson = TotalAmount / holders.length;


    holders.forEach((holder) => {
        Tx2.addOperation(
            Operation.payment({
                destination: holder,
                amount: paymentForPerPerson.toPrecision(7),
                asset: new Asset(PLATFORM_ASSET.code, PLATFORM_ASSET.issuer),
            }),
        );
    });

    Tx2.setTimeout(0);

    const buildTrx = Tx2.build();

    buildTrx.sign(motherAcc);

    const xdr = buildTrx.toXDR();
    return xdr;

}

export const XDR4SendPlotToInvestorInPlatformAsset = async ({
    pubkey,
    TotalAmount,
    holders,
}: {
    pubkey: string;
    TotalAmount: number;
    holders: string[];
}) => {
    const server = new Horizon.Server(STELLAR_URL);
    const motherAcc = Keypair.fromSecret(MOTHER_SECRET);

    const loadMotherAcc = await server.loadAccount(motherAcc.publicKey());

    const loadUserAcc = await server.loadAccount(pubkey);

    const balance = loadUserAcc.balances.map((b) => {
        if (b.asset_type === 'credit_alphanum4' || b.asset_type === 'credit_alphanum12') {
            if (b.asset_code === PLATFORM_ASSET.code && b.asset_issuer === PLATFORM_ASSET.issuer) {
                return b.balance;
            }
        }
    });
    if (!balance) {
        throw new Error("User account does not have XLM balance");
    }
    if (balance && Number(balance) < TotalAmount) {
        throw new Error("User account does not have enough XLM balance");
    }



    const Tx2 = new TransactionBuilder(loadMotherAcc, {
        fee: TrxBaseFee,
        networkPassphrase,
    });


    const paymentForPerPerson = TotalAmount / holders.length;

    Tx2.addOperation(
        Operation.payment({
            destination: motherAcc.publicKey(),
            amount: TotalAmount.toPrecision(7),
            asset: new Asset(PLATFORM_ASSET.code, PLATFORM_ASSET.issuer),
            source: pubkey,
        }),
    );

    holders.forEach((holder) => {
        Tx2.addOperation(
            Operation.payment({
                destination: holder,
                amount: paymentForPerPerson.toPrecision(7),
                asset: new Asset(PLATFORM_ASSET.code, PLATFORM_ASSET.issuer),
            }),
        );
    });

    Tx2.setTimeout(0);

    const buildTrx = Tx2.build();

    buildTrx.sign(motherAcc);

    const xdr = buildTrx.toXDR();
    return xdr;

}
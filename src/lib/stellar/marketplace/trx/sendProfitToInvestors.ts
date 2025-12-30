import { Asset } from "@stellar/stellar-sdk";
import { PLATFORM_ASSET, TrxBaseFee } from "../../constant";
import type { SignUserType } from "../../utils";
import { WithSing } from "../../utils";
import {
    getServerAndMotherAcc,
    createTransactionBuilder,
    addPaymentOp,
    finalizeTransaction,
    getNativeBalance,
    getAssetBalance,
} from "../../helper";

export const XDR4SendPlotToInvestorInXLM = async ({
    pubkey,
    TotalAmount,
    holders,
    signWith
}: {
    pubkey: string;
    TotalAmount: number;
    holders: string[];
    signWith: SignUserType;
}) => {
    const { motherAcc } = getServerAndMotherAcc();

    // Check user's XLM balance
    const userBalance = await getNativeBalance(pubkey);
    if (userBalance < TotalAmount) {
        throw new Error("User account does not have enough XLM balance");
    }

    const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

    const paymentForPerPerson = TotalAmount / holders.length;

    // User pays to mother
    addPaymentOp(
        transaction,
        motherAcc.publicKey(),
        TotalAmount.toPrecision(7),
        Asset.native(),
        pubkey
    );

    // Mother pays to each holder
    holders.forEach((holder) => {
        addPaymentOp(
            transaction,
            holder,
            paymentForPerPerson.toPrecision(7),
            Asset.native()
        );
    });

    const xdr = finalizeTransaction(transaction, [motherAcc]);

    const signedXdr = await WithSing({ xdr, signWith });
    return signedXdr;
}
export const XDR4SendPlotToInvestorInUSDC = async ({
    TotalAmount,
    holders,
    signWith
}: {
    pubkey?: string;
    TotalAmount: number;
    holders: string[];
    signWith: SignUserType;
}) => {
    const { motherAcc } = getServerAndMotherAcc();

    const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

    const paymentForPerPerson = TotalAmount / holders.length;

    // Pay to each holder
    holders.forEach((holder) => {
        addPaymentOp(
            transaction,
            holder,
            paymentForPerPerson.toPrecision(7),
            PLATFORM_ASSET
        );
    });

    const xdr = finalizeTransaction(transaction, [motherAcc]);

    const signedXdr = await WithSing({ xdr, signWith });
    return signedXdr;
}

export const XDR4SendPlotToInvestorInPlatformAsset = async ({
    pubkey,
    TotalAmount,
    holders,
    signWith
}: {
    pubkey: string;
    TotalAmount: number;
    holders: string[];
    signWith: SignUserType;
}) => {
    const { motherAcc } = getServerAndMotherAcc();

    // Check user's platform asset balance
    const userBalance = await getAssetBalance(pubkey, PLATFORM_ASSET.code, PLATFORM_ASSET.issuer);
    if (userBalance < TotalAmount) {
        throw new Error("User account does not have enough platform asset balance");
    }

    const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

    const paymentForPerPerson = TotalAmount / holders.length;

    // User pays to mother
    addPaymentOp(
        transaction,
        motherAcc.publicKey(),
        TotalAmount.toPrecision(7),
        PLATFORM_ASSET,
        pubkey
    );

    // Mother pays to each holder
    holders.forEach((holder) => {
        addPaymentOp(
            transaction,
            holder,
            paymentForPerPerson.toPrecision(7),
            PLATFORM_ASSET
        );
    });

    const xdr = finalizeTransaction(transaction, [motherAcc]);

    const signedXdr = await WithSing({ xdr, signWith });
    return signedXdr;
}
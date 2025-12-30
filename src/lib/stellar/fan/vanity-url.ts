import { db } from "~/server/db"
import { addMonths } from 'date-fns'
import type { SignUserType } from "../utils";
import { WithSing } from "../utils";
import { PLATFORM_ASSET, TrxBaseFee } from "../constant";
import { getServerAndMotherAcc, createTransactionBuilder, addPaymentOp, finalizeTransaction } from "../helper";


export async function getVanitySubscriptionXDR({
    amount,
    signWith,
    userPubKey,
}: {
    amount: number;
    signWith: SignUserType;
    userPubKey: string;
}) {
    const { motherAcc } = getServerAndMotherAcc();

    const transaction = await createTransactionBuilder(motherAcc.publicKey(), TrxBaseFee);

    addPaymentOp(
        transaction,
        motherAcc.publicKey(),
        amount.toFixed(7).toString(),
        PLATFORM_ASSET,
        userPubKey
    );

    const xdr = finalizeTransaction(transaction, [motherAcc]);

    const signedXdr = WithSing({ xdr, signWith });

    return signedXdr;
}


export async function createOrRenewVanitySubscription(
    {
        creatorId,
        isChanging,
        amount,
        vanityURL
    }: {
        creatorId: string;
        isChanging: boolean;
        amount: number;
        vanityURL?: string | null;
    }

) {
    const creator = await db.creator.findUnique({
        where: { id: creatorId },
        include: { vanitySubscription: true },
    })

    if (!creator) {
        throw new Error('Creator not found')
    }


    if (isChanging) {
        // Change vanity URL
        return db.creator.update({
            where: { id: creatorId },
            data: {
                vanityURL: vanityURL,
                vanitySubscription: {
                    update: {
                        lastPaymentAmount: amount,
                    },
                },
            },
        })
    }

    const now = new Date()
    const endDate = addMonths(now, 1)

    if (creator.vanitySubscription) {
        // Renew existing subscription
        return db.vanitySubscription.update({
            where: { id: creator.vanitySubscription.id },
            data: {
                endDate,
                lastPaymentAmount: amount,
                lastPaymentDate: now,

            },
        })
    } else {
        return db.creator.update({
            where: { id: creatorId },
            data: {
                vanityURL: vanityURL,
                vanitySubscription: {
                    create: {
                        endDate,
                        lastPaymentAmount: amount,
                        lastPaymentDate: now,
                    },
                },
            },
        })


    }
}

export async function checkAvailability(
    vanityURL: string

) {
    const existingCreator = await db.creator.findUnique({
        where: { vanityURL: vanityURL },
    });

    return { isAvailable: !existingCreator };
}

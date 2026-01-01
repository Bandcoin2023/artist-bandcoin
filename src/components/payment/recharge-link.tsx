import { useSession } from "next-auth/react";
import Link from "next/link";
import React from "react";
import { Button } from "~/components/shadcn/ui/button";
import { WalletType } from "package/connect_wallet";
import { isRechargeAbleClient } from "~/utils/recharge/is-rechargeable-client";

export default function RechargeLink() {
    const session = useSession();
    const walletType = session.data?.user.walletType ?? WalletType.none;

    const isFBorGoogle = isRechargeAbleClient(walletType);
    if (1)
        return (
            <>
                {
                    isFBorGoogle ? (
                        <Link className=" underline w-full text-end" href={isFBorGoogle ? "/recharge" : "/"}>
                            Click Here to Recharge
                        </Link>
                    ) : walletType === WalletType.albedo && (
                        <Link className=" underline w-full text-end" href={"https://albedo.link/wallet/swap"}>
                            Click Here to Recharge
                        </Link>
                    )

                }
            </>
        );
}

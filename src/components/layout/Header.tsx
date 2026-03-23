import Image from "next/image";
import React, { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

import { Bell, Coins, Plus, Settings, ShoppingBag, ShoppingCart } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Lottie from "lottie-react"

import Link from "next/link";
import { useRouter } from "next/router";
import { WalletType } from "package/connect_wallet/src/lib/enums";
import { Button } from "~/components/shadcn/ui/button";
import { Mode, useMode } from "~/lib/state/fan/left-side-mode";
import { useUserStellarAcc } from "~/lib/state/wallete/stellar-balances";
import { PLATFORM_ASSET } from "~/lib/stellar/constant";
import { api } from "~/utils/api";
import { isRechargeAbleClient } from "~/utils/recharge/is-rechargeable-client";
import { useCredits } from "~/hooks/use-credits";
import dynamic from "next/dynamic";

// const ChristmasSleighAnimation = dynamic(() => import('../christmas/ChristmasSleigh'), {
//     ssr: false,
// });
// const ChristmasWindChimeAnimation = dynamic(() => import('../christmas/ChristmasWindChimes'), {
//     ssr: false,
// });

function Header() {
    const session = useSession();

    return (
        <header className="fixed left-0 right-0  top-0 z-50 h-11  shadow-sm shadow-foreground/20 backdrop-blur-sm bg-primary/30  ">
            <div className="relative h-full overflow-hidden  mx-auto w-[85vw]">
                <div className="relative z-10 flex h-full items-center justify-between px-2">
                    <div className="flex items-center gap-2 md:gap-3">
                        <Link href="/" className="flex items-center gap-1">
                            <div className="relative ml-1 h-7 w-7 md:h-8 md:w-8">
                                <Image
                                    fill
                                    alt="logo"
                                    src="/images/logo.png"
                                    sizes="40px"
                                />
                            </div>
                            <h1 className="relative hidden text-sm font-bold capitalize text-black md:block md:text-lg">
                                {PLATFORM_ASSET.code.toLocaleUpperCase()}
                                {/* <ChristmasSleighAnimation /> */}
                                <p className="absolute right-0 top-0 -mr-4 -mt-1 text-xs">TM</p>
                            </h1>
                        </Link>
                    </div>
                    <div className="flex items-center gap-2">
                        <HeaderButtons />
                        {session.status === "authenticated" ? (
                            <Button
                                onClick={() => void signOut({ callbackUrl: "/home" })}
                                className="h-8 px-2"
                            >
                                Logout
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>
            {/* <div className="absolute top-[4rem] left-0 right-0 w-full z-50 flex overflow-hidden  pointer-events-none">
                <div className="flex  h-12 pointer-events-none">
                    {Array.from({ length: 20 }, (_, index) => (
                        <Image
                            key={index}
                            src="/tn-christmas-lights.webp"
                            alt=""
                            width={1000}
                            height={1000}
                            className="object-cover w-full h-full"
                            priority={index === 0}
                        />
                    ))}
                </div>

            </div> */}

        </header>
    );
}

export default Header;


const HeaderButtons = () => {
    const { setBalance, setActive } = useUserStellarAcc();
    const { balance } = useCredits()
    const session = useSession();
    const router = useRouter();

    const isAIRoute = router.pathname.startsWith("/studio") || router.pathname.startsWith("/ai-generation") || router.pathname.startsWith("/text-generation") || router.pathname.startsWith("/ai");

    const bal = api.wallate.acc.getAccountBalance.useQuery(undefined, {
        onSuccess: (data) => {
            const { balances } = data;
            setBalance(balances);
            setActive(true);
        },
        onError: (error) => {
            setActive(false);
        },
        enabled: session.data?.user?.id !== undefined,
    });
    const updateMutation = api.fan.notification.updateNotification.useMutation();

    const updateNotification = () => {
        updateMutation.mutate();
    };

    const { data: notificationCount } =
        api.fan.notification.getUnseenNotificationCount.useQuery(
            undefined,
            {
                enabled: session.data?.user?.id !== undefined,
            }
        );

    const walletType = session.data?.user.walletType ?? WalletType.none;

    const isFBorGoogle = isRechargeAbleClient(walletType);

    if (walletType == WalletType.none) return null;

    if (bal.isLoading) return <div className="skeleton h-10 w-48"></div>;

    if (notificationCount === undefined)
        return <div className="skeleton h-10 w-48"></div>;

    return (
        <div className="flex items-center justify-center gap-1 ">

            {
                isAIRoute ? <>
                    <Link href="/ai/credits" className="">
                        <Button
                            variant="destructive"
                            onClick={(e) => e.preventDefault()}
                            className="h-8 w-full px-2 text-xs shadow-sm shadow-foreground">
                            <div className="flex items-center justify-center gap-1">

                                {balance.toFixed(2)} CREDITS

                            </div>
                        </Button>
                    </Link>
                </>
                    : <>
                        <Link href="/wallet-balance" className="">
                            <Button className="h-8 gap-0 px-2 text-xs" variant='default'>
                                <span className="hidden md:block">
                                    {PLATFORM_ASSET.code.toUpperCase()}
                                </span>
                                <span className="flex gap-1">
                                    <span className="hidden md:flex">{":"}</span>
                                    {bal.data?.platformAssetBal.toFixed(0)}
                                </span>
                            </Button>
                        </Link>
                        {isFBorGoogle && (
                            <Link className=" " href={"/recharge"}>
                                <Button className="h-8 px-2">
                                    <ShoppingCart />
                                </Button>
                            </Link>
                        )}

                        {/* Main Neon Try Studio Button */}


                    </>
            }
            <Button
                className="relative h-8 px-2"
                onClick={async () => {
                    await router.push("/notification");
                    updateNotification();
                }}
            >
                {notificationCount > 0 && (
                    <div className="absolute -top-0 right-0 h-2 w-2  rounded-full bg-red-500"></div>
                )}
                <Bell />
            </Button>
        </div>

    );
};

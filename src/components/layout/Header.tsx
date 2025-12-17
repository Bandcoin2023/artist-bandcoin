import Image from "next/image";
import React, { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

import { ArrowRight, Bell, Coins, Menu, Plus, Settings, ShoppingBag, ShoppingCart, Sparkles, Zap } from "lucide-react";
import { useSession } from "next-auth/react";
import Lottie from "lottie-react"

import Link from "next/link";
import { useRouter } from "next/router";
import { WalletType } from "package/connect_wallet/src/lib/enums";
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from "~/components/shadcn/ui/sheet";
import { Button } from "~/components/shadcn/ui/button";
import { Mode, useMode } from "~/lib/state/fan/left-side-mode";
import { useUserStellarAcc } from "~/lib/state/wallete/stellar-balances";
import { PLATFORM_ASSET } from "~/lib/stellar/constant";
import { api } from "~/utils/api";
import { useSidebar } from "~/hooks/use-sidebar";
import { DashboardNav } from "./Left-sidebar/dashboard-nav";
import { LeftBottom, LeftNavigation } from "./Left-sidebar/sidebar";
import { isRechargeAbleClient } from "~/utils/recharge/is-rechargeable-client";
import { useCredits } from "~/hooks/use-credits";
import dynamic from "next/dynamic";

const ChristmasSleighAnimation = dynamic(() => import('../christmas/ChristmasSleigh'), {
    ssr: false,
});
const ChristmasWindChimeAnimation = dynamic(() => import('../christmas/ChristmasWindChimes'), {
    ssr: false,
});

function Header() {
    const { isSheetOpen, setIsSheetOpen } = useSidebar();

    return (
        <header className="sticky w-full top-0 z-50 h-22  bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="relative h-22 px-2 py-4 ">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: "url('/images/header.png')",
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-accent/30 via-accent/15  to-accent/10" />
                </div>
                <ChristmasWindChimeAnimation />
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    variant="link"
                                    className="md:hidden p-2"
                                >
                                    <Menu color="white" />
                                </Button>
                            </SheetTrigger>

                            <SheetContent side="left" className="w-72 p-0">
                                <SheetHeader className="flex items-center justify-between bg-primary p-2 rounded-md shadow-md">

                                    <Link href="/" className="">
                                        <div className="flex items-center gap-1 ">
                                            <Image
                                                alt="logo"
                                                objectFit="cover"
                                                src="/images/logo.png"
                                                height={200}
                                                width={200}
                                                className=" h-10 w-10"
                                            />
                                            <h1 className="relative text-xl font-bold capitalize text-black md:text-4xl ">
                                                <p className="">{PLATFORM_ASSET.code.toLocaleUpperCase()}</p>
                                                <p className="absolute  right-0 top-0 -mr-4 -mt-1  text-xs">TM</p>
                                            </h1>

                                        </div>
                                    </Link>
                                </SheetHeader>
                                <div className="flex h-full w-full flex-col items-center justify-between p-2 no-scrollbar">
                                    <div className="flex w-full overflow-x-hidden flex-col py-2">
                                        <DashboardNav items={LeftNavigation} />
                                    </div>
                                    <div className="relative">
                                        <Button

                                            className="
              relative text-xl font-bold
              bg-black
              border-2 border-accent dark:border-primary
              text-accent dark:text-primary
              hover:text-white dark:hover:text-black
              transition-all duration-300
              overflow-hidden
              group
              neon-studio-button
              backdrop-blur-sm
              hover:px-6
            "
                                        >
                                            {/* Always-Active Background Animations */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/20 to-accent/0 dark:from-primary/0 dark:via-primary/30 dark:to-primary/0 animate-neon-sweep"></div>
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent animate-shimmer-fast"></div>
                                            <div className="absolute inset-0 bg-gradient-to-l from-purple-500/0 via-purple-500/15 to-purple-500/0 dark:from-purple-400/0 dark:via-purple-400/20 dark:to-purple-400/0 animate-reverse-sweep"></div>

                                            {/* Button Text with Icons */}
                                            <div className="relative z-10 flex items-center gap-3">
                                                <Sparkles className="w-5 h-5 animate-spin-slow" />
                                                <span className="tracking-wider font-semibold">TRY STUDIO</span>
                                                <div className="flex items-center gap-1">
                                                    <Zap className="w-4 h-4 animate-pulse" />
                                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                                                </div>
                                            </div>

                                            {/* Hover Fill Effect */}
                                            <div className="absolute inset-0 bg-accent dark:bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center"></div>
                                        </Button>


                                    </div>
                                    <div className="flex w-full flex-col items-center">
                                        <LeftBottom />
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                        <Link href="/" className="flex items-center gap-1">
                            <div className="relative ml-2 hidden h-14 w-14 md:block">
                                <Image
                                    fill
                                    alt="logo"
                                    src="/images/logo.png"
                                    sizes="56px"
                                />
                            </div>
                            <h1 className="hidden md:block relative text-xl font-bold capitalize text-white md:text-4xl">
                                {PLATFORM_ASSET.code.toLocaleUpperCase()}
                                <ChristmasSleighAnimation />
                                <p className="absolute right-0 top-0 -mr-4 -mt-1 text-xs">TM</p>
                            </h1>
                        </Link>
                    </div>
                    <HeaderButtons />
                </div>
            </div>
            <div className="absolute top-[4rem] left-0 right-0 w-full z-50 flex overflow-hidden  pointer-events-none">
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

            </div>

        </header>
    );
}

export default Header;


const HeaderButtons = () => {
    const { setBalance, setActive } = useUserStellarAcc();
    const { balance } = useCredits()
    const session = useSession();
    const router = useRouter();

    const isAIRoute = router.pathname.startsWith("/artist/studio") || router.pathname.startsWith("/ai-generation") || router.pathname.startsWith("/text-generation") || router.pathname.startsWith("/ai");

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
        <div className=" flex items-center justify-center gap-1 ">

            {
                isAIRoute ? <>
                    <Link href="/ai/credits" className="">
                        <Button
                            variant="destructive"
                            onClick={(e) => e.preventDefault()}
                            className=" w-full shadow-sm shadow-foreground ">
                            <div className="flex items-center justify-center gap-1">

                                {balance.toFixed(2)} CREDITS

                            </div>
                        </Button>
                    </Link>
                </>
                    : <>
                        <Link href="/wallet-balance" className="">
                            <Button className="flex gap-0" variant='default'>
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
                                <Button className="">
                                    <ShoppingCart />
                                </Button>
                            </Link>
                        )}

                        {/* Main Neon Try Studio Button */}


                    </>
            }
            <Button
                className=" relative "
                onClick={async () => {
                    await router.push("/notification");
                    updateNotification();
                }}
            >
                {notificationCount > 0 && (
                    <div className="absolute -top-2 left-0 h-4 w-4  rounded-full bg-red-500"></div>
                )}
                <Bell />
            </Button>
            <Button
                className=" relative "
                onClick={async () => {
                    await router.push("/settings");
                }}
            >

                <Settings />
            </Button>
        </div>

    );
};


"use client";
import clsx from "clsx";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import React from "react";
import { ChevronLeft } from "lucide-react";

import { ThemeProvider } from "../../providers/theme-provider";
import { ConnectWalletButton } from "package/connect_wallet";

import Header from "../Header";
import Sidebar, { LeftNavigation } from "../Left-sidebar/sidebar";
import { cn } from "~/lib/utils";
import { useSidebar } from "~/hooks/use-sidebar";

export default function Layout({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const session = useSession();
    const { isMinimized, toggle } = useSidebar();

    const handleToggle = () => {
        toggle();
    };
    return (
        <ThemeProvider>
            <div className=" w-full  h-screen  overflow-hidden"
            >
                <Header />
                <div className="flex w-full ">
                    <div className="relative  ">
                        <Sidebar />
                        <ChevronLeft
                            className={cn(
                                "absolute -right-4 top-1  hidden md:block  cursor-pointer rounded-full border-2 shadow-sm shadow-black bg-background text-3xl text-foreground",
                                isMinimized && "rotate-180",
                            )}
                            onClick={handleToggle}
                        />
                    </div>

                    {
                        session.status === "authenticated" ?
                            <>
                                <div className="w-full h-full p-2 md:p-6  ">
                                    {children}
                                </div>
                            </>
                            :
                            <div className="w-full h-screen flex items-center justify-center ">
                                <ConnectWalletButton />
                            </div>

                    }


                </div>
            </div>
        </ThemeProvider>
    );
}
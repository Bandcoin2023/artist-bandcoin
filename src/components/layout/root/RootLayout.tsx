"use client";
import clsx from "clsx";
import { useSession } from "next-auth/react";

import type React from "react";
import { ChevronLeft } from "lucide-react";

import { ThemeProvider } from "../../providers/theme-provider";
import { ConnectWalletButton } from "package/connect_wallet";

import Header from "../Header";
import Sidebar from "../Left-sidebar/sidebar";
import { cn } from "~/lib/utils";
import { useSidebar } from "~/hooks/use-sidebar";
import ModalProvider from "~/components/providers/modal-provider";
import { Toaster } from "~/components/shadcn/ui/toaster";
import { useRouter } from "next/router";

import CreatorLayout from "./CreatorLayout";
import { MiniPlayerProvider } from "~/components/player/mini-player-provider";
import LoginRequiredModal from "~/components/modal/login-required-modal";
import { BottomPlayerProvider } from "~/components/player/context/bottom-player-context";
import { StemPlayer } from "~/components/player/bottom-player";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/shadcn/ui/card";
import ARModalProvider from "~/components/providers/augmented-reality/augmented-modal-provider";
import ARLayout from "./ARLayout";
import FallingSnowflakes from "~/components/christmas/FallingSnowflakes";
export default function Layout({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const session = useSession();
    const { isMinimized, toggle } = useSidebar();

    const router = useRouter();

    const isArtistRoutes = router.pathname.startsWith("/artist");
    const publicRoutes = ["/about", "/privacy", "/support", "/"];
    const isPublicRoute = publicRoutes.includes(router.pathname);
    const isStudioRoute = router.pathname.startsWith("/artist/studio") || router.pathname.startsWith("/ai-generation") || router.pathname.startsWith("/text-generation") || router.pathname.startsWith("/ai");
    // Check for AR camera/QR routes that should NOT get ARLayout wrapper
    const isAugmentedRealityRoute =
        router.pathname.startsWith("/action/ar/") ||
        router.pathname === "/action/ar";

    const handleToggle = () => {
        toggle();
    };
    if (router.pathname.includes("/action/")) {
        // if (router.pathname.includes("/action/enter")) {
        //   return <>{children}</>;
        // }
        return (
            <>
                {session?.status === "authenticated" ||
                    router.pathname.includes("/action/qr") ? (
                    <div className="fixed inset-0 h-screen w-full overflow-hidden">
                        {isAugmentedRealityRoute ? (
                            <>
                                <ARModalProvider />
                                {children}
                            </>
                        ) : (
                            <ARLayout>
                                <ARModalProvider />
                                {children}
                            </ARLayout>
                        )}
                    </div>
                ) : (
                    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
                        <Card className="mx-4 w-full max-w-[350px]">
                            <CardHeader className="text-center">
                                <CardTitle className="text-lg sm:text-xl">
                                    Welcome to Bandcoin AR
                                </CardTitle>
                                <CardDescription className="text-sm sm:text-base">
                                    Please login/signup to continue
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-center">
                                <ConnectWalletButton />
                            </CardContent>
                        </Card>
                    </div>
                )}
            </>
        );
    }
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
        >
            <MiniPlayerProvider>
                <BottomPlayerProvider>
                    <div className={clsx("flex h-screen w-full flex-col")}>
                        <Header />
                        {isStudioRoute ? (
                            session.status === "authenticated" ? (
                                <>
                                    {children}
                                    <ModalProvider />
                                </>
                            ) : (
                                <div className="flex h-screen w-full items-center justify-center ">
                                    <ConnectWalletButton />
                                </div>
                            )
                        ) : (
                            <div className="grid h-[calc(100vh-10.8vh)] w-full grid-cols-[auto_1fr] overflow-hidden scrollbar-hide">
                                <div className="relative overflow-y-auto bg-secondary shadow-sm shadow-primary transition-all duration-500 ease-in-out scrollbar-hide">
                                    <Sidebar />
                                    <ChevronLeft
                                        className={cn(
                                            "fixed left-[17rem] top-24 z-10 hidden cursor-pointer rounded-full border-2 bg-background text-3xl text-foreground shadow-sm shadow-black transition-all duration-500 ease-in-out md:block",
                                            isMinimized && "left-[4.5rem] rotate-180",
                                        )}
                                        onClick={handleToggle}
                                    />
                                </div>

                                {session.status === "authenticated" ? (
                                    <div className="w-full overflow-y-auto scrollbar-hide lg:pl-4 p-0">
                                        {isArtistRoutes ? (
                                            <>
                                                <CreatorLayout>{children}</CreatorLayout>
                                            </>
                                        ) : (
                                            <>{children}</>
                                        )}
                                        <ModalProvider />
                                        <Toaster />
                                    </div>
                                ) : isPublicRoute ? (
                                    <div className="w-full overflow-y-auto scrollbar-hide lg:pl-4">
                                        <>{children}</>
                                        <LoginRequiredModal />
                                    </div>
                                ) : (
                                    <div className="flex h-screen w-full items-center justify-center ">
                                        <ConnectWalletButton />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <StemPlayer />
                    {/* <FallingSnowflakes /> */}
                </BottomPlayerProvider>
            </MiniPlayerProvider>
        </ThemeProvider>
    );
}
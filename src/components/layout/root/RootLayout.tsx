"use client";
import clsx from "clsx";
import { useSession } from "next-auth/react";

import type React from "react";

import { ThemeProvider } from "../../providers/theme-provider";
import { ConnectWalletButton } from "package/connect_wallet";

import Header from "../Header";
import ModalProvider from "~/components/providers/modal-provider";
import { Toaster } from "~/components/shadcn/ui/toaster";
import { useRouter } from "next/router";

import CreatorLayout from "./CreatorLayout";
import { MiniPlayerProvider } from "~/components/player/mini-player-provider";
import LoginRequiredModal from "~/components/modal/login-required-modal";
import { BottomPlayerProvider } from "~/components/player/context/bottom-player-context";
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
import GlobalFloatingNav from "~/components/navigation/global-floating-nav";
export default function Layout({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const session = useSession();

    const router = useRouter();

    const isArtistRoutes = router.pathname.startsWith("/artist");
    const publicRoutes = ["/about", "/privacy", "/support", "/"];
    const isPublicRoute = publicRoutes.includes(router.pathname);
    const isStudioRoute = router.pathname.startsWith("/artist/studio") || router.pathname.startsWith("/ai-generation") || router.pathname.startsWith("/text-generation") || router.pathname.startsWith("/ai");
    // Check for AR camera/QR routes that should NOT get ARLayout wrapper
    const isAugmentedRealityRoute =
        router.pathname.startsWith("/action/ar/") ||
        router.pathname === "/action/ar";

    if (router.pathname.includes("/action/")) {
        // if (router.pathname.includes("/action/enter")) {
        //   return <>{children}</>;
        // }
        return (
            <>
                {session?.status === "authenticated" ? (
                    <div className="fixed inset-0 h-screen w-full overflow-hidden">
                        {isAugmentedRealityRoute ? (
                            <>
                                <ARModalProvider />
                                {children}
                                <GlobalFloatingNav />
                            </>
                        ) : (
                            <ARLayout>
                                <ARModalProvider />
                                {children}
                                <GlobalFloatingNav />
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
                        <GlobalFloatingNav />
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
                    <div className={clsx("flex h-screen w-full flex-col ")}>
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
                            <div className="h-[calc(100vh-4rem)] w-full overflow-hidden scrollbar-hide">
                                {session.status === "authenticated" ? (
                                    <div className="h-full w-full overflow-y-auto p-0 scrollbar-hide">
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
                                    <div className="h-full w-full overflow-y-auto scrollbar-hide">
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
                    <GlobalFloatingNav />
                    {/* <FallingSnowflakes /> */}
                </BottomPlayerProvider>
            </MiniPlayerProvider>
        </ThemeProvider>
    );
}

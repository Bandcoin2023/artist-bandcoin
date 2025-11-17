"use client"
import clsx from "clsx"
import { useSession } from "next-auth/react"

import type React from "react"
import { ChevronLeft } from "lucide-react"

import { ThemeProvider } from "../../providers/theme-provider"
import { ConnectWalletButton } from "package/connect_wallet"

import Header from "../Header"
import Sidebar from "../Left-sidebar/sidebar"
import { cn } from "~/lib/utils"
import { useSidebar } from "~/hooks/use-sidebar"
import ModalProvider from "~/components/providers/modal-provider"
import { Toaster } from "~/components/shadcn/ui/toaster"
import { useRouter } from "next/router"

import CreatorLayout from "./CreatorLayout"
import { MiniPlayerProvider } from "~/components/player/mini-player-provider"
import LoginRequiredModal from "~/components/modal/login-required-modal"
import { BottomPlayerProvider } from "~/components/player/context/bottom-player-context"
import { StemPlayer } from "~/components/player/bottom-player"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/shadcn/ui/card";
import ARModalProvider from "~/components/providers/augmented-reality/augmented-modal-provider"
import ARLayout from "./ARLayout"
export default function Layout({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) {
    const session = useSession()
    const { isMinimized, toggle } = useSidebar()

    const router = useRouter()

    const isArtistRoutes = router.pathname.startsWith("/artist")
    const publicRoutes = ["/about", "/privacy", "/support", "/"]
    const isPublicRoute = publicRoutes.includes(router.pathname)
    const isStudioRoute = router.pathname.startsWith("/artist/studio")
    const isAugmentedRealityRoute = router.pathname.startsWith("/augmented-reality/ar");

    const handleToggle = () => {
        toggle()
    }
    if (router.pathname.includes("/augmented-reality")) {
        // if (router.pathname.includes("/augmented-reality/enter")) {
        //   return <>{children}</>;
        // }
        return (
            <>
                {session?.status === "authenticated" || router.pathname.includes("/augmented-reality/qr") ? (
                    <div className="h-screen w-full overflow-hidden fixed inset-0">
                        {
                            isAugmentedRealityRoute ? (

                                <>
                                    <ARModalProvider />
                                    {children}
                                </>
                            ) : (
                                <ARLayout>
                                    <ARModalProvider />
                                    {children}
                                </ARLayout>
                            )
                        }

                    </div>
                ) : (
                    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
                        <Card className="w-full max-w-[350px] mx-4">
                            <CardHeader className="text-center">
                                <CardTitle className="text-lg sm:text-xl">Welcome to Actionverse AR</CardTitle>
                                <CardDescription className="text-sm sm:text-base">Please login/signup to continue</CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-center">
                                <ConnectWalletButton />
                            </CardContent>
                        </Card>
                    </div>
                )}
            </>
        )
    }
    return (
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
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
                            <div className="grid w-full h-[calc(100vh-10.8vh)] grid-cols-[auto_1fr] scrollbar-hide overflow-hidden">
                                <div className="relative bg-secondary shadow-sm shadow-primary transition-all duration-500 ease-in-out overflow-y-auto scrollbar-hide">
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
                                    <div className="w-full overflow-y-auto scrollbar-hide lg:pl-6">
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
                                    <div className="w-full overflow-y-auto scrollbar-hide lg:pl-6">
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
                </BottomPlayerProvider>
            </MiniPlayerProvider>
        </ThemeProvider>
    )
}

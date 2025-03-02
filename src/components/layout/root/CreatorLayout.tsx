"use client"

import React, { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "~/lib/utils"
import { NavItem } from "~/types/icon-types"
import { ArrowRight, ChevronDown, ChevronsLeft, ChevronsRight, ChevronUp, PanelRight } from 'lucide-react'
import { Button } from "~/components/shadcn/ui/button"
// import ParticleBackground from "../components/particle-background"
import { useAdminSidebar } from "~/hooks/use-admin-sidebar"
import { AdminNav } from "../Admin-sidebar/admin-nav"
import CustomCursor from "~/components/common/custom-cursor"
import { ToggleButton } from "~/components/common/toggle-button-admin"
import { api } from "~/utils/api"
import { usePathname, useRouter } from "next/navigation"
import Loading from "~/components/common/loading"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "~/components/shadcn/ui/dropdown-menu"
import { useCreatorSidebar } from "~/hooks/use-creator-sidebar"
import { Mode, useModeStore } from "~/components/store/mode-store"
import CustomAvatar from "~/components/common/custom-avatar"
import { addrShort } from "~/utils/utils"
import { ModeSwitch } from "~/components/common/mode-switch"
import Link from "next/link"
import { Icons } from "../Left-sidebar/icons"

export default function CreatorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    const [cursorVariant, setCursorVariant] = useState("default");
    const creators = api.fan.creator.getAllCreator.useInfiniteQuery(
        { limit: 10 },
        {
            getNextPageParam: (lastPage) => lastPage.nextCursor,
        },
    );
    const path = usePathname();
    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const { isMinimized, toggle } = useCreatorSidebar();
    const {
        selectedMode,
        toggleSelectedMode,
        isTransitioning,
        startTransition,
        endTransition,
    } = useModeStore();
    const creator = api.fan.creator.meCreator.useQuery(undefined, {
        refetchOnWindowFocus: false,
    });


    return (
        <div className="relative  ">
            <div className="flex  gap-4  h-[calc(100vh-10.8vh)] overflow-hidden">
                {
                    selectedMode === Mode.User ? (
                        <>
                            <motion.div
                                className="flex-grow overflow-y-auto scrollbar-hide"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >

                                <div className="flex flex-col w-full  h-[calc(100vh-10.8vh)] ">
                                    {children}
                                </div>


                            </motion.div>
                            <AnimatePresence>
                                <motion.div
                                    className={cn(
                                        "fixed z-40 right-[13.3rem] top-1/2 hidden rotate-180 rounded-sm  md:block",
                                        isMinimized && "-rotate-180 right-[5.5rem]"
                                    )}
                                    transition={{ delay: 0.5, duration: 0.3 }}
                                >
                                    <ToggleButton
                                        isActive={!isMinimized}
                                        onToggle={toggle}
                                        onMouseEnter={() => setCursorVariant("hover")}
                                        onMouseLeave={() => setCursorVariant("default")}
                                    />
                                </motion.div>
                            </AnimatePresence>
                            <div className="hidden   h-[calc(100vh-23vh)] md:block bg-background border-[1px] rounded-sm">
                                <motion.div
                                    className={cn(
                                        "h-full  sticky top-0  p-1 w-full overflow-y-auto hidden md:block",
                                        !isMinimized ? "w-[210px]" : "w-[78px]"
                                    )}
                                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                    style={{ perspective: "1000px" }}
                                >
                                    <motion.div
                                        className="flex h-full w-full flex-col items-center justify-start py-2 no-scrollbar"
                                        animate={{ rotateY: isMinimized ? 30 : 0 }}
                                        transition={{ type: "spring", stiffness: 100, damping: 10 }}
                                    >
                                        <div className="flex w-full h-full overflow-x-hidden scrollbar-hide flex-col gap-2 p-1">
                                            {
                                                creators.isLoading ? (
                                                    Array.from({ length: 15 }).map((_, index) => (
                                                        // Skeleton loader
                                                        <div
                                                            key={index}
                                                            className="flex w-full items-center justify-start gap-2  rounded-md text-sm font-medium shadow-sm shadow-foreground hover:text-[#dbdd2c]"
                                                        >
                                                            <div className="flex items-center justify-center w-14 h-14 bg-gray-200 rounded-full animate-pulse"></div>
                                                            {
                                                                !isMinimized && (
                                                                    <div className="flex flex-col items-start justify-center gap-2">
                                                                        <h1 className="w-20 h-4 bg-gray-200 rounded-md animate-pulse"></h1>
                                                                        <p className="w-10 h-3 bg-gray-200 rounded-md animate-pulse"></p>
                                                                    </div>
                                                                )
                                                            }
                                                        </div>
                                                    ))
                                                ) : (
                                                    creators.data?.pages.map((creators) => (
                                                        creators.items.map((creator) => (
                                                            <Button
                                                                size="creator"
                                                                className="flex w-full items-center justify-start gap-2  rounded-md text-sm font-medium shadow-sm shadow-foreground hover:text-[#dbdd2c]"
                                                                key={creator.id}
                                                            >
                                                                <CustomAvatar url={creator.profileUrl} />
                                                                <div className="flex flex-col items-start justify-center">
                                                                    <h1 className="truncate">{creator.name}</h1>
                                                                    <p>{addrShort(creator.id, 4)}</p>
                                                                </div>
                                                            </Button>
                                                        )
                                                        )
                                                    ))
                                                )
                                            }
                                            {
                                                creators.hasNextPage && (
                                                    <Button
                                                        className="flex items-center justify-center  shadow-sm shadow-black "
                                                        onClick={() => creators.fetchNextPage()}
                                                        disabled={creators.isFetchingNextPage}
                                                    >
                                                        {creators.isFetchingNextPage ? "Loading more..." : "Load More"}
                                                    </Button>
                                                )
                                            }
                                        </div>

                                    </motion.div>
                                </motion.div>
                            </div>
                        </>
                    ) :
                        <>
                            <motion.div
                                className="flex-grow overflow-y-auto scrollbar-hide "
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                {creator.isLoading ? (
                                    <Loading />
                                ) : creator.data?.id ? (
                                    <div className="flex h-screen w-full flex-col">{children}</div>
                                ) : (

                                    !creator.data && (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <h1 className="text-3xl font-bold">
                                                You are not authorized to view this page
                                            </h1>
                                        </div>
                                    )
                                )}


                            </motion.div>

                            <div
                                className={`fixed bottom-4    z-50 -translate-x-1/2 transition-all duration-500 ease-in-out ${isExpanded ? " right-20 md:right-32 " : "right-14 "}`}
                            >
                                <div className="relative">
                                    {/* Expanded Items */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <div className="absolute -left-4 bottom-12 -translate-x-1/2  md:bottom-10 ">
                                                {CreatorNavigation.map((item, index) => {
                                                    const Icon = Icons[item.icon as keyof typeof Icons];

                                                    return (
                                                        <Link
                                                            key={index}
                                                            href={item.disabled ? "/artist/wallet" : item.href}
                                                        >
                                                            <motion.div
                                                                initial={{
                                                                    y: 0,
                                                                    x: 0,
                                                                    scale: 0.5,
                                                                    opacity: 0,
                                                                }}
                                                                animate={{
                                                                    y: -60 * (index + 1),
                                                                    x: -Math.sin((index + 1) * 0.4) * 25, // Create a small natural curve
                                                                    scale: 1,
                                                                    opacity: 1,
                                                                }}
                                                                exit={{
                                                                    y: 0,
                                                                    x: Math.sin((index + 1) * 0.5) * 5, // Maintain curve during exit
                                                                    scale: 0.5,
                                                                    opacity: 0,
                                                                    transition: {
                                                                        duration: 0.2,
                                                                        delay: (LeftNavigation.length - index) * 0.05,
                                                                    },
                                                                }}
                                                                transition={{
                                                                    duration: 0.3,
                                                                    delay: index * 0.05,
                                                                    type: "spring",
                                                                    stiffness: 260,
                                                                    damping: 20,
                                                                }}
                                                                className="absolute left-1/2 -translate-x-1/2 "
                                                            >
                                                                <Button
                                                                    size="icon"
                                                                    className={cn(
                                                                        "hover:scale-109 h-12 w-12 shadow-lg  transition-transform hover:bg-foreground hover:text-primary",
                                                                        item.color,
                                                                        "text-white",
                                                                        path === item.href ? "bg-foreground " : "",
                                                                    )}
                                                                    onClick={() =>
                                                                        console.log(`Clicked ${item.label}`)
                                                                    }
                                                                >
                                                                    <Icon />
                                                                    <span className="sr-only">{item.label}</span>
                                                                </Button>
                                                                <motion.span
                                                                    initial={{ opacity: 0, x: 20 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    exit={{ opacity: 0, x: 20 }}
                                                                    transition={{ delay: index * 0.05 + 0.2 }}
                                                                    className={cn(
                                                                        "absolute left-full top-2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-background px-2 py-1 text-sm font-medium shadow-sm hover:bg-foreground hover:text-primary",
                                                                        path === item.href
                                                                            ? "bg-foreground text-primary"
                                                                            : "",
                                                                    )}
                                                                >
                                                                    {item.label}
                                                                </motion.span>
                                                            </motion.div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </AnimatePresence>

                                    <motion.div
                                        transition={{ duration: 0.2 }}
                                        className={`relative z-10  flex  items-center justify-center    rounded-sm   ${isExpanded ? "" : "animate-bounce"}`}
                                    >
                                        <Button
                                            size="icon"
                                            onClick={toggleExpand}
                                            className="h-10 w-10  rounded-sm border-2  border-[#dbdd2c] font-bold"
                                        >
                                            {isExpanded ? (
                                                <ChevronDown className="h-6 w-6" />
                                            ) : (
                                                <ChevronUp className="h-6 w-6 " />
                                            )}
                                            <span className="sr-only">
                                                {isExpanded ? "Close menu" : "Open menu"}
                                            </span>
                                        </Button>
                                    </motion.div>

                                </div>
                            </div>

                        </>
                }
            </div>
            <div className="fixed bottom-2   right-4 z-50  ">
                <ModeSwitch />
            </div>

        </div>
    )
}
export const LeftNavigation: NavItem[] = [
    { href: "/", icon: "dashboard", title: "HOMEPAGE" },

    { href: "/my-collection", icon: "collection", title: "MY COLLECTION" },
    // Search: { path: "/search", icon: Search, text: "Search" },
    { href: "/music", icon: "music", title: "MUSIC" },
    { href: "/marketplace", icon: "store", title: "MARKETPLACE" },
    { href: "/bounty", icon: "bounty", title: "BOUNTY" },
    { href: "/artist/home", icon: "creator", title: "ARTISTS" },
    { href: "/settings", icon: "setting", title: "SETTINGS" },
];

type DockerItem = {
    disabled?: boolean;
    icon: React.ReactNode;
    label: string;
    color: string;
    href: string;
};

const CreatorNavigation: DockerItem[] = [
    {
        href: "/artist/profile",
        icon: "wallet",
        label: "PROFILE",
        color: "bg-blue-500",
    },
    {
        href: "/artist/post",
        icon: "admin",
        label: "POST",
        color: "bg-purple-500",
    },
    { href: "/artist/store", icon: "pins", label: "STORE", color: "bg-pink-500" },
    {
        href: "/artist/music",
        icon: "report",
        label: "MUSIC",
        color: "bg-amber-500",
    },
    {
        href: "/artist/gift",
        icon: "creator",
        label: "GIFT",
        color: "bg-emerald-500",
    },
    {
        href: "/artist/bounty",
        icon: "users",
        label: "BOUNTY",
        color: "bg-blue-500",
    },
    {
        href: "/artist/settings",
        icon: "bounty",
        label: "SETTINGS",
        color: "bg-purple-500",
    },
];
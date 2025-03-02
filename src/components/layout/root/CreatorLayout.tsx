"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react";
import { useSidebar } from "~/hooks/use-sidebar";
import { cn } from "~/lib/utils";
import { Button } from "~/components/shadcn/ui/button";
import { Mode, useModeStore } from "~/components/store/mode-store";
import { ModeSwitch } from "~/components/common/mode-switch";
import { NavItem } from "~/types/icon-types";
import { DashboardNav } from "../Left-sidebar/dashboard-nav";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "~/utils/api";
import Loading from "~/components/common/loading";
import { CreatorNav } from "../creator-sidebar/creator-nav";
import { ToggleButton } from "~/components/common/toggle-button-admin";
import { useState } from "react";
import { useCreatorSidebar } from "~/hooks/use-creator-sidebar";
import Image from "next/image";
import { addrShort } from "~/utils/utils";
import CustomAvatar from "~/components/common/custom-avatar";
import { Icons } from "../Left-sidebar/icons";
import Link from "next/link";

export default function CreatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    const [cursorVariant, setCursorVariant] = useState("default");
    const creators = api.fan.creator.getAllCreator.useQuery(
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
        <div className="relative flex h-screen  gap-4 overflow-hidden">
            <motion.div
                className="flex-grow overflow-y-auto scrollbar-hide "
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {selectedMode === Mode.Creator && creator.isLoading ? (
                    <Loading />
                ) : selectedMode === Mode.Creator && creator.data?.id ? (
                    <div className="flex h-screen w-full flex-col">{children}</div>
                ) : (
                    selectedMode === Mode.Creator &&
                    !creator.data && (
                        <div className="flex h-full w-full items-center justify-center">
                            <h1 className="text-3xl font-bold">
                                You are not authorized to view this page
                            </h1>
                        </div>
                    )
                )}
                {selectedMode === Mode.User && (
                    <div className="flex h-screen w-full flex-col">{children}</div>
                )}
            </motion.div>
            {selectedMode === Mode.Creator && (
                <>
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
                                                    href={item.disabled ? "/admin/wallet" : item.href}
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
            )}
            {selectedMode === Mode.User && (
                <>
                    <AnimatePresence>
                        <motion.div
                            className={cn(
                                "fixed  right-[13.3rem] top-1/2 z-40 hidden rotate-180 rounded-sm  md:block",
                                isMinimized && "right-[5.5rem] -rotate-180",
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
                    {/* toggle button */}

                    <div className="hidden rounded-sm h-[calc(100vh-20vh)] border-[1px] bg-background md:block">
                        <motion.div
                            className={cn(
                                "sticky  top-[5.8rem] hidden h-[calc(100vh-10.8vh)] w-full overflow-hidden border-r p-1 md:block",
                                !isMinimized ? "w-[210px]" : "w-[78px]",
                            )}
                            transition={{ type: "spring", stiffness: 100, damping: 20 }}
                            style={{ perspective: "1000px" }}
                        >
                            <motion.div
                                className="no-scrollbar flex h-full w-full flex-col items-center justify-start py-2"
                                animate={{ rotateY: isMinimized ? 30 : 0 }}
                                transition={{ type: "spring", stiffness: 100, damping: 10 }}
                            >
                                <div className="flex h-screen w-full flex-col gap-3 overflow-x-hidden p-1">
                                    {creators.isLoading ? (
                                        <Loading />
                                    ) : (
                                        creators.data?.items.map((creator) => (
                                            <Button
                                                size="creator"
                                                className="flex w-full items-center justify-start gap-2   overflow-hidden  rounded-md   text-sm font-medium shadow-sm shadow-foreground hover:text-[#dbdd2c]"
                                                key={creator.id}
                                            >
                                                <CustomAvatar url={creator.profileUrl} />
                                                <div className=" flex flex-col items-start justify-center">
                                                    <h1 className="truncate">{creator.name}</h1>
                                                    <p>{addrShort(creator.id, 4)}</p>
                                                </div>
                                            </Button>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </>
            )}
            <div className="fixed bottom-2   right-4 z-50  ">
                <ModeSwitch />
            </div>

        </div>
    );
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

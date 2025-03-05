"use client";

import type React from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "~/lib/utils";
import type { NavItem } from "~/types/icon-types";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "~/components/shadcn/ui/button";
import { ToggleButton } from "~/components/common/toggle-button-admin";
import { api } from "~/utils/api";
import { usePathname } from "next/navigation";
import { useCreatorSidebar } from "~/hooks/use-creator-sidebar";
import { Mode, useModeStore } from "~/components/store/mode-store";
import CustomAvatar from "~/components/common/custom-avatar";
import { addrShort } from "~/utils/utils";
import { ModeSwitch } from "~/components/common/mode-switch";
import Link from "next/link";
import { Icons } from "../Left-sidebar/icons";
import { CreatorListSkeleton } from "~/components/loading/creator-skeleton";
import { SkeletonEffect } from "~/components/loading/skeleton-effect";

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
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

  // Animation variants for sidebar
  const sidebarVariants = {
    expanded: {
      width: "210px",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
    collapsed: {
      width: "0px",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
  };

  // Animation variants for sidebar content
  const contentVariants = {
    expanded: {
      opacity: 1,
      rotateY: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.07,
        delayChildren: 0.1,
      },
    },
    collapsed: {
      opacity: 0.7,
      rotateY: 30,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
  };

  // Animation variants for sidebar items
  const itemVariants = {
    expanded: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
    collapsed: {
      opacity: 0,
      x: -20,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
  };

  return (
    <div className="relative overflow-hidden">
      <div className="flex h-[calc(100vh-10.8vh)] gap-4 overflow-hidden">
        {selectedMode === Mode.User ? (
          <>
            <motion.div
              className="flex-grow overflow-y-auto scrollbar-hide"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex h-[calc(100vh-10.8vh)] w-full flex-col">
                {children}
              </div>
            </motion.div>
            <AnimatePresence>
              <motion.div
                className={cn(
                  "fixed right-[13.3rem] top-1/2 z-40 hidden rotate-180 rounded-sm md:block",
                  isMinimized && "right-[.5rem] -rotate-180",
                )}
                initial={false}
                animate={isMinimized ? "collapsed" : "expanded"}
                transition={{
                  duration: 0.5,
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
              >
                <ToggleButton
                  isActive={!isMinimized}
                  onToggle={toggle}
                  onMouseEnter={() => setCursorVariant("hover")}
                  onMouseLeave={() => setCursorVariant("default")}
                />
              </motion.div>
            </AnimatePresence>
            <div className="hidden h-[calc(100vh-23vh)] rounded-sm border-[1px] bg-background md:block">
              <motion.div
                className="sticky top-0 hidden h-full overflow-y-auto p-1 md:block"
                initial={false}
                animate={isMinimized ? "collapsed" : "expanded"}
                variants={sidebarVariants}
                style={{ perspective: "1000px" }}
              >
                <motion.div
                  className="no-scrollbar flex h-full w-full flex-col items-center justify-start py-2"
                  initial={false}
                  animate={isMinimized ? "collapsed" : "expanded"}
                  variants={contentVariants}
                >
                  <div className="flex h-full w-full flex-col gap-2 overflow-x-hidden p-1 scrollbar-hide">
                    {creators.isLoading ? (
                      <CreatorListSkeleton />
                    ) : (
                      creators.data?.pages.map((creators) =>
                        creators.items.map((creator) => (
                          <motion.div
                            key={creator.id}
                            variants={itemVariants}
                            initial={false}
                            animate={isMinimized ? "collapsed" : "expanded"}
                            className="overflow-hidden"
                          >
                            <Button
                              size="creator"
                              className="flex w-full items-center justify-start gap-2 rounded-md text-sm font-medium shadow-sm shadow-foreground hover:text-[#dbdd2c]"
                            >
                              <CustomAvatar url={creator.profileUrl} />
                              <motion.div
                                className="flex flex-col items-start justify-center"
                                variants={itemVariants}
                              >
                                <h1 className="truncate">{creator.name}</h1>
                                <p>{addrShort(creator.id, 4)}</p>
                              </motion.div>
                            </Button>
                          </motion.div>
                        )),
                      )
                    )}
                    {creators.hasNextPage && (
                      <motion.div
                        variants={itemVariants}
                        initial={false}
                        animate={isMinimized ? "collapsed" : "expanded"}
                      >
                        <Button
                          className="flex items-center justify-center shadow-sm shadow-black"
                          onClick={() => creators.fetchNextPage()}
                          disabled={creators.isFetchingNextPage}
                        >
                          {creators.isFetchingNextPage ? (
                            <div className="flex items-center gap-2">
                              <span>Loading more...</span>
                              <SkeletonEffect className="h-4 w-4 rounded-full" />
                            </div>
                          ) : (
                            "Load More"
                          )}
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </>
        ) : (
          <>
            <motion.div
              className="flex-grow overflow-y-auto scrollbar-hide"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {creator.isLoading ? (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="w-full max-w-4xl space-y-4 px-4">
                    <SkeletonEffect variant="card" count={3} />
                  </div>
                </div>
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
              className={`fixed bottom-4 z-50 -translate-x-1/2 transition-all duration-500 ease-in-out ${isExpanded ? " right-20 md:right-32 " : "right-14 "}`}
            >
              <div className="relative">
                {/* Expanded Items */}
                <AnimatePresence>
                  {isExpanded && (
                    <div className="absolute -left-4 bottom-12 -translate-x-1/2 md:bottom-10">
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
                              className="absolute left-1/2 -translate-x-1/2"
                            >
                              <Button
                                size="icon"
                                className={cn(
                                  "hover:scale-109 h-12 w-12 shadow-lg transition-transform hover:bg-foreground hover:text-primary",
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
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`relative z-10 flex items-center justify-center rounded-sm ${isExpanded ? "" : "animate-bounce"}`}
                >
                  <Button
                    size="icon"
                    onClick={toggleExpand}
                    className="h-10 w-10 rounded-sm border-2 border-[#dbdd2c] font-bold"
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={isExpanded ? "down" : "up"}
                        initial={{ opacity: 0, y: isExpanded ? -10 : 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: isExpanded ? 10 : -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-6 w-6" />
                        ) : (
                          <ChevronUp className="h-6 w-6" />
                        )}
                      </motion.div>
                    </AnimatePresence>
                    <span className="sr-only">
                      {isExpanded ? "Close menu" : "Open menu"}
                    </span>
                  </Button>
                </motion.div>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="fixed bottom-2 right-4 z-50">
        <ModeSwitch />
      </div>
    </div>
  );
}

export const LeftNavigation: NavItem[] = [
  { href: "/", icon: "dashboard", title: "HOMEPAGE" },
  { href: "/my-collection", icon: "collection", title: "MY COLLECTION" },
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
  {
    href: "/artist/map",
    icon: "map",
    label: "MAP",
    color: "bg-pink-500",
  },
];

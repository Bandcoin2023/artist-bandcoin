"use client";
import React, { useState } from "react";

import { ChevronLeft } from "lucide-react";

import { useSidebar } from "~/hooks/use-sidebar";

import { DashboardNav } from "./dashboard-nav";
import { ConnectWalletButton } from "package/connect_wallet";
import { Facebook, Instagram } from "lucide-react";

import Link from "next/link";
import { HomeIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "~/utils/utils";
import { env } from "~/env";

import { NavItem } from "~/types/icon-types";
import { Button } from "~/components/shadcn/ui/button";

export const LeftNavigation: NavItem[] = [
  { href: "/", icon: "dashboard", title: "HOMEPAGE" },
  {
    href: "/wallet-balance",
    icon: "wallet",
    title: "MY WALLET",
  },
  { href: "/assets", icon: "collection", title: "MY COLLECTION" },
  // Search: { path: "/search", icon: Search, text: "Search" },
  { href: "/music", icon: "music", title: "MUSIC" },
  { href: "/marketplace", icon: "store", title: "MARKETPLACE" },
  { href: "/bounty", icon: "bounty", title: "BOUNTY" },
  { href: "/fans/home", icon: "creator", title: "ARTISTS" },
  { href: "/settings", icon: "setting", title: "SETTINGS" },
];

export const BottomNavigation = {
  Home: { path: "/maps/pins", icon: HomeIcon, text: "CLAIM" },
} as const;

type SidebarProps = {
  className?: string;
};

export default function Sidebar({ className }: SidebarProps) {
  const { isMinimized, toggle } = useSidebar();


  return (
    <div
      className={cn(
        `relative h-[calc(100vh-10vh)] w-full overflow-y-auto overflow-x-hidden border-r     hidden  transition-[width] duration-500 md:block`,
        !isMinimized ? "w-[280px]" : "w-[78px]",
        className,
      )}
    >



      <div className=" flex  h-full   w-full  flex-col items-center justify-between    p-2   no-scrollbar  ">
        <div className="flex  w-full overflow-x-hidden   flex-col  py-2">
          <DashboardNav items={LeftNavigation} />
        </div>
        <div
          className={`${isMinimized ? "hidden" : "flex"} w-full flex-col items-center`}
        >
          <LeftBottom />
        </div>
      </div>
    </div>

  );
}

export function LeftBottom() {
  return (
    <div className="flex w-full flex-col justify-center gap-4">

      <ConnectWalletButton />

      <div className="flex  items-center justify-between  gap-4 ">
        <Link
          href={"https://facebook.com/bandcoinio"}
          className="btn flex h-16 shadow-md flex-col bg-primary justify-center  rounded-lg items-center  text-xs normal-case w-full"
          target="_blank"
        >
          <Facebook size={26} />
          <span>Facebook</span>
        </Link>
        <Link
          href={"https://x.com/bandcoinio"}
          className="btn flex h-16 shadow-md flex-col bg-primary justify-center  rounded-lg items-center  text-xs normal-case w-full"
          target="_blank"
        >
          <Image src="/images/icons/x.svg" alt="X" height={18} width={18}
            className="w-5 h-5"
          />
          <span>X</span>
        </Link>
        <Link
          href={"https://www.instagram.com/bandcoin"}
          className="btn flex h-16 shadow-md flex-col bg-primary justify-center  rounded-lg items-center  text-xs normal-case w-full"
          target="_blank"
        >
          <Instagram size={26} />
          <span>Instagram</span>
        </Link>
      </div>
      <div className="flex w-full flex-col text-center text-xs text-base-content">
        <p>© 2024 {env.NEXT_PUBLIC_HOME_DOMAIN}</p>
        <div className="flex w-full justify-center gap-2 ">
          <Link className="link-hover link" href="/about">
            About
          </Link>
          <Link className="link-hover link" href="/privacy">
            Privacy
          </Link>
          <Link className="link-hover link" href="/support">
            Support
          </Link>
        </div>
        <p>v{1.1}</p>
      </div>
    </div>
  );
}

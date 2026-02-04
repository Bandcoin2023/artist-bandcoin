"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion"

import { ChevronLeft, LogOut, Sun, Moon, Cloud, Star, ChevronRight, Sparkles, Zap, ArrowRight } from "lucide-react";

import { useSidebar } from "~/hooks/use-sidebar";

import { DashboardNav } from "./dashboard-nav";
import { ConnectWalletButton } from "package/connect_wallet";
import { Facebook, Instagram } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { HomeIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "~/utils/utils";
import { env } from "~/env";
import { NavItem } from "~/types/icon-types";
import { Button } from "~/components/shadcn/ui/button";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";

export const LeftNavigation: NavItem[] = [
  { href: "/", icon: "dashboard", title: "HOMEPAGE" },
  { href: "/my-collection", icon: "collection", title: "MY COLLECTION" },
  { href: "/music", icon: "music", title: "MUSIC" },
  { href: "/marketplace", icon: "store", title: "MARKETPLACE" },
  { href: "/bounty", icon: "bounty", title: "BOUNTY" },
  { href: "/artist/home", icon: "creator", title: "ARTIST" },
  // { href: "/settings", icon: "setting", title: "SETTINGS" },
  // { href: "/spotify", icon: "spotify", title: "SPOTIFY" },
  { href: "/lastfm", icon: "lastfm", title: "LASTFM" },

  { href: "https://showcase.bandcoin.io/vibeportal", icon: "link", title: "VIBE STUDIO" },
];

export const BottomNavigation = {
  Home: { path: "/maps/pins", icon: HomeIcon, text: "CLAIM" },
} as const;

type SidebarProps = {
  className?: string;
};

// Mini Calendar component that only shows current and next week
const MiniCalendar = () => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);

  // Get the current week's start (Sunday) and calculate days
  const getWeekDays = (date: Date) => {
    const day = date.getDay(); // 0 is Sunday, 6 is Saturday
    const diff = date.getDate() - day;
    const weekStart = new Date(date);
    weekStart.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const newDate = new Date(weekStart);
      newDate.setDate(weekStart.getDate() + i);
      days.push(newDate);
    }
    return days;
  };

  const currentWeek = getWeekDays(currentDate);
  const nextWeek = currentWeek.map(day => {
    const newDate = new Date(day);
    newDate.setDate(day.getDate() + 7);
    return newDate;
  });

  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  // Navigate weeks
  const goToPreviousWeek = () => {
    const prevDate = new Date(currentDate);
    prevDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(prevDate);
  };

  const goToNextWeek = () => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(nextDate);
  };

  return (
    <div className="w-full rounded-lg p-3 border bg-white/10 dark:bg-black/20 backdrop-blur-lg shadow-lg border-white/20 dark:border-white/10">
      <div className="flex items-center justify-between mb-3">
        <button onClick={goToPreviousWeek} className="p-1 hover:bg-white/20 dark:hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-semibold text-foreground">
          {currentWeek[0] && `${monthNames[currentWeek[0].getMonth()]} ${currentWeek[0].getFullYear()}`}
        </span>
        <button onClick={goToNextWeek} className="p-1 hover:bg-white/20 dark:hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((day, i) => (
          <div key={`header-${i}`} className="text-center text-xs text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Current week */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {currentWeek.map((date, i) => (
          <button
            key={`current-${i}`}
            onClick={() => setSelectedDate(date)}
            className={cn(
              "h-6 w-6 rounded-full text-xs flex items-center justify-center",
              isToday(date) ? "bg-primary  font-bold" : "",
              isSelected(date) && !isToday(date) ? "bg-accent text-accent-foreground" : "",
              !isToday(date) && !isSelected(date) ? "hover:bg-muted" : ""
            )}
          >
            {date.getDate()}
          </button>
        ))}
      </div>

      {/* Next week */}
      <div className="grid grid-cols-7 gap-1">
        {nextWeek.map((date, i) => (
          <button
            key={`next-${i}`}
            onClick={() => setSelectedDate(date)}
            className={cn(
              "h-6 w-6 rounded-full text-xs flex items-center justify-center",
              isToday(date) ? "bg-primary  font-bold" : "",
              isSelected(date) && !isToday(date) ? "bg-accent text-accent-foreground" : "",
              !isToday(date) && !isSelected(date) ? "hover:bg-muted" : ""
            )}
          >
            {date.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
};

export default function Sidebar({ className }: SidebarProps) {
  const { isMinimized, toggle } = useSidebar();
  const session = useSession();
  const router = useRouter();
  return (
    <div
      className={cn(
        `h-[calc(100vh-13vh)] sticky p-2 w-full overflow-hidden border-r hidden transition-[width] duration-500 md:block bg-white/5 dark:bg-black/20 backdrop-blur-xl border-white/10 dark:border-white/5 `,
        !isMinimized ? "w-[280px]" : "w-[78px]",
        className,
      )}
    >
      <div className=" flex  h-full   w-full  flex-col items-center justify-between   py-1   no-scrollbar  ">
        <div className="flex w-full flex-col items-center justify-between gap-4">
          <div className="flex  w-full overflow-x-hidden   flex-col  ">
            <DashboardNav items={LeftNavigation} />

            {/* Mini Calendar - Only show when sidebar is expanded */}

          </div>
          <div className={`relative w-full flex items-center justify-center ${isMinimized ? "hidden" : "flex"}`}>
            <Button
              className="
              relative text-lg font-bold
              bg-gradient-to-r from-accent to-accent/70 dark:from-primary dark:to-primary/70
              border-2 border-accent/50 dark:border-primary/50
              text-accent-foreground dark:text-primary-foreground
              hover:text-white dark:hover:text-black
              transition-all duration-300
              overflow-hidden
              group
              neon-studio-button
              backdrop-blur-lg
              hover:px-6
               hover:shadow-accent/60 dark:hover:shadow-primary/60
              hover:border-accent/80 dark:hover:border-primary/80
              rounded-lg
            "
              onClick={() =>
                router.push("/ai")
              }

            >
              {/* Always-Active Background Animations */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent animate-neon-sweep"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-accent via-primary to-success animate-shimmer-fast"></div>
              <div className="absolute inset-0 bg-gradient-to-l from-secondary via-success to-primary animate-reverse-sweep"></div>

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
        </div>
        <div
          className={`${isMinimized ? "hidden" : "flex"} w-full flex-col items-center`}
        >
          <LeftBottom />
        </div>
        {session.status == "authenticated" && isMinimized &&
          <div className="">
            <LogOutButon />
          </div>
        }
      </div>
    </div>
  );
}

function LogOutButon() {
  async function disconnectWallet() {
    await signOut({
      redirect: false,
    });
  }
  return (
    <Button className="flex flex-col p-3  bg-gradient-to-br from-accent/60 to-accent/40 dark:from-primary/60 dark:to-primary/40 backdrop-blur-lg hover:from-accent/80 hover:to-accent/60 dark:hover:from-primary/80 dark:hover:to-primary/60 justify-center rounded-lg items-center text-xs normal-case w-full border border-white/20 shadow-sm shadow-foreground  transition-all " onClick={disconnectWallet}>
      <span> <LogOut className="w-5 h-5" /></span>
      <span className="text-xs">Logout</span>
    </Button>
  );
}
export function LeftBottom() {
  const { setTheme, theme } = useTheme()

  const tougleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }
  const [date, setDate] = useState<Date | undefined>(new Date())

  return (
    <div className="flex w-full flex-col justify-center gap-2 p-1 rounded-lg bg-gradient-to-t from-white/5 dark:from-black/20 to-transparent backdrop-blur-sm">
      {/* <MiniCalendar /> */}

      {/* Theme Toggle */}
      <div className="flex items-center justify-center">
        <button
          onClick={() => tougleTheme()}
          className="relative h-10 w-20  rounded-full transition-shadow duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-purple-400"
          style={{
            boxShadow: theme === "dark"
              ? "inset 0 0 15px rgba(255, 255, 255, 0.2), 0 0 20px rgba(138, 43, 226, 0.4)"
              : "inset 0 0 15px rgba(0, 0, 0, 0.1), 0 0 20px rgba(59, 130, 246, 0.4)",
          }}
        >
          <motion.div
            className="absolute top-1 left-1 right-1 bottom-1 rounded-full bg-gradient-to-br"
            animate={{
              background: theme === "dark"
                ? "linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)"
                : "linear-gradient(135deg, #60a5fa 0%, #e0f2fe 100%)",
            }}
            transition={{ duration: 0.5 }}
          />
          <motion.div
            className="absolute   h-8 w-8 top-1 rounded-full "
            animate={{
              x: theme === 'dark' ? 45 : 4,
              background: theme === 'dark' ? "#f1c40f" : "#ffffff",
            }}
            transition={{
              type: "spring",
              stiffness: 700,
              damping: 30,
            }}
          />
          <div className="relative flex h-full items-center justify-between px-3">

            <Sun className="h-4 w-4 text-yellow-400" />

            <Moon className="h-4 w-4 text-white" />

          </div>
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              boxShadow: theme === 'dark'
                ? "inset 4px 4px 8px rgba(0, 0, 0, 0.3), inset -4px -4px 8px rgba(255, 255, 255, 0.1)"
                : "inset 4px 4px 8px rgba(0, 0, 0, 0.1), inset -4px -4px 8px rgba(255, 255, 255, 0.5)",
            }}
            transition={{ duration: 0.5 }}
          />
        </button>
      </div>
      <div className="w-full flex items-center justify-center backdrop-blur-sm rounded-lg p-2 bg-white/5 dark:bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
        <ConnectWalletButton />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Link
          href={"https://facebook.com/bandcoinio"}
          className="btn flex h-12 flex-col bg-gradient-to-br from-accent/60 to-accent/40 dark:from-primary/60 dark:to-primary/40 backdrop-blur-lg hover:from-accent/80 hover:to-accent/60 dark:hover:from-primary/80 dark:hover:to-primary/60 justify-center rounded-lg items-center text-xs normal-case w-full border border-white/20 shadow-sm shadow-foreground transition-all "
          target="_blank"
        >
          <Facebook size={24} />
        </Link>
        <Link
          href={"https://x.com/bandcoinio"}
          className="btn flex h-12 flex-col bg-gradient-to-br from-accent/60 to-accent/40 dark:from-primary/60 dark:to-primary/40 backdrop-blur-lg hover:from-accent/80 hover:to-accent/60 dark:hover:from-primary/80 dark:hover:to-primary/60 justify-center rounded-lg items-center text-xs normal-case w-full border border-white/20 shadow-sm shadow-foreground transition-all "
          target="_blank"
        >
          <Image src="/images/icons/x.svg" alt="X" height={18} width={18}
            className="w-5 h-5"
          />
        </Link>
        <Link
          href={"https://www.instagram.com/bandcoin"}
          className="btn flex h-12 flex-col bg-gradient-to-br from-accent/60 to-accent/40 dark:from-primary/60 dark:to-primary/40 backdrop-blur-lg hover:from-accent/80 hover:to-accent/60 dark:hover:from-primary/80 dark:hover:to-primary/60 justify-center rounded-lg items-center text-xs normal-case w-full border border-white/20 shadow-sm shadow-foreground transition-all "
          target="_blank"
        >
          <Instagram size={24} />
        </Link>
      </div>
      <div className="flex w-full flex-col text-center text-xs text-foreground/70 backdrop-blur-sm rounded-lg p-3 bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10">
        <p className="font-semibold text-foreground mb-2">© 2024 {env.NEXT_PUBLIC_HOME_DOMAIN}</p>
        <div className="flex w-full justify-center gap-2 mb-2">
          <Link className="link-hover link hover:text-accent transition-colors text-xs" href="/about">
            About
          </Link>
          <span className="text-white/20">•</span>
          <Link className="link-hover link hover:text-accent transition-colors text-xs" href="/privacy">
            Privacy
          </Link>
          <span className="text-white/20">•</span>
          <Link className="link-hover link hover:text-accent transition-colors text-xs" href="/support">
            Support
          </Link>
        </div>
        <p className="text-[10px] text-foreground/50">v1.1.0</p>
      </div>
    </div>
  );
}
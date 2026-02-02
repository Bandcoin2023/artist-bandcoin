/* eslint-disable @typescript-eslint/non-nullable-type-assertion-style */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "~/lib/utils";

import { Dispatch, SetStateAction } from "react";

import { useSidebar } from "~/hooks/use-sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/shadcn/ui/tooltip";
import { Icons } from "./icons";
import { NavItem } from "~/types/icon-types";
import { Button } from "~/components/shadcn/ui/button";

interface DashboardNavProps {
  items: NavItem[];
  setOpen?: Dispatch<SetStateAction<boolean>>;
  isMobileNav?: boolean;
}

export function DashboardNav({ items, setOpen }: DashboardNavProps) {
  const path = usePathname();
  const { isMinimized, setIsSheetOpen, isSheetOpen } = useSidebar();
  if (!items.length) {
    return null
  }
  return (
    <nav className="grid w-full gap-2 px-2 ">
      <TooltipProvider>
        {items.map((item, index) => {
          const Icon = Icons[item.icon as keyof typeof Icons];
          return (
            item.href && (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <Link href={item.disabled ? "/" : item.href}
                    key={item.href}
                  >
                    <Button
                      className={
                        cn(
                          "w-full justify-start rounded-lg transition-all  duration-300 ease-in-out relative overflow-hidden group ",
                          path === item.href
                            ? "bg-gradient-to-r from-accent to-accent/80 text-sidebar-foreground  hover:shadow-sm hover:shadow-accent/60 scale-105 shadow-sm shadow-foreground"
                            : "text-muted-foreground hover:text-sidebar-foreground bg-transparent border border-accent/30 hover:border-accent/60 hover:bg-accent/20 dark:hover:bg-accent/10 ",
                          item.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent hover:shadow-none hover:border-transparent scale-100"
                        )
                      }
                      onClick={() => {
                        if (setOpen) setOpen(false);
                        if (isSheetOpen) setIsSheetOpen(false);
                      }}
                    >
                      {
                        isMinimized ? (
                          <Icon />
                        ) :
                          <div className="flex items-center justify-center gap-4">
                            <Icon />

                            <span className="mr-2 truncate ">{item.title}</span>

                          </div>
                      }

                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent
                  align="center"
                  side="right"
                  sideOffset={8}
                  className={isMinimized ? "inline-block" : "hidden"}
                >
                  {item.title}
                </TooltipContent>
              </Tooltip>
            )
          );
        })}
      </TooltipProvider>
    </nav>
  );
}
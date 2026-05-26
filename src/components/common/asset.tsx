"use client";

import type React from "react";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Badge } from "~/components/shadcn/ui/badge";
import { Card, CardContent } from "~/components/shadcn/ui/card";
import { Button } from "~/components/shadcn/ui/button";
import { Gem, Star, Eye, ShoppingCart, Link } from "lucide-react";
import { addrShort } from "~/utils/utils";
import { PLATFORM_ASSET } from "~/lib/stellar/constant";
import { motion } from "framer-motion";
import { cn } from "~/lib/utils";

interface AssetViewProps {
  creatorId?: string | null;
  code?: string;
  thumbnail: string | null;
  isNFT?: boolean;
  isPinned?: boolean;
  price?: number;
  mediaType?: string;
  isPageAsset?: boolean;
  percentage?: number | null;
  priceInUSD?: number | null;
  modernVariant?: "default" | "collection";
  onBuy?: () => void;
  onView?: () => void;
}

export default function AssetView({
  code,
  thumbnail,
  isNFT = true,
  isPinned = false,
  creatorId,
  price,
  mediaType,
  isPageAsset,
  percentage,
  priceInUSD,
  modernVariant = "default",
  onBuy,
  onView,
}: AssetViewProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const handleViewClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onView?.();
  };
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const isCollectionCard = modernVariant === "collection";
  const creatorLabel = creatorId ? addrShort(creatorId, 4) : "Admin";
  const typeLabel = isPageAsset
    ? "Page Asset"
    : mediaType === "THREE_D"
      ? "3D Model"
      : mediaType;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="h-full"
        onClick={onBuy}
      >
        <Card
          className={cn(
            "group relative h-full cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1",
            isCollectionCard
              ? "rounded-[0.95rem] border border-[#ddd9d0] bg-white shadow-[0_6px_18px_rgba(15,23,42,0.05)] hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-none"
              : "rounded-[1.35rem] border border-black/10 bg-transparent shadow-none",
          )}
        >
          <CardContent
            className={cn(
              "relative flex h-full flex-col overflow-hidden p-0",
              isCollectionCard ? "p-0" : "p-3",
            )}
          >
            <div
              className={cn(
                "relative overflow-hidden",
                isCollectionCard
                  ? "aspect-[0.96] rounded-t-[0.95rem] bg-[#d8c7bb] dark:bg-zinc-800"
                  : "rounded-[1.05rem] border border-white/45 bg-white/35",
              )}
            >
              <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3">
                {!isPageAsset && !isCollectionCard && (
                  <button
                    type="button"
                    onClick={handleViewClick}
                    className="grid h-9 w-9 place-items-center rounded-full border border-white/55 bg-white/55 text-black/75 backdrop-blur-md transition-opacity duration-200 hover:bg-white/75"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                {!isPageAsset && isCollectionCard && (
                  <Button
                    onClick={handleViewClick}
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 border-0 bg-white/90 p-0 opacity-0 shadow-lg backdrop-blur-sm transition-opacity duration-300 hover:bg-white group-hover:opacity-100"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}

                <div className="flex items-center gap-2">
                  {percentage ? (
                    <Badge className="border-0 bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-1 text-white shadow-lg backdrop-blur-md">
                      <Star className="mr-1.5 h-3 w-3 fill-white" />
                      <span className="font-semibold">{percentage}%</span>
                    </Badge>
                  ) : (
                    isNFT && (
                      <Badge
                        className={cn(
                          "border-0 px-3 py-1 shadow-lg backdrop-blur-md",
                          isCollectionCard
                            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                            : "border border-white/20 bg-black/40 text-white",
                        )}
                      >
                        <Gem className="mr-1.5 h-3 w-3 fill-white" />
                        <span className="font-semibold">NFT</span>
                      </Badge>
                    )
                  )}
                  {!isPageAsset && mediaType && (
                    <Badge
                      className={cn(
                        "px-3 py-1",
                        isCollectionCard
                          ? "border-0 bg-black/50 text-white"
                          : "border border-white/20 bg-white/40 text-black",
                      )}
                    >
                      <Gem className="mr-1.5 h-3 w-3" />
                      <span className="font-semibold">
                        {mediaType === "THREE_D" ? "3D" : mediaType}
                      </span>
                    </Badge>
                  )}
                </div>
              </div>

              <Image
                src={thumbnail ?? "/images/logo.png"}
                alt="Asset thumbnail"
                height={280}
                width={320}
                className={cn(
                  "w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]",
                  isCollectionCard ? "h-full min-h-[200px]" : "h-56",
                )}
              />
              {!isCollectionCard && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/45 to-transparent" />
              )}
            </div>

            <div
              className={cn(
                "flex flex-1 flex-col",
                isCollectionCard ? "gap-2 px-4 pb-3.5 pt-3" : "mt-3 gap-3",
              )}
            >
              <div className="flex flex-col gap-1.5">
                {isCollectionCard && (
                  <div className="inline-flex w-fit rounded-[2px] bg-[#f3f1ee] px-2 py-0.5 text-[0.64rem] font-medium text-black/60 dark:bg-zinc-800 dark:text-zinc-300">
                    {typeLabel ?? "Collectible"}
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <h2
                    className={cn(
                      "font-semibold leading-tight text-black/90 dark:text-zinc-100",
                      isCollectionCard
                        ? "line-clamp-1 text-[0.98rem]"
                        : "line-clamp-2 text-[1.05rem]",
                    )}
                  >
                    {code}
                  </h2>
                  <p className="shrink-0 truncate font-mono text-sm text-foreground/70 dark:text-zinc-400">
                    {creatorLabel}
                  </p>
                </div>
              </div>

              {isCollectionCard ? (
                <div className="flex items-center justify-between gap-2">
                  {price ? (
                    <div className="flex items-center gap-2 text-sm font-medium text-black/88 dark:text-zinc-100">
                      <span>{price}</span>
                      <span className="text-black/55 dark:text-zinc-400">
                        {PLATFORM_ASSET.code.toUpperCase()}
                      </span>
                    </div>
                  ) : null}
                  {priceInUSD ? (
                    <Badge className="text-xs !py-0.5 !px-1 !rounded">
                      {`${priceInUSD} USD`}
                    </Badge>
                  ) : null}
                </div>
              ) : (
                <div className="text-black/88 flex items-center gap-1 text-sm font-medium dark:text-zinc-100">
                  <Gem className="h-4 w-4" />
                  {priceInUSD && price ? (
                    <>
                      <span className="text-[#1f86ee] dark:text-sky-400">
                        ${priceInUSD}
                      </span>
                      <span className="text-black/60 dark:text-zinc-400">
                        ·
                      </span>
                      <span className="text-black/60 dark:text-zinc-400">
                        {price} {PLATFORM_ASSET.code.toUpperCase()}
                      </span>
                    </>
                  ) : priceInUSD ? (
                    <span className="text-[#1f86ee] dark:text-sky-400">
                      ${priceInUSD}
                    </span>
                  ) : price ? (
                    <span className="text-[#1f86ee] dark:text-sky-400">
                      {price} {PLATFORM_ASSET.code.toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-black/60 dark:text-zinc-400">
                      {isPageAsset
                        ? "Page Asset"
                        : mediaType === "THREE_D"
                          ? "3D Model"
                          : mediaType}
                    </span>
                  )}
                </div>
              )}

              {!isCollectionCard && mediaType && (
                <div className="inline-flex w-fit rounded-[2px] bg-[#f3f1ee] px-2 py-0.5 text-sm font-medium text-black/60 dark:bg-zinc-800 dark:text-zinc-300">
                  {mediaType === "THREE_D" ? "3D" : mediaType}
                </div>
              )}
            </div>

            {isCollectionCard && price ? (
              <div className="relative z-20 mt-3 md:pointer-events-none md:inset-x-0 md:bottom-0 md:mt-0 md:transition-all md:duration-300 md:group-hover:pointer-events-auto md:group-hover:translate-y-0 md:group-hover:opacity-100">
                <Button
                  onClick={onBuy}
                  size="sm"
                  variant="secondary"
                  className="h-12 w-full rounded-none border-0 px-4 text-base font-semibold shadow-none bg-secondary text-secondary-foreground"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  <span>Buy Now</span>
                  <span className="ml-auto text-sm">{`${price} ${PLATFORM_ASSET.code.toUpperCase()}`}</span>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}

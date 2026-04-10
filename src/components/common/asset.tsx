"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Badge } from "~/components/shadcn/ui/badge"
import { Card, CardContent } from "~/components/shadcn/ui/card"
import { Button } from "~/components/shadcn/ui/button"
import { Gem, Star, Eye, ShoppingCart, Link } from "lucide-react"
import { addrShort } from "~/utils/utils"
import { PLATFORM_ASSET } from "~/lib/stellar/constant"
import { motion } from "framer-motion"

interface AssetViewProps {
    creatorId?: string | null
    code?: string
    thumbnail: string | null
    isNFT?: boolean
    isPinned?: boolean
    price?: number
    mediaType?: string
    isPageAsset?: boolean
    percentage?: number | null
    priceInUSD?: number | null
    onBuy?: () => void // Added onBuy prop for purchase functionality
    onView?: () => void // Added onView prop for view functionality
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
    onBuy, // Added onBuy prop
    onView, // Added onView prop
}: AssetViewProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const handleViewClick = (event: React.MouseEvent) => {
        event.stopPropagation()
        onView?.()
    }
    useEffect(() => {
        setIsVisible(true)
    }, [])

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full"
                onClick={onBuy}
            >
                <Card className="group relative h-full cursor-pointer overflow-hidden rounded-[0.95rem] border border-[#ddd9d0] bg-white shadow-[0_6px_18px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-none">
                    <CardContent className="relative flex flex-col p-0">
                        <div className="relative h-52 w-full overflow-hidden rounded-t-[0.95rem] bg-[#d8c7bb] dark:bg-zinc-800">
                            <Image
                                src={thumbnail ?? "/images/logo.png"}
                                alt="Asset thumbnail"
                                height={240}
                                width={240}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
                            {!isPageAsset && (
                                <Button
                                    onClick={handleViewClick}
                                    size="sm"
                                    variant="secondary"
                                    className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm hover:bg-white border-0 shadow-lg"
                                >
                                    <Eye className="w-4 h-4" />
                                </Button>
                            )}

                            {percentage ? (
                                <div className="absolute top-3 right-3">
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.05, 1],
                                        }}
                                        transition={{
                                            duration: 3,
                                            repeat: Number.POSITIVE_INFINITY,
                                        }}
                                    >
                                        <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 shadow-lg backdrop-blur-md px-3 py-1">
                                            <Star className="w-3 h-3 mr-1.5 fill-white" />
                                            <span className="font-semibold">{percentage}%</span>
                                        </Badge>
                                    </motion.div>
                                </div>
                            ) : (
                                isNFT && (
                                    <>
                                        <div className="absolute top-3 right-3 flex items-center gap-2">
                                            <div className="">
                                                <motion.div
                                                    animate={{
                                                        boxShadow: [
                                                            "0 0 0 rgba(59, 130, 246, 0)",
                                                            "0 0 20px rgba(59, 130, 246, 0.6)",
                                                            "0 0 0 rgba(59, 130, 246, 0)",
                                                        ],
                                                    }}
                                                    transition={{
                                                        duration: 2.5,
                                                        repeat: Number.POSITIVE_INFINITY,
                                                        repeatType: "loop",
                                                    }}
                                                >
                                                    <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-lg backdrop-blur-md px-3 py-1">
                                                        <Gem className="w-3 h-3 mr-1.5 fill-white" />
                                                        <span className="font-semibold">NFT</span>
                                                    </Badge>
                                                </motion.div>
                                            </div>
                                            {!isPageAsset && (
                                                <div className="">
                                                    <motion.div
                                                        animate={{
                                                            boxShadow: [
                                                                "0 0 0 rgba(59, 130, 246, 0)",
                                                                "0 0 20px rgba(59, 130, 246, 0.6)",
                                                                "0 0 0 rgba(59, 130, 246, 0)",
                                                            ],
                                                        }}
                                                        transition={{
                                                            duration: 2.5,
                                                            repeat: Number.POSITIVE_INFINITY,
                                                            repeatType: "loop",
                                                        }}
                                                    >
                                                        <Badge className="px-3 py-1">
                                                            <Gem className="w-3 h-3 mr-1.5 fill-white" />
                                                            <span className="font-semibold">{mediaType === "THREE_D" ? "3D" : mediaType}</span>
                                                        </Badge>
                                                    </motion.div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )
                            )}
                        </div>

                        <div className="flex flex-1 flex-col gap-2 px-4 pb-3.5 pt-3">
                            <div className="flex items-start justify-between gap-3">
                                <h2 className="line-clamp-1 text-[0.98rem] font-semibold leading-tight text-black/90 dark:text-zinc-100">
                                    {code}
                                </h2>
                                <p className="shrink-0 truncate font-mono text-sm text-foreground/70 dark:text-zinc-400">
                                    {creatorId ? addrShort(creatorId, 4) : "Admin"}
                                </p>
                            </div>

                            <div className="space-y-0">
                                <div className="flex items-center gap-1 text-sm font-medium text-black/88 dark:text-zinc-100">
                                    <Gem className="h-4 w-4" />
                                    {priceInUSD && price ? (
                                        <>
                                            <span className="text-[#1f86ee] dark:text-sky-400">${priceInUSD}</span>
                                            <span className="text-black/60 dark:text-zinc-400">·</span>
                                            <span className="text-black/60 dark:text-zinc-400">{price} {PLATFORM_ASSET.code.toUpperCase()}</span>
                                        </>
                                    ) : priceInUSD ? (
                                        <span className="text-[#1f86ee] dark:text-sky-400">${priceInUSD}</span>
                                    ) : price ? (
                                        <span className="text-[#1f86ee] dark:text-sky-400">{price} {PLATFORM_ASSET.code.toUpperCase()}</span>
                                    ) : (
                                        <span className="text-black/60 dark:text-zinc-400">
                                            {isPageAsset ? "Page Asset" : mediaType === "THREE_D" ? "3D Model" : mediaType}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {mediaType && (
                                <div className="inline-flex w-fit rounded-[2px] bg-[#f3f1ee] px-2 py-0.5 text-sm font-medium text-black/60 dark:bg-zinc-800 dark:text-zinc-300">
                                    {mediaType === "THREE_D" ? "3D" : mediaType}
                                </div>
                            )}
                        </div>

                        <div className="relative z-20 mt-3 md:pointer-events-none md:absolute md:inset-x-0 md:bottom-0 md:mt-0 md:translate-y-full md:opacity-0 md:transition-all md:duration-300 md:group-hover:pointer-events-auto md:group-hover:translate-y-0 md:group-hover:opacity-100">
                            <Button
                                variant="default"
                                className="h-12 w-full rounded-none border-0 bg-[#1f86ee] px-4 text-base font-semibold text-white shadow-none hover:bg-[#1877da]"
                                onClick={onBuy}
                            >
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                {price ? "Buy Now" : "View Details"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </>
    )
}

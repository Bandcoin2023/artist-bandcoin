"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Badge } from "~/components/shadcn/ui/badge"
import { Card, CardContent } from "~/components/shadcn/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/shadcn/ui/dialog"
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
                <Card className="rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 h-full  backdrop-blur-sm group">
                    <CardContent className="p-0 h-full flex flex-col">
                        <div className="relative overflow-hidden">
                            <Image
                                src={thumbnail ?? "/images/logo.png"}
                                alt="Asset thumbnail"
                                height={240}
                                width={240}
                                className="object-cover h-48 w-full transition-transform duration-500 group-hover:scale-105"
                            />
                            {
                                !isPageAsset && (
                                    <Button
                                        onClick={handleViewClick}
                                        size="sm"
                                        variant="secondary"
                                        className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm hover:bg-white  border-0 shadow-lg"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                )
                            }

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
                                            {
                                                !isPageAsset && (
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
                                                                <span className="font-semibold">
                                                                    {mediaType === "THREE_D" ? "3D" : mediaType}
                                                                </span>
                                                            </Badge>
                                                        </motion.div>
                                                    </div>
                                                )
                                            }
                                        </div>
                                    </>
                                )
                            )}
                        </div>

                        <div className="p-4 flex-1 flex flex-col ">
                            <div className="space-y-3 flex-1">
                                {/* Title section */}
                                <div className="space-y-2">
                                    <div className="flex items-center  text-sm">
                                        <span className="font-medium">{creatorId ? addrShort(creatorId, 5) : "Admin"}</span>
                                        <motion.div
                                            animate={{ rotate: [0, 15, 0, -15, 0] }}
                                            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatDelay: 4 }}
                                        >
                                            <Star className="w-4 h-4 ml-2 fill-amber-400 text-amber-400" />
                                        </motion.div>
                                    </div>
                                    <h2 className="text-lg font-bold  truncate leading-tight">{code}</h2>
                                </div>

                                <div className="rounded-xl p-3 border ">
                                    <div className="flex items-center justify-between">
                                        {
                                            priceInUSD && (
                                                <div className=" flex items-center justify-center">
                                                    <div className="text-xs font-medium  uppercase tracking-wide">Price :  </div>
                                                    <div className="text-lg font-bold ">${priceInUSD} USD</div>
                                                </div>
                                            )
                                        }

                                        {price ? (
                                            <div className="text-right  flex items-center justify-center">

                                                <div className="text-lg font-bold  ">{price} {PLATFORM_ASSET.code.toUpperCase()} </div>



                                            </div>
                                        ) : (
                                            <div className="text-right gap-2 flex items-center justify-center w-full">
                                                <div className="text-sm font-semibold ">
                                                    {isPageAsset ? "Page Asset" : mediaType === "THREE_D" ? "3D MODEL" : mediaType}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {
                                price && (
                                    <div className="pt-3 ">
                                        <Button
                                            onClick={onBuy}
                                            size="sm"
                                            className="w-full transition-colors"
                                        >
                                            <ShoppingCart className="w-4 h-4 mr-2" />
                                            Buy Now
                                        </Button>
                                    </div>
                                )
                            }
                            {
                                isPageAsset && (
                                    <div className="pt-3 ">
                                        <Button
                                            size="sm"
                                            className="w-full transition-colors"
                                        >
                                            <Link className="w-4 h-4 mr-2" />
                                            View Page Asset
                                        </Button>
                                    </div>
                                )
                            }
                        </div>
                    </CardContent>
                </Card>
            </motion.div>


        </>
    )
}

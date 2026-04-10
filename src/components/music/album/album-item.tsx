"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Badge } from "~/components/shadcn/ui/badge"
import { Card, CardContent } from "~/components/shadcn/ui/card"
import { Pin, Gem, Music, Star } from 'lucide-react'
import { addrShort } from "~/utils/utils"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

interface AlbumViewProps {
    name?: string
    creatorId: string | null
    albumId: number
    coverImgUrl?: string
    isAlbum?: boolean
    creatorView?: boolean
}

export default function AlbumView({ name, creatorId, coverImgUrl, albumId, isAlbum = true, creatorView = false }: AlbumViewProps) {
    const router = useRouter()
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        setIsVisible(true)
    }, [])

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
            <Card
                onClick={() =>
                    router.push(creatorView ? `/music/album/${albumId}` : `/music/album/${albumId}`)
                }
                className="group relative h-full cursor-pointer overflow-hidden rounded-[0.95rem] border border-[#ddd9d0] bg-white shadow-[0_6px_18px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-none"
            >
                <CardContent className="relative flex h-[211px] flex-col p-0 md:h-[270px] lg:h-[300px]">
                    <div className="relative h-52 w-full overflow-hidden rounded-t-[0.95rem] bg-[#d8c7bb] dark:bg-zinc-800">
                        <Image
                            fill
                            alt={name ?? "album"}
                            src={coverImgUrl ?? "/images/logo.png"}
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />

                        {/* NFT Badge with animation */}
                        {isAlbum && (
                            <div className="absolute top-3 right-3 z-20">
                                <motion.div
                                    animate={{
                                        boxShadow: ["0 0 0 rgba(255, 215, 0, 0)", "0 0 15px rgba(255, 215, 0, 0.7)", "0 0 0 rgba(255, 215, 0, 0)"]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        repeatType: "loop"
                                    }}
                                >
                                    <Badge variant="secondary" className="bg-black/50 backdrop-blur-sm text-white border border-yellow-400">
                                        <Gem className="w-3 h-3 mr-1 text-yellow-400" /> ALBUM
                                    </Badge>
                                </motion.div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-1 flex-col gap-2 px-4 pb-3.5 pt-3">
                        <div className="flex items-start justify-between gap-3">
                            <h3 className="line-clamp-1 text-[0.98rem] font-semibold leading-tight text-black/90 dark:text-zinc-100">
                                {name ?? "Untitled Album"}
                            </h3>
                            <p className="shrink-0 truncate font-mono text-sm text-foreground/70 dark:text-zinc-400">
                                {creatorId ? addrShort(creatorId, 4) : "Admin"}
                            </p>
                        </div>

                        <div className="inline-flex w-fit rounded-[2px] bg-[#f3f1ee] px-2 py-0.5 text-sm font-medium text-black/60 dark:bg-zinc-800 dark:text-zinc-300">
                            <Music className="mr-1 h-3 w-3" />
                            Music
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}

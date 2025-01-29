"use client"

import { useSession } from "next-auth/react"
import Image from "next/image"
import { api } from "~/utils/api"
import { Dialog, DialogContent } from "~/components/shadcn/ui/dialog"
import { z } from "zod"
import { addrShort } from "~/utils/utils"
import Link from "next/link"
import { useRouter } from "next/router"
import { useModal } from "~/lib/state/play/use-modal-store"
import { Badge } from "~/components/shadcn/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/shadcn/ui/tabs"
import { ScrollArea } from "~/components/shadcn/ui/scroll-area"
import { ExternalLink, Info } from "lucide-react"
import { SparkleEffect } from "../common/modal-common-button"
import { AdminAssetWithTag } from "~/types/market/admin-asset-tag-type"


interface ViewAdminAssetProps {
    isOpen: boolean
    setIsOpen: (open: boolean) => void
    data: AdminAssetWithTag
}



export default function ViewAdminAsset({
    isOpen,
    setIsOpen,
    data
}: ViewAdminAssetProps) {


    const handleClose = () => {
        setIsOpen(false)
    }



    if (!data) return null

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl overflow-hidden p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                    <div className="space-y-4">
                        <div className="relative aspect-square rounded-lg overflow-hidden">
                            <SparkleEffect />
                            <Image
                                src={data.logoUrl || "/placeholder.svg"}
                                alt={data.code}
                                layout="fill"
                                objectFit="cover"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold">{data.code}</h2>
                            <Badge variant="secondary" className="text-xs">
                                {addrShort(data.adminId, 5)}
                            </Badge>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Tabs defaultValue="info">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="info">Info</TabsTrigger>
                                <TabsTrigger value="markets">Markets</TabsTrigger>
                            </TabsList>
                            <TabsContent value="info">
                                <ScrollArea className="h-[300px] rounded-md border p-4">
                                    <div className="space-y-4">
                                        <InfoItem label="Admin ID" value={data.adminId} />
                                        <InfoItem label="Code" value={data.code} />
                                        {/* Add more info items as needed */}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                            <TabsContent value="markets">
                                <ScrollArea className="h-[300px] rounded-md border p-4">
                                    <div className="space-y-4">
                                        <MarketLink name="StellarTerm" url={data.StellarTerm ?? ""} />
                                        <MarketLink name="Litemint" url={data.Litemint ?? ""} />
                                        <MarketLink name="StellarX" url={data.StellarX ?? ""} />
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="font-medium text-gray-500">{label}</span>
            <span className="font-mono">{value}</span>
        </div>
    )
}

function MarketLink({ name, url }: { name: string; url: string }) {
    if (!url) return null
    return (
        <Link href={url} className="flex items-center justify-between hover:underline">
            <span>{name}</span>
            <ExternalLink size={16} />
        </Link>
    )
}


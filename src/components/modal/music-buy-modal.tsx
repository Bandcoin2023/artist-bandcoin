import { useSession } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { api } from "~/utils/api";

import { ArrowLeft, Eye, X, DollarSign, User, Hash, Package, Copy } from 'lucide-react'
import { Button } from "~/components/shadcn/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogTitle,
} from "~/components/shadcn/ui/dialog";

import { Badge } from "~/components/shadcn/ui/badge";
import { PLATFORM_ASSET } from "~/lib/stellar/constant";

import { z } from "zod";
import { addrShort } from "~/utils/utils";

import clsx from "clsx";
import { useRouter } from "next/router";
import { Card, CardContent, CardFooter } from "~/components/shadcn/ui/card";
import { DeleteAssetByAdmin, DisableFromMarketButton, SparkleEffect } from "../common/modal-common-button";
import PaymentProcessItem from "../payment/payment-process";
import { useMusicBuyModalStore } from "../store/music-buy-store";
import { Separator } from "../shadcn/ui/separator";
import Link from "next/link";

export const PaymentMethodEnum = z.enum(["asset", "xlm", "card"]);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

export default function MusicBuyModal() {
    const [step, setStep] = useState(1);

    const { data, isOpen, setIsOpen } = useMusicBuyModalStore();
    const session = useSession();
    const router = useRouter();

    const handleClose = () => {
        setStep(1);
        setIsOpen(false);
    };

    const copy = api.marketplace.market.getSongAvailableCopy.useQuery(
        {
            songId: data?.id,
        },
        {
            enabled: !!data?.id,
        },
    );

    const handleNext = () => {
        setStep((prev) => prev + 1);
    };

    const handleBack = () => {
        setStep((prev) => prev - 1);
    };
    const addrShort = (address: string | null | undefined, chars = 5) => {
        if (!address) return "";
        return `${address.slice(0, chars)}...${address.slice(-chars)}`
    }

    const copyToClipboard = (text: string | null | undefined) => {
        if (text) {
            navigator.clipboard.writeText(text)
        }
    }

    const { data: canBuyUser } =
        api.marketplace.market.userCanBuySongMarketAsset.useQuery(
            data?.id ?? -1,
            {
                enabled: !!data?.id,
            },
        );
    console.log("Canbuy", canBuyUser)
    if (!data || !data.asset)
        return (
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="max-w-md bg-black border-border flex items-center justify-center p-12">
                    <DialogTitle className="sr-only">Loading Asset</DialogTitle>
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <p className="text-sm text-muted-foreground">Loading asset details...</p>
                    </div>
                </DialogContent>
            </Dialog>
        )

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden border-border bg-background shadow-2xl transition-all duration-300">
                    <DialogTitle className="sr-only">{data.asset.name}</DialogTitle>

                    {step === 1 && (
                        <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
                            {/* Left: Media Preview */}
                            <div className="w-full md:w-1/2 bg-muted/30 relative flex items-center justify-center min-h-[300px] md:min-h-[500px] group overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <Image
                                    src={data.asset.thumbnail || "/placeholder.svg?height=600&width=600&query=Asset+Thumbnail"}
                                    alt={data.asset.name}
                                    fill
                                    className="object-cover "
                                    priority
                                />
                                <div className="absolute bottom-6 left-6 z-20">
                                    <Badge
                                        variant="secondary"
                                        className="bg-primary/20 backdrop-blur-xl border-primary/20 text-[10px] uppercase tracking-[0.2em] px-3 py-1 font-mono text-muted-foreground"
                                    >
                                        {data.asset.mediaType === "THREE_D" ? "3D Collectible" : data.asset.mediaType}
                                    </Badge>
                                </div>
                            </div>

                            {/* Right: Info & Actions */}
                            <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col bg-card text-foreground border-l border-border">
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-4">
                                            <h2 className="text-3xl font-black tracking-tighter uppercase font-sans leading-none italic italic">
                                                {data.asset.name}
                                            </h2>
                                            <Badge variant="outline" className="font-mono text-[10px] border-border bg-muted/50 py-1">
                                                {data.asset.code}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                                            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                                                Issuer: {addrShort(data.asset.issuer, 8)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <section>
                                            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] mb-4">
                                                Asset Description
                                            </h3>
                                            <p className="text-sm leading-relaxed text-foreground/80 font-sans font-medium">
                                                {data.asset.description ?? "Secure this unique digital asset on the Stellar blockchain network."}
                                            </p>
                                        </section>

                                        <div className="grid grid-cols-2 gap-4 bg-muted/20 p-6 rounded-2xl border border-border/50">
                                            <section className="space-y-1">
                                                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                                                    Acquisition
                                                </h3>
                                                <div className="flex flex-col">
                                                    <span className="text-2xl font-mono font-black text-muted-foreground italic ">
                                                        {data.price} <span className="text-xs">{PLATFORM_ASSET.code}</span>
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-mono opacity-60">
                                                        ≈ ${data.priceUSD} USD
                                                    </span>
                                                </div>
                                            </section>
                                            <section className="space-y-1 text-right">
                                                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                                                    Scarcity
                                                </h3>
                                                <div className="flex items-center justify-end gap-2">
                                                    <Package className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-sm font-mono font-bold">
                                                        {copy.data ?? 0} {copy.data === 1 ? "Unit" : "Units"}
                                                    </span>
                                                </div>
                                            </section>
                                        </div>

                                        <section className="space-y-2">
                                            <div
                                                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors group cursor-pointer"
                                                onClick={() => copyToClipboard(data.asset.issuer)}
                                            >
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                    Verified Issuer
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-mono text-foreground/60 group-hover:text-muted-foreground transition-colors italic italic">
                                                        {addrShort(data.asset.issuer, 6)}
                                                    </span>
                                                    <Copy className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                </div>

                                <div className="mt-8 pt-8 border-t border-border space-y-4">
                                    {session.status === "authenticated" && data.creatorId === session.data?.user.id ? (
                                        <DisableFromMarketButton code={data.asset.code} issuer={data.asset.issuer} />
                                    ) : canBuyUser?.canBuy && copy.data && copy.data > 0 ? (
                                        <Button
                                            onClick={handleNext}
                                            className="w-full bg-primary text-muted-foreground shadow-foreground hover:bg-primary/90 h-14 font-black uppercase tracking-[0.2em] text-xs border-2 rounded-xl"
                                        >
                                            Initiate Purchase
                                        </Button>
                                    ) : (
                                        <Button
                                            disabled
                                            className="w-full h-14 text-muted-foreground bg-muted border-border uppercase tracking-[0.2em] text-xs italic italic rounded-xl"
                                        >
                                            Out of Stock
                                        </Button>
                                    )}
                                    <div className="flex gap-3">
                                        <Link href={`/market-asset/${canBuyUser?.marketAssetId}`} className="flex-1">
                                            <Button
                                                onClick={handleClose}
                                                variant="outline"
                                                className="w-full h-12 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 text-[10px] uppercase tracking-[0.2em] font-bold rounded-xl bg-transparent"
                                            >
                                                <Eye className="mr-2 h-3 w-3" /> DETAILS
                                            </Button>
                                        </Link>
                                        {data.asset.percentage && (
                                            <Link href={`/royalty/${data.asset.id}`} className="flex-1">
                                                <Button
                                                    variant="outline"
                                                    className="w-full h-12 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 text-[10px] uppercase tracking-[0.2em] font-bold rounded-xl bg-transparent"
                                                >
                                                    Royalty Share
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="p-10 max-h-[90vh] overflow-y-auto bg-background animate-in fade-in zoom-in-95 duration-300">
                            <div className="mb-10 flex items-center justify-between">
                                <Button
                                    variant="ghost"
                                    onClick={handleBack}
                                    className="p-0 h-auto hover:bg-transparent text-muted-foreground hover:text-muted-foreground font-mono text-[10px] uppercase tracking-widest flex items-center gap-2 group"
                                >
                                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Intelligence
                                </Button>
                                <h2 className="text-sm font-black uppercase tracking-[0.3em] font-sans text-foreground">
                                    Secure Checkout
                                </h2>
                                <div className="w-16" />
                            </div>

                            <PaymentProcessItem
                                marketItemId={canBuyUser?.marketAssetId}
                                priceUSD={data.priceUSD}
                                item={data.asset}
                                price={data.price}
                                placerId={data.creatorId}
                                setClose={handleClose}
                                type={data.asset.percentage ? "ROYALTY" : "SONG"}
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog >
        </>
    );
}

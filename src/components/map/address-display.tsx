"use client"

import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import toast from "react-hot-toast";
import { useGeolocation, useReverseGeolocation } from "~/hooks/use-geolocation";
import { Badge } from "../shadcn/ui/badge";
import { Button } from "../shadcn/ui/button";

interface LocationAddressDisplayProps {
    latitude: number;
    longitude: number;
    className?: string;
}

export function LocationAddressDisplay({
    latitude,
    longitude,
    className,
}: LocationAddressDisplayProps) {
    const { address, loading } = useReverseGeolocation(latitude, longitude);
    const [isCopied, setIsCopied] = useState(false);

    // Reset the copy state after 2 seconds
    useEffect(() => {
        if (isCopied) {
            const timer = setTimeout(() => setIsCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [isCopied]);

    const handleCopyAddress = async () => {
        if (!address || address === "Loading...") return;

        try {
            await navigator.clipboard.writeText(address);
            setIsCopied(true);
            toast.success("Address copied to clipboard!");
        } catch (error) {
            toast.error("Failed to copy address");
        }
    };

    return (
        <div className="flex items-center gap-2">
            {/* Part 1: Address Display */}
            <Badge className={className}>
                <div className="flex items-center justify-between text-center">
                    <span className="text-sm font-bold">{loading ? "Loading..." : address}</span>
                </div>
            </Badge>

            {/* Part 2: Copy Button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyAddress}
                disabled={loading || !address || address === "Loading..."}
                className={`transition-all duration-200 ${isCopied
                    ? "bg-green-100 text-green-700 hover:bg-green-100"
                    : "text-gray-600 hover:bg-gray-100"
                    }`}
                title="Copy address to clipboard"
            >
                {isCopied ? (
                    <>
                        <Check className="h-4 w-4 mr-1" />
                        <span className="text-xs">Copied</span>
                    </>
                ) : (
                    <>
                        <Copy className="h-4 w-4 mr-1" />

                    </>
                )}
            </Button>
        </div>
    );
}
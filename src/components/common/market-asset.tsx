"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import type { MarketAssetType } from "~/lib/state/play/use-modal-store"
import { useBuyModalStore } from "../store/buy-modal-store"

import { useLoginRequiredModalStore } from "../store/login-required-modal-store"
import AssetView from "./asset"

function MarketAssetComponent({ item }: { item: MarketAssetType }) {
    const { asset } = item
    const { setIsOpen, setData } = useBuyModalStore()
    const session = useSession()
    const { isOpen: isLoginModalOpen, setIsOpen: setLoginModalOpen } = useLoginRequiredModalStore()
    // Added router for navigation to single asset page
    const router = useRouter()

    const handleBuyAsset = () => {
        if (session.status === "unauthenticated") {
            console.log("User not logged in, opening login modal")
            setLoginModalOpen(true)
        } else {
            setData(item)
            setIsOpen(true)
        }
    }
    const handleViewAsset = () => {
        if (session.status === "unauthenticated") {
            console.log("User not logged in, opening login modal")
            setLoginModalOpen(true)
        } else {
            if (item.type === 'ROYALTY') {
                // Navigate to single asset page instead of opening buy modal
                router.push(`/royalty/${asset.id}`)
            }
            else {
                // Navigate to single asset page instead of opening buy modal
                router.push(`/market-asset/${item.id}`)
            }
        }
    }
    return (
        <div className="cursor-pointer">
            <AssetView
                code={asset.name}
                thumbnail={asset.thumbnail}
                creatorId={asset.creatorId}
                price={item.price}
                percentage={asset.percentage}
                priceInUSD={item.priceUSD}
                mediaType={asset.mediaType}
                onBuy={handleBuyAsset}
                onView={handleViewAsset}
            />
        </div>
    )
}

export default MarketAssetComponent

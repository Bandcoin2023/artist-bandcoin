"use client"

import React, { useEffect, useState, useCallback } from "react"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "~/components/shadcn/ui/card"
import Image from "next/image"
import { Button } from "~/components/shadcn/ui/button"
import { PLATFORM_ASSET } from "~/lib/stellar/constant"
import { api } from "~/utils/api"
import { MarketAssetType } from "~/types/market/market-asset-type"
import BuyModal from "~/components/modal/buy-asset-modal"

const HomePage = () => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedRecentlyAddedMarketAssets, setSelectedRecentlyAddedMarketAssets] = useState<MarketAssetType>()
  const [isAutoPlay, setIsAutoPlay] = useState(true)
  const [isOpenBuyModal, setIsOpenBuyModal] = useState(false)
  const fanAssets = api.marketplace.market.getLatestMarketNFT.useQuery(undefined, {
    refetchOnWindowFocus: false,
  })
  const RecentlyAddedMarketAssets = fanAssets.data ?? []
  const handleNext = useCallback(() => {
    if (RecentlyAddedMarketAssets.length === 0) return
    setCurrentIndex((prevIndex) => (prevIndex + 1) % RecentlyAddedMarketAssets.length)
  }, [RecentlyAddedMarketAssets.length])

  const handlePrev = useCallback(() => {
    if (RecentlyAddedMarketAssets.length === 0) return
    setCurrentIndex((prevIndex) => (prevIndex - 1 + RecentlyAddedMarketAssets.length) % RecentlyAddedMarketAssets.length)
  }, [RecentlyAddedMarketAssets.length])

  useEffect(() => {
    if (!isAutoPlay || RecentlyAddedMarketAssets.length === 0) return

    const timer = setInterval(handleNext, 5000)
    return () => clearInterval(timer)
  }, [isAutoPlay, handleNext, RecentlyAddedMarketAssets.length])

  const handleProductClick = (asset: MarketAssetType | undefined) => {
    if (!asset) return
    setSelectedRecentlyAddedMarketAssets(asset)

  }

  const getVisibleProducts = () => {
    if (RecentlyAddedMarketAssets.length === 0) return []

    const visibleIndices = Array.from({ length: 5 }, (_, i) =>
      (currentIndex + i) % RecentlyAddedMarketAssets.length
    )
    return visibleIndices.map((index) => RecentlyAddedMarketAssets[index])
  }

  // Early return if no data
  if (fanAssets.isLoading ?? RecentlyAddedMarketAssets.length === 0) {
    return (
      <div className="relative h-[40vh] rounded-2xl p-4 bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/90 backdrop-blur-md rounded-2xl" />
        <div className="relative z-10 h-full flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl md:text-4xl font-bold text-white">RECENLTY ADDED</h2>
            <div className="gap-2 hidden md:flex">
              <div className="h-10 w-10 bg-gray-300 rounded animate-pulse" />
              <div className="h-10 w-10 bg-gray-300 rounded animate-pulse" />
            </div>
          </div>

          <div className="flex-grow grid md:grid-cols-4 gap-4">
            <div className="col-span-3 flex items-center justify-center md:justify-start relative overflow-hidden">
              {[0, 1, 2, 3, 4].map((index) => (
                <ProductSkeleton key={index} index={index} />
              ))}
            </div>
            <div className="hidden md:flex w-full">
              <DetailsSkeleton />
            </div>
          </div>

          <div className="flex justify-center">
            {[0, 1, 2, 3, 4].map((index) => (
              <div
                key={index}
                className="w-3 h-3 rounded-full mx-1 bg-gray-500 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const currentAsset = RecentlyAddedMarketAssets[currentIndex]


  return (
    <div className="relative h-[56vh] md:h-[42vh] rounded-2xl p-4 bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
      {/* Background with gradient overlay */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}

        className="absolute inset-0 rounded-xl"
        style={{
          backgroundImage: `url(${currentAsset?.asset?.thumbnail ?? '/images/logo.png'})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/20 to-white/1 backdrop-blur-md rounded-2xl" />
      </motion.div>

      {/* Main content */}
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl md:text-4xl font-bold text-white">RECENLTY ADDED</h2>
          <div className="gap-2 flex">
            <Button variant="outline" size="icon" onClick={handlePrev}>
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNext}>
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Product carousel */}
        <div className="flex-grow grid md:grid-cols-4 gap-4 ">
          <div className="col-span-3 flex items-center  justify-center md:justify-start relative overflow-hidden">
            <AnimatePresence initial={false}>
              {getVisibleProducts().map((marketasset, index) => (
                marketasset && (
                  <motion.div
                    key={marketasset.asset.id}
                    className="flex-shrink-0   cursor-pointer absolute "
                    initial={{ scale: 0.8, x: (index) * 300, opacity: index === 0 ? .95 : 0.6 }}
                    animate={{
                      scale: index === 0 ? .95 : 0.8,
                      x: (index) * 300,
                      y: index === 0 ? -5 : 20,
                      opacity: index === 0 ? 1 : 0.6,
                      zIndex: index === 0 ? 2 : 1,
                    }}
                    onClick={() => {
                      setCurrentIndex((prevIndex) => (prevIndex + index) % RecentlyAddedMarketAssets.length)
                      handleProductClick(marketasset as MarketAssetType)
                      setIsOpenBuyModal(true)
                    }
                    }


                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="flex-col flex justify-between gap-4 ">
                      <div className="relative rounded-xl overflow-hidden group shadow-md  backdrop-blur-xs shadow-teal-100">
                        <div className={`${index === 0 ? "w-64 h-72" : "w-60 h-72"} relative transition-all duration-200 ease-in `}>
                          <Image
                            src={marketasset.asset.thumbnail ?? "/images/logo.png"}
                            alt={marketasset.asset.code ?? "Placeholder"}
                            fill
                            className="rounded-xl object-cover"
                            priority={index === 0}
                          />
                        </div>

                        <div className="absolute bottom-2 left-2 right-2  p-4  border-2 rounded-xl bg-black/50 backdrop-blur-sm ">
                          <h3 className="text-xl font-bold text-white truncate">{marketasset.asset.name}</h3>
                          <p className="text-sm font-bold text-gray-100">{marketasset.asset.mediaType}</p>
                        </div>

                      </div>
                      <div className="block md:hidden">

                        <div className="flex items-center gap-2 text-white">
                          <p className="text-lg font-semibold border-b-2 w-full">
                            PRICE: {marketasset.price} {PLATFORM_ASSET.code.toLocaleUpperCase()}
                          </p>
                          <span className="bg-black text-white px-2 py-0.5 text-sm rounded border-2">
                            ${marketasset.priceUSD}
                          </span>
                        </div>
                        <div className="flex items-center gap-2  text-white">
                          <p className="text-sm uppercase">Media Type:</p>
                          <span className="text-sm ">{marketasset.asset.mediaType}</span>
                        </div>
                        <Button

                          onClick={() => {
                            setCurrentIndex((prevIndex) => (prevIndex + 0) % RecentlyAddedMarketAssets.length)
                            handleProductClick(currentAsset as MarketAssetType)
                            setIsOpenBuyModal(true)
                          }}
                          className="w-full shadow-sm shadow-white ">BUY NOW
                        </Button>
                      </div>

                    </div>
                  </motion.div>
                )
              ))}
            </AnimatePresence>
          </div>

          {/* Product details card */}
          <div className="hidden md:flex w-full">
            <Card className="min-w-[350px] p-6 space-y-6 bg-white/50 border-none shadow-lg backdrop-blur-md">
              <div className="space-y-1 border-2 rounded-md p-2">
                <h2 className="text-lg font-bold uppercase">{currentAsset?.asset?.name}</h2>
                <p className="text-sm uppercase text-neutral-700">{currentAsset?.asset?.code}</p>
              </div>

              <div className="space-y-4 p-2">
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold border-b-2 w-full">
                    PRICE: {currentAsset?.price} {PLATFORM_ASSET.code.toLocaleUpperCase()}
                  </p>
                  <span className="bg-black text-white px-2 py-0.5 text-sm rounded border-2">
                    ${currentAsset?.priceUSD}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm uppercase">Media Type:</p>
                  <span className="text-sm text-neutral-700">{currentAsset?.asset?.mediaType}</span>
                </div>
              </div>

              <div className="flex">
                <Button

                  onClick={() => {
                    setCurrentIndex((prevIndex) => (prevIndex + 0) % RecentlyAddedMarketAssets.length)
                    handleProductClick(currentAsset as MarketAssetType)
                    setIsOpenBuyModal(true)
                  }}
                  className="w-full border-2 shadow-sm shadow-black ">BUY NOW</Button>
              </div>
            </Card>
          </div>
        </div >

        {/* Carousel dots */}
        < div className="flex justify-center " >
          {
            RecentlyAddedMarketAssets.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full mx-1 ${index === currentIndex ? "bg-white" : "bg-gray-500"}`}
                onClick={() => setCurrentIndex(index)}
              />
            ))
          }
        </div >
      </div >
      {
        isOpenBuyModal && selectedRecentlyAddedMarketAssets &&
        <BuyModal
          data={selectedRecentlyAddedMarketAssets}
          isOpen={isOpenBuyModal}
          setIsOpen={setIsOpenBuyModal}
        />
      }


    </div >
  )
}

export default HomePage

const ProductSkeleton = ({ index }: {
  index: number
}) => (
  <div
    className="absolute flex-shrink-0 "
    style={{
      transform: `translateX(${index * 300}px) 
               scale(${index === 0 ? .9 : 0.8}) 
               translateY(${index === 0 ? -10 : 10}px)`,
      zIndex: index === 0 ? 2 : 1,
      opacity: index === 0 ? 1 : 0.6,
    }}
  >
    <div className="relative rounded-xl overflow-hidden">
      <div className={`${index === 0 ? "w-64 h-72" : "w-60 h-72"} bg-gray-200 animate-pulse`} />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="h-6 w-24 bg-gray-300 rounded animate-pulse mb-2" />
        <div className="h-4 w-16 bg-gray-300 rounded animate-pulse" />
      </div>
    </div>
  </div>
)

const DetailsSkeleton = () => (
  <Card className="min-w-[350px] p-6 space-y-6 bg-white/50 border-none shadow-lg backdrop-blur-md">
    <div className="space-y-1 border-2 rounded-md p-2">
      <div className="h-6 w-32 bg-gray-300 rounded animate-pulse mb-2" />
      <div className="h-4 w-24 bg-gray-300 rounded animate-pulse" />
    </div>
    <div className="space-y-1 p-2">
      <div className="flex items-center gap-2">
        <div className="h-6 w-full bg-gray-300 rounded animate-pulse" />
        <div className="h-6 w-16 bg-gray-300 rounded animate-pulse" />
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="h-4 w-20 bg-gray-300 rounded animate-pulse" />
        <div className="h-4 w-24 bg-gray-300 rounded animate-pulse" />
      </div>
    </div>
    <div className="flex">
      <div className="h-10 w-full bg-gray-300 rounded animate-pulse" />
    </div>
  </Card>
)
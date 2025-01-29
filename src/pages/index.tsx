"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/shadcn/ui/card"
import Image from "next/image"
import { Button } from "~/components/shadcn/ui/button"
import { PLATFORM_ASSET } from "~/lib/stellar/constant"
import { api } from "~/utils/api"
import { MarketAssetType } from "~/types/market/market-asset-type"
import BuyModal from "~/components/modal/buy-asset-modal"
import { cn } from "~/lib/utils"

import Asset from "~/components/common/admin-asset"
import MarketAssetComponent from "~/components/common/market-asset"
import PageAssetComponent from "~/components/common/page-asset"
import { MoreAssetsSkeleton } from "~/components/common/grid-loading"


// Global Variables
const TABS = ["ALL", "BANDCOIN", "ARTISTS", "ARTIST TOKENS"]

const HomePage = () => {
  // Variables Declaration
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedRecentlyAddedMarketAssets, setSelectedRecentlyAddedMarketAssets] = useState<MarketAssetType>()
  const [isAutoPlay, setIsAutoPlay] = useState(true)
  const [isOpenBuyModal, setIsOpenBuyModal] = useState(false)
  const fanAssets = api.marketplace.market.getLatestMarketNFT.useQuery(undefined, {
    refetchOnWindowFocus: false,
  })

  const RecentlyAddedMarketAssets = fanAssets.data ?? []


  // Function Declearation 
  const handleNext = useCallback(() => {
    if (RecentlyAddedMarketAssets.length === 0) return
    setCurrentIndex((prevIndex) => (prevIndex + 1) % RecentlyAddedMarketAssets.length)
  }, [RecentlyAddedMarketAssets.length])

  const handlePrev = useCallback(() => {
    if (RecentlyAddedMarketAssets.length === 0) return
    setCurrentIndex((prevIndex) => (prevIndex - 1 + RecentlyAddedMarketAssets.length) % RecentlyAddedMarketAssets.length)
  }, [RecentlyAddedMarketAssets.length])


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
  useEffect(() => {
    if (!isAutoPlay || RecentlyAddedMarketAssets.length === 0) return

    const timer = setInterval(handleNext, 5000)
    return () => clearInterval(timer)
  }, [isAutoPlay, handleNext, RecentlyAddedMarketAssets.length])

  // Early return if no data
  if (fanAssets.isLoading ?? RecentlyAddedMarketAssets.length === 0) {
    return (
      <div className="relative h-[56vh] md:h-[42vh] rounded-2xl p-4 bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/90 backdrop-blur-md rounded-2xl" />
        <div className="relative z-10 h-full flex flex-col rounded-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl xl:text-4xl font-bold text-white">RECENLTY ADDED</h2>
            <div className="gap-2 hidden md:flex">
              <div className="h-10 w-10 bg-gray-700 rounded-lg " />
              <div className="h-10 w-10 bg-gray-700 rounded-lg animate-pulse" />
            </div>
          </div>

          <div className="flex-grow grid md:grid-cols-4 gap-4">
            <div className="col-span-3 flex items-center justify-center md:justify-start relative overflow-hidden h-full">
              <ProductSkeleton />
            </div>
            <div className="hidden md:flex w-full">
              <DetailsSkeleton />
            </div>
          </div>

          <div className="flex justify-center mt-4">
            {[0, 1, 2, 3, 4].map((index) => (
              <div
                key={index}
                className="w-2 h-2 rounded-full mx-1 bg-gray-700 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const currentAsset = RecentlyAddedMarketAssets[currentIndex]


  return (
    <div className="relative  flex flex-col gap-4 overflow-y-auto h-full">
      <div className="relative h-[50vh] md:h-[42vh] shadow-lg rounded-2xl p-4 bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
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
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/20 to-white/10 backdrop-blur-md rounded-2xl" />
        </motion.div>

        {/* Main content */}
        <div className="relative z-10 h-full flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl md:text-4xl font-bold text-white">RECENLTY ADDED</h2>
            <div className="gap-2 flex">
              <Button variant="outline" className="bg-transparent" size="icon" onClick={handlePrev}>
                <ChevronLeft className="w-6 h-6 text-white" />
              </Button>
              <Button variant="outline" className="bg-transparent" size="icon" onClick={handleNext}>
                <ChevronRight className="w-6 h-6 text-white" />
              </Button>
            </div>
          </div>

          {/* Product carousel */}
          <div className="flex-grow grid xl:grid-cols-4 gap-4 ">
            <div className="col-span-3 flex items-center  justify-center md:justify-start relative overflow-hidden">
              <AnimatePresence initial={false}>
                {getVisibleProducts().map((marketasset, index) => (
                  marketasset && (
                    <motion.div
                      key={marketasset.asset.id}
                      className="flex-shrink-0   cursor-pointer absolute "
                      initial={{ scale: 0.8, x: (index) * 220, opacity: index === 0 ? .95 : 0.8 }}
                      animate={{
                        scale: index === 0 ? .95 : 0.8,
                        x: index === 0 ? -28 : (index) * 220,
                        y: index === 0 ? -5 : 20,
                        opacity: index === 0 ? 1 : 0.8,
                        zIndex: index === 0 ? 2 : 1,
                      }}
                      onClick={() => {
                        setCurrentIndex((prevIndex) => (prevIndex + index) % RecentlyAddedMarketAssets.length)
                        handleProductClick(marketasset as MarketAssetType)
                        setIsOpenBuyModal(true)
                      }
                      }


                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="flex-col flex justify-between gap-4 md:pl-6">
                        <div className={`${index === 0 ? 'shadow-white  shadow-md ' : 'shadow-white  shadow-sm'} relative rounded-xl overflow-hidden group backdrop-blur-xs `}>
                          <div className={`${index === 0 ? "w-60 h-60 md:w-60 md:h-72  " : "w-60 h-60 md:w-60 md:h-72 "}  {${index === 1 ? "w-60 h-60 md:w-60 md:h-68  " : "w-60 h-60 md:w-60 md:h-68 "}relative transition-all duration-200 ease-in `}>
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
                        <div className="flex flex-col gap-2 md:hidden">

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
                            variant='secondary'
                            onClick={() => {
                              setCurrentIndex((prevIndex) => (prevIndex + 0) % RecentlyAddedMarketAssets.length)
                              handleProductClick(currentAsset as MarketAssetType)
                              setIsOpenBuyModal(true)
                            }}
                            className="w-full shadow-sm shadow-black ">BUY NOW
                          </Button>
                        </div>

                      </div>
                    </motion.div>
                  )
                ))}
              </AnimatePresence>
            </div>

            {/* Product details card */}
            <div className="hidden xl:flex w-full ">
              <Card className="min-w-[350px] p-6 space-y-6 bg-white/40 border-none shadow-sm shadow-black backdrop-blur-md">
                <div className="space-y-1 border-2 rounded-md p-2 ">
                  <h2 className="text-lg font-bold uppercase">{currentAsset?.asset?.name}</h2>
                  <p className="text-sm uppercase text-neutral-700">{currentAsset?.asset?.code}</p>
                </div>

                <div className="space-y-4 p-2  rounded-sm">
                  <div className="flex items-center gap-2 ">
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
                  className={`w-2 h-2 rounded-full mx-1 ${index === currentIndex ? "bg-white" : "bg-gray-500"}`}
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

      {/* Tabs */}
      <div className='w-full'>
        <FilterTabs />
      </div>
    </div>
  )
}

export default HomePage


const FilterTabs = () => {
  const [activeTab, setActiveTab] = useState("ALL")
  const musicAssets = api.music.song.getAllSongMarketAssets.useInfiniteQuery(
    { limit: 10 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor },
  )

  const adminAssets = api.marketplace.market.getMarketAdminNfts.useInfiniteQuery(
    { limit: 10 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor },
  )

  const fanAssets = api.marketplace.market.getFanMarketNfts.useInfiniteQuery(
    { limit: 10 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor },
  )

  const artistAssets = api.marketplace.market.getPageAssets.useInfiniteQuery(
    { limit: 10 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor },
  )

  const isLoading =

    musicAssets.isLoading ??
    adminAssets.isLoading ??
    fanAssets.isLoading ??
    artistAssets.isLoading
  const hasNextPage =

    musicAssets.hasNextPage ??
    adminAssets.hasNextPage ??
    fanAssets.hasNextPage ??
    artistAssets.hasNextPage
  const isFetchingNextPage =

    musicAssets.isFetchingNextPage ??
    adminAssets.isFetchingNextPage ??
    fanAssets.isFetchingNextPage ??
    artistAssets.isFetchingNextPage




  const fetchNextPage = () => {

    if (musicAssets.hasNextPage) musicAssets.fetchNextPage()
    if (adminAssets.hasNextPage) adminAssets.fetchNextPage()
    if (fanAssets.hasNextPage) fanAssets.fetchNextPage()
    if (artistAssets.hasNextPage) artistAssets.fetchNextPage()
  }
  return (

    <Card className="">
      <CardHeader className="bg-primary w-full rounded-md p-2 md:p-4">
        <CardTitle className="flex gap-2 md:gap-4 w-full md:w-[50vw] p-0 ">
          {TABS.map((tab) => (
            <Button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "text-sm  flex px-2 lg:px-10 w-1/2 shadow-sm shadow-black transition-all ease-in-out duration-300",
                activeTab === tab ? "border-2 w-full font-bold text-[#dbdd2c]" : " ",
              )}
            >
              {tab}
            </Button>
          ))}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-y-auto h-[36vh] md:h-[35vh] scrollbar-hide p-0 md:p-4" >

        <div>
          {activeTab === "ALL" && <div className="">
            <AllAssets
              musicAssets={musicAssets}
              adminAssets={adminAssets}
              fanAssets={fanAssets}
              artistAssets={artistAssets}
              isLoading={isLoading}
              hasNextPage={hasNextPage ?? false}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}


            />
          </div>}
          {activeTab === "BANDCOIN" && <div>
            <AdminAsset
              adminAssets={adminAssets}
              hasNextPage={adminAssets.hasNextPage ?? false}
              isFetchingNextPage={adminAssets.isFetchingNextPage}
              fetchNextPage={adminAssets.fetchNextPage}
              isLoading={isLoading}
            />
          </div>}
          {activeTab === "ARTISTS" && <div>
            <Artist artist={artistAssets}
              hasNextPage={artistAssets.hasNextPage ?? false}
              isFetchingNextPage={artistAssets.isFetchingNextPage}
              fetchNextPage={artistAssets.fetchNextPage}
              isLoading={artistAssets.isLoading}
            />
          </div>}
          {activeTab === "ARTIST TOKENS" && <div>
            <ArtistTokens artistTokens={fanAssets}
              hasNextPage={fanAssets.hasNextPage ?? false}
              isFetchingNextPage={fanAssets.isFetchingNextPage}
              fetchNextPage={fanAssets.fetchNextPage}
              isLoading={isLoading}
            />
          </div>

          }

        </div>
      </CardContent>
    </Card>
  )

}



interface AllAssetsTypes {
  musicAssets: ReturnType<
    typeof api.music.song.getAllSongMarketAssets.useInfiniteQuery
  >;
  adminAssets: ReturnType<typeof api.marketplace.market.getMarketAdminNfts.useInfiniteQuery>
  fanAssets: ReturnType<typeof api.marketplace.market.getFanMarketNfts.useInfiniteQuery>
  artistAssets: ReturnType<typeof api.marketplace.market.getPageAssets.useInfiniteQuery>
  hasNextPage: boolean
  isLoading: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
}

const AllAssets = ({
  musicAssets,
  adminAssets,
  fanAssets,
  artistAssets,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,

}: AllAssetsTypes) => {




  return (
    <div className="flex flex-col gap-4 shadow-md rounded-md p-4 bg-white/40 min-h-[35vh]">
      {
        isLoading && <MoreAssetsSkeleton className="grid gap-2 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 p-2" />
      }
      <div className="grid gap-2 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">

        {musicAssets.data?.pages.map((page, pageIndex) =>
          page.nfts.map((item, index) => <MarketAssetComponent key={`music-${pageIndex}-${index}`} item={item} />),
        )}
        {adminAssets.data?.pages.map((page, pageIndex) =>
          page.nfts.map((item, index) => <MarketAssetComponent key={`admin-${pageIndex}-${index}`} item={item} />),
        )}
        {fanAssets.data?.pages.map((page, pageIndex) =>
          page.nfts.map((item, index) => <MarketAssetComponent key={`fan-${pageIndex}-${index}`} item={item} />),
        )}
        {artistAssets.data?.pages.map((page, pageIndex) =>
          page.nfts.map((item, index) => <PageAssetComponent key={`artist-${pageIndex}-${index}`} item={item} />),
        )}

      </div>
      {hasNextPage && (
        <Button className="flex items-center justify-center shadow-sm  shadow-black w-1/2 md:w-1/4" onClick={fetchNextPage} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "Loading more..." : "Load More"}
        </Button>
      )}
    </div>

  )
};


interface AdminAssetTypes {
  adminAssets: ReturnType<typeof api.marketplace.market.getMarketAdminNfts.useInfiniteQuery>
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  isLoading: boolean
}


const AdminAsset = (
  { adminAssets,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading
  }: AdminAssetTypes) => {
  return (
    <div className="flex flex-col gap-4 shadow-md rounded-md p-4 bg-white/40 min-h-[35vh]">
      {
        isLoading && <MoreAssetsSkeleton className="grid gap-2 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 p-2" />
      }
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {adminAssets.data?.pages.map((page, pageIndex) =>
          page.nfts.map((item, index) => <MarketAssetComponent key={`admin-${pageIndex}-${index}`} item={item} />),
        )}
      </div>
      {hasNextPage && (
        <Button className="flex items-center justify-center shadow-sm  shadow-black w-1/2 md:w-1/4" onClick={fetchNextPage} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "Loading more..." : "Load More"}
        </Button>
      )}
    </div>
  )
}


// ----------------- Fans -----------------

interface AristTokenTypes {
  artistTokens: ReturnType<typeof api.marketplace.market.getFanMarketNfts.useInfiniteQuery>
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  isLoading: boolean
}

const ArtistTokens = (
  { artistTokens,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading
  }: AristTokenTypes) => {
  return (
    <div className="flex flex-col gap-4 shadow-md rounded-md p-4 bg-white/40 min-h-[35vh]">
      {
        isLoading && <MoreAssetsSkeleton className="grid gap-2 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 p-2" />
      }
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {artistTokens.data?.pages.map((page, pageIndex) =>
          page.nfts.map((item, index) => <MarketAssetComponent key={`artist-token-${pageIndex}-${index}`} item={item} />),
        )}
      </div>
      {hasNextPage && (
        <Button className="flex items-center justify-center shadow-sm  shadow-black w-1/2 md:w-1/4" onClick={fetchNextPage} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "Loading more..." : "Load More"}
        </Button>
      )}
    </div>
  )
}





// ----------------- Artist -----------------


interface ArtistTypes {
  artist: ReturnType<typeof api.marketplace.market.getPageAssets.useInfiniteQuery>
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  isLoading: boolean
}

const Artist = (
  { artist,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading
  }: ArtistTypes) => {
  return (
    <div className="flex flex-col gap-4 shadow-md rounded-md p-4 bg-white/40 min-h-[35vh]">
      {
        isLoading && <MoreAssetsSkeleton className="grid gap-2 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 p-2" />
      }
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {artist.data?.pages.map((page, pageIndex) =>
          page.nfts.map((item, index) => <PageAssetComponent key={`artist-${pageIndex}-${index}`} item={item} />),
        )}
      </div>
      {hasNextPage && (
        <Button className="shadow-sm shadow-black" onClick={fetchNextPage} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "Loading more..." : "Load More"}
        </Button>
      )}
    </div>
  )
}

const ProductSkeleton = () => (
  <div className="flex gap-4 relative w-full h-full">
    {[0, 1, 2, 3, 4].map((index) => (
      <div
        key={index}
        className="absolute flex-shrink-0 transition-all duration-300 "
        style={{
          transform: `translateX(${index * 220}px) scale(${index === 0 ? 0.95 : 0.8}) translateY(${index === 0 ? -10 : 20}px)`,
          zIndex: index === 0 ? 2 : 1,
          opacity: index === 0 ? 1 : 0.6,
        }}
      >
        <div className="flex-col flex justify-between gap-4 md:pl-8">
          <div className={`relative rounded-xl overflow-hidden ${index === 0 ? 'shadow-lg shadow-gray-700' : 'shadow-md shadow-gray-800'}`}>
            <div className="w-60 h-72 bg-gray-700 animate-pulse rounded-xl" />
            <div className="absolute bottom-2 left-2 right-2 p-4 border-2 border-gray-600 rounded-xl bg-gray-800/50">
              <div className="h-6 w-32 bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
            </div>
          </div>

          <div className="flex flex-col gap-2 md:hidden">
            <div className="flex items-center gap-2">
              <div className="h-6 w-full bg-gray-700 rounded animate-pulse" />
              <div className="h-6 w-16 bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="h-10 w-full bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
    ))}
  </div>
)

const DetailsSkeleton = () => (
  <div className="min-w-[350px] p-6 space-y-6 bg-gray-800/50 rounded-xl border border-gray-700 backdrop-blur-md">
    <div className="space-y-2 border-2 border-gray-700 rounded-md p-4">
      <div className="h-6 w-32 bg-gray-700 rounded animate-pulse" />
      <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
    </div>

    <div className="space-y-4 p-2">
      <div className="flex items-center gap-2">
        <div className="h-6 w-full bg-gray-700 rounded animate-pulse" />
        <div className="h-6 w-16 bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
        <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
      </div>
    </div>

    <div className="h-10 w-full bg-gray-700 rounded animate-pulse" />
  </div>
)

"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { cn } from "~/lib/utils"
import exp from "constants"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/shadcn/ui/card"
import { api } from "~/utils/api"
import { Button } from "~/components/shadcn/ui/button"
import { MoreAssetsSkeleton } from "~/components/common/grid-loading"
import AlbumTab from "~/components/album/album-tab"
import { useMusicTabStore } from "~/components/store/tabs/music-tabs"
import { addrShort } from "~/utils/utils"

// Global Variables
const TABS = ["ALL SONGS", "ALBUMS", "FAVORITES", "RECENTLY ADDED"];

const Music = () => {
    return (
        <div className="flex lg:grid grid-cols-1 w-full lg:grid-cols-[1fr_300px] gap-2 h-[calc(100vh-10.8vh)]">
            {/* Left Section (Scrollable) */}
            <div className="overflow-y-auto scrollbar-hide col-span-1 w-full ">
                <div className="flex flex-col gap-4 w-full ">
                    <MusicCarousel />
                    <div className="w-full">
                        <MusicTabs />
                    </div>
                </div>
            </div>

            {/* Right Sidebar (Fixed, Visible only on lg screens) */}
            <div className="hidden lg:block sticky top-[5.8rem] self-start h-[calc(100vh-11vh)] overflow-y-auto">
                <RightSideItem />
            </div>
        </div>
    );
};

export default Music;

const MusicTabs = () => {
    const { seletedTab, setSelectedTab } = useMusicTabStore()
    return (
        <Card>
            <CardHeader className="w-full rounded-md bg-primary p-2 md:p-4">
                <CardTitle className="flex w-full gap-2 p-0 md:gap-4">
                    {TABS.map((tab) => (
                        <Button
                            key={tab}
                            onClick={() => setSelectedTab(tab)}
                            className={cn(
                                "flex w-1/2 px-2 text-xs md:text-md shadow-sm shadow-black transition-all duration-300 ease-in-out lg:px-10",
                                seletedTab === tab
                                    ? "w-full border-2 font-bold text-[#dbdd2c]"
                                    : " ",
                            )}
                        >
                            {tab}
                        </Button>
                    ))}
                </CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto p-0 scrollbar-hide h-[calc(100vh-20vh)]">
                <div>
                    {seletedTab === "ALL SONGS" && (
                        <div className="">
                        </div>
                    )}
                    {seletedTab === "ALBUMS" && (
                        <div className="">
                            <AlbumTab />
                        </div>
                    )}
                    {seletedTab === "FAVORITES" && (
                        <div className="">
                        </div>
                    )}
                    {seletedTab === "RECENTLY ADDED" && (
                        <div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};



const RightSideItem = () => {
    return (
        <div className="h-full flex flex-col gap-2">
            <Card className="flex-grow">
                <CardHeader>
                    <h1 className="text-2xl font-bold text-center">My Songs</h1>
                </CardHeader>
                <CardContent>
                </CardContent>
            </Card>
            <Card className="h-1/4">
                <CardHeader>
                    <h1 className="text-2xl font-bold text-center">Now Playing</h1>
                </CardHeader>
                <CardContent>
                </CardContent>
            </Card>
        </div>
    )
}

function MusicCarousel() {
    const RecentAddedSong = api.music.song.getRecentSong.useQuery();
    const [currentSlide, setCurrentSlide] = useState(2)

    const goToSlide = (index: number) => {
        setCurrentSlide(index)
    }

    const nextSlide = () => {
        if (RecentAddedSong.data) {
            setCurrentSlide((prev) => (prev === RecentAddedSong.data.length - 1 ? 0 : prev + 1))
        }
    }

    const prevSlide = () => {
        if (RecentAddedSong.data) {
            setCurrentSlide((prev) => (prev === 0 ? RecentAddedSong.data.length - 1 : prev - 1))
        }
    }

    useEffect(() => {
        const interval = setInterval(() => {
            nextSlide()
        }, 4000)

        return () => clearInterval(interval)
    }, [])

    if (RecentAddedSong.isLoading) {
        return (
            <div className="relative w-full h-[calc(100vh-55vh)] sm:h-[calc(100vh-60vh)] overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-4 shadow-lg md:h-[42vh]">
                {/* Background skeleton */}
                <div className="absolute inset-0 z-0 rounded-md bg-gray-800 animate-pulse" />

                {/* Info box skeleton */}
                <div className="absolute hidden md:block border-2 left-8 top-8 z-50 rounded-lg bg-black/40 px-4 py-3 backdrop-blur-sm">
                    <div className="space-y-2">
                        <div className="h-4 w-48 bg-gray-700 rounded animate-pulse" />
                        <div className="h-4 w-40 bg-gray-700 rounded animate-pulse" />
                    </div>
                </div>

                {/* Carousel items skeleton */}
                <div className="relative mx-auto h-[390px] max-w-7xl overflow-hidden pt-8">
                    <div className="relative h-full">
                        {/* Center card */}
                        <div className="absolute left-1/2 z-30 h-[280px] md:h-[320px] w-[260px] md:w-[280px] -translate-x-1/2 -translate-y-5">
                            <div className="h-full w-full rounded-2xl bg-gray-700 animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.15)]">
                                <div className="absolute bottom-2 left-2 right-2 rounded-xl border-2 bg-black/50 p-4">
                                    <div className="h-6 w-3/4 bg-gray-600 rounded mb-2 animate-pulse" />
                                    <div className="h-4 w-1/2 bg-gray-600 rounded animate-pulse" />
                                </div>
                            </div>
                        </div>

                        {/* Left card */}
                        <div className="absolute left-1/2 z-20 h-[230px] md:h-[250px] w-[240px] md:w-[250px] -translate-x-[105%] translate-y-7 md:translate-y-12">
                            <div className="h-full w-full rounded-2xl bg-gray-700 animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.15)]" />
                        </div>

                        {/* Right card */}
                        <div className="absolute left-1/2 z-20 h-[230px] md:h-[250px] w-[240px] md:w-[250px] translate-x-[5%] translate-y-7 md:translate-y-12">
                            <div className="h-full w-full rounded-2xl bg-gray-700 animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.15)]" />
                        </div>

                        {/* Far left card */}
                        <div className="absolute left-1/2 z-10 h-[180px] md:h-[200px] w-[180px] md:w-[200px] -translate-x-[180%] translate-y-20 md:translate-y-24">
                            <div className="h-full w-full rounded-2xl bg-gray-700 animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.15)]" />
                        </div>

                        {/* Far right card */}
                        <div className="absolute left-1/2 z-10 h-[180px] md:h-[200px] w-[180px] md:w-[200px] translate-x-[80%] translate-y-20 md:translate-y-24">
                            <div className="h-full w-full rounded-2xl bg-gray-700 animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.15)]" />
                        </div>
                    </div>

                    {/* Dots skeleton */}
                    <div className="absolute bottom-14 md:bottom-6 left-1/2 z-40 flex -translate-x-1/2 gap-3">
                        {Array.from({ length: 5 }, (_, index: number) => (
                            <div key={index} className="mx-1 h-2 w-2 rounded-full bg-gray-500 animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        )
    }
    if (!RecentAddedSong.data) return null
    return (
        <>
            <div className="relative w-full h-[calc(100vh-55vh)] sm:h-[calc(100vh-60vh)] overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-4 shadow-lg md:h-[42vh]">
                <div className="absolute inset-0 z-0 rounded-md">
                    <Image
                        src={RecentAddedSong.data[currentSlide]?.asset.thumbnail ?? "/placeholder.svg"}
                        alt="Background"
                        fill
                        className="object-cover transition-opacity duration-1000 ease-in-out rounded-md"
                        style={{ filter: "blur(15px)" }}
                    />
                    <div className="absolute inset-0 bg-black/50" />
                </div>
                <div className="absolute hidden md:block border-2 left-8 top-8 z-50 rounded-lg bg-black/40 px-4 py-3 text-white backdrop-blur-sm">
                    <div className="space-y-0.5 ">
                        <p className="text-sm font-medium">
                            NAME : <span className="text-white">{RecentAddedSong.data[currentSlide]?.asset.name}</span>
                        </p>
                        <p className="text-sm font-medium">
                            ARTISTS : <span className="text-gray-400">
                                {RecentAddedSong.data[currentSlide]?.asset.creatorId ?
                                    addrShort(RecentAddedSong.data[currentSlide]?.asset.creatorId, 5) : "ADMIN"}


                            </span>
                        </p>
                    </div>
                </div>

                <div className="relative mx-auto h-[390px] max-w-7xl overflow-hidden pt-8">
                    <div className="relative h-full">
                        {RecentAddedSong.data.map((slide, index) => {
                            const position = (index - currentSlide + RecentAddedSong.data.length) % RecentAddedSong.data.length

                            return (
                                <div
                                    key={slide.id}
                                    className={cn("absolute left-1/2 transform transition-all duration-700 ease-out", {
                                        "z-30 h-[280px] md:h-[320px] w-[260px] md:w-[280px] -translate-x-1/2 -translate-y-5": position === 0,
                                        "z-20 h-[230px] md:h-[250px] w-[240px] md:w-[250px] -translate-x-[105%] translate-y-7  md:translate-y-12 opacity-100":
                                            position === RecentAddedSong.data.length - 1,
                                        "z-20 h-[230px] md:h-[250px]  w-[240px] md:w-[250px] translate-x-[5%] translate-y-7  md:translate-y-12 opacity-100": position === 1,
                                        "z-10 h-[180px] md:h-[200px] w-[180px]  md:w-[200px] -translate-x-[180%] translate-y-20  md:translate-y-24 opacity-100":
                                            position === RecentAddedSong.data.length - 2,
                                        "z-10 h-[180px] md:h-[200px] w-[180px md:w-[200px] translate-x-[80%] translate-y-20 md:translate-y-24 opacity-100": position === 2,
                                        invisible: position > 2 && position < RecentAddedSong.data.length - 2,
                                    })}
                                >
                                    <div className="relative h-full w-full overflow-hidden rounded-2xl shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-transform">
                                        <Image
                                            src={slide.asset.thumbnail ?? "/placeholder.svg"}
                                            alt={slide.asset.name}
                                            fill
                                            className="object-cover"
                                            priority
                                        />
                                        <div className="absolute bottom-2 left-2 right-2 rounded-xl border-2 bg-black/50 p-4 backdrop-blur-sm">
                                            <h3 className="truncate text-xl font-bold text-white">
                                                {slide.asset.name}
                                            </h3>
                                            <p className="text-sm font-bold text-gray-100">
                                                {slide.asset.creatorId ? addrShort(slide.asset.creatorId, 5) : "ADMIN"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="absolute bottom-14 md:bottom-6 left-1/2 z-40 flex -translate-x-1/2 gap-3">
                        {RecentAddedSong.data.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className={`mx-1 h-2 w-2 rounded-full ${index === currentSlide ? "bg-white" : "bg-gray-500"}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </>
    )
}
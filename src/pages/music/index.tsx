"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { cn } from "~/lib/utils"
import exp from "constants"
import { Card, CardContent, CardHeader } from "~/components/shadcn/ui/card"

const slides = [
    {
        id: 1,
        title: "THE EMPTY MACHINE",
        image: "https://picsum.photos/300/300",

    },
    {
        id: 2,
        title: "LOVE ME LIKE YOU DO",
        image: "https://picsum.photos/200/400",
    },
    {
        id: 3,
        title: "MEMORIES",
        image: "https://picsum.photos/200/500",
    },
    {
        id: 4,
        title: "DIE WITH A SMILE",
        image: "https://picsum.photos/200/600",
    },
    {
        id: 5,
        title: "APT",
        image: "https://picsum.photos/300/300",
    },
]


const Music = () => {
    return (
        <div className="flex w-full justify-between gap-2 h-full">
            <MusicCarousel />
            <RightSideItem />

        </div>
    )
}
export default Music

const RightSideItem = () => {
    return (
        <div className="w-[calc(100vw-80vw)]  h-[calc(100vh-10.8vh)] sticky top-[5.8rem] border-none overflow-hidden border-r  hidden transition-[width] duration-500 md:block">
            <Card className="h-[74%]">
                <CardHeader>
                    <h1 className="text-2xl font-bold text-center">My Songs</h1>
                </CardHeader>
                <CardContent>

                </CardContent>
            </Card>
            <Card className="h-[25%] mt-1">
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
    const [currentSlide, setCurrentSlide] = useState(2)

    const goToSlide = (index: number) => {
        setCurrentSlide(index)
    }

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1))
    }

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))
    }

    useEffect(() => {
        const interval = setInterval(() => {
            nextSlide()
        }, 4000)

        return () => clearInterval(interval)
    }, [nextSlide]) // Added nextSlide to dependencies

    return (
        <>
            <div className="relative w-full h-[calc(100vh-62vh)] overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-4 shadow-lg md:h-[42vh]">
                <div className="absolute inset-0 z-0 rounded-md">
                    <Image
                        src={slides[currentSlide]?.image || "/placeholder.svg"}
                        alt="Background"
                        fill
                        className="object-cover transition-opacity duration-1000 ease-in-out  rounded-md"
                        style={{ filter: "blur(15px)" }}
                    />
                    <div className="absolute inset-0 bg-black/50 " />
                </div>
                <div className="absolute left-8 top-8 z-50 rounded-lg bg-black/40 px-4 py-3 text-white backdrop-blur-sm ">
                    <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                            NAME : <span className="text-white">{slides[currentSlide]?.title}</span>
                        </p>
                        <p className="text-sm font-medium">
                            ARTISTS : <span className="text-gray-400">MAROON 5</span>
                        </p>
                        {/* <p className="text-sm font-medium">
                        DURATION : <span className="text-white">3:16 MIN</span>
                    </p> */}
                    </div>
                </div>

                {/* Carousel */}
                <div className="relative mx-auto h-[390px] max-w-7xl overflow-hidden pt-8">
                    <div className="relative h-full">
                        {slides.map((slide, index) => {
                            // Calculate the position relative to current slide
                            const position = (index - currentSlide + slides.length) % slides.length

                            return (
                                <div
                                    key={slide.id}
                                    className={cn("absolute left-1/2 transform transition-all duration-700 ease-out", {
                                        // Center slide (bigger)
                                        "z-30 h-[300px] md:h-[320px] w-[280px] -translate-x-1/2 -translate-y-5": position === 0,
                                        // Left slide
                                        "z-20 h-[230px] md:h-[250px] w-[250px] -translate-x-[105%] translate-y-12 opacity-100 ":
                                            position === slides.length - 1,
                                        // Right slide
                                        "z-20 h-[230px] md:h-[250px] w-[250px] translate-x-[5%] translate-y-12 opacity-100": position === 1,
                                        // Far left slide
                                        "z-10 h-[180px] md:h-[200px] w-[200px] -translate-x-[180%] translate-y-24 opacity-100":
                                            position === slides.length - 2,
                                        // Far right slide
                                        "z-10 h-[180px] md:h-[200px] w-[200px] translate-x-[80%] translate-y-24 opacity-100": position === 2,
                                        // Hidden slides
                                        invisible: position > 2 && position < slides.length - 2,
                                    })}
                                >
                                    <div className="relative h-full w-full overflow-hidden rounded-2xl shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-transform">
                                        <Image
                                            src={slide.image || "/placeholder.svg"}
                                            alt={slide.title}
                                            fill
                                            className="object-cover"
                                            priority
                                        />
                                        <div className="absolute bottom-2 left-2 right-2  rounded-xl  border-2 bg-black/50 p-4 backdrop-blur-sm ">
                                            <h3 className="truncate text-xl font-bold text-white">
                                                {slide.title}
                                            </h3>
                                            <p className="text-sm font-bold text-gray-100">
                                                BANDCOIN
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="absolute bottom-12  md:bottom-6 left-1/2 z-40 flex -translate-x-1/2 gap-3">
                        {slides.map((_, index) => (
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


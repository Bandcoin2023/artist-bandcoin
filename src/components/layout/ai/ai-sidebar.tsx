"use client"

import { useState } from "react"
import { Button } from "~/components/shadcn/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/shadcn/ui/popover"

import { Home, ImageIcon, Video, Music, Text, ShoppingBag } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useCredits } from "~/hooks/use-credits"
import { useGenerationStore } from "~/lib/generation-store"

export default function AISidebar() {
    const [isCreditsOpen, setIsCreditsOpen] = useState(false)
    const { balance, packages, usageStats, isLoading, refetch } = useCredits()
    const { setMediaType } = useGenerationStore() // Use useGenerationStore

    const router = useRouter()
    const path = usePathname()
    const navItems = [
        { icon: Home, label: "Home", active: false, href: "/ai" },
        { icon: ImageIcon, label: "Image", active: false, href: "/ai-generation", mediaType: "image" as const }, // Add mediaType
        { icon: Video, label: "Video", active: false, href: "/ai-generation", mediaType: "video" as const }, // Add mediaType
        { icon: Music, label: "Music", active: false, href: "/artist/studio" },
        { icon: Text, label: "SEO", active: false, href: "/text-generation" },
    ]

    return (
        <aside className="hidden md:absolute left-3 top-2 bottom-2  w-[72px] border-2  md:flex flex-col items-center  gap-2 rounded-lg z-10  bg-sidebar p-1 ">
            {/* Navigation Items */}
            <nav className="flex-1 flex flex-col items-center gap-1 w-full rounded-lg ">
                {navItems.map((item, index) => (
                    <button
                        key={index}
                        className={`relative w-full  flex flex-col items-center gap-1 py-3 transition-colors ${item.href === path
                            ? "text-sidebar-foreground bg-accent rounded-lg shadow-sm shadow-foreground"
                            : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/10"
                            }`}
                        onClick={() => {
                            if (item.mediaType) {
                                setMediaType(item.mediaType)
                            }
                            if (item.href) {
                                router.push(item.href)
                            }
                        }}
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* Credit Counter */}

            {/* Credits Dropdown */}
            <Popover open={isCreditsOpen} onOpenChange={setIsCreditsOpen}>
                <PopoverTrigger asChild>
                    <Button variant="sidebarAccent" className="h-16 w-full text-xs shadow-sm shadow-foreground">
                        <div className="flex items-center justify-center gap-1">
                            <>
                                {" "}
                                <ShoppingBag />
                                <span className="text-xs font-bold">BUY</span>
                            </>
                        </div>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2 bg-popover border-border" side="top" align="start">
                    <div className="space-y-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-left"
                            onClick={() => {
                                router.push("/ai/credits")
                                setIsCreditsOpen(false)
                            }}
                        >
                            View Credits
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-left"
                            onClick={() => {
                                router.push("/ai/history")
                                setIsCreditsOpen(false)
                            }}
                        >
                            History
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </aside>
    )
}

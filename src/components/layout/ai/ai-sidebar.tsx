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
        { icon: Music, label: "Music", active: false, href: "/studio" },
        { icon: Text, label: "SOCIAL", active: false, href: "/text-generation" },
    ]

    return (
        <aside className="hidden md:absolute left-3 top-2 bottom-2 w-[72px] border-2 md:flex flex-col items-center gap-2 rounded-lg z-10 bg-white/10 dark:bg-black/20 backdrop-blur-lg border-white/20 dark:border-white/10 p-1 shadow-lg shadow-black/10">
            {/* Navigation Items */}
            <nav className="flex-1 flex flex-col items-center gap-1 w-full rounded-lg ">
                {navItems.map((item, index) => (
                    <button
                        key={index}
                        className={`relative w-full flex flex-col items-center gap-1 py-3 transition-all backdrop-blur-sm rounded-lg ${item.href === path
                            ? "text-sidebar-foreground bg-accent/80 backdrop-blur-md shadow-accent/50 border border-white/20"
                            : "text-muted-foreground hover:text-sidebar-foreground hover:bg-white/15 dark:hover:bg-white/10 hover:backdrop-blur-sm border border-transparent hover:border-white/20"
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
                    <Button variant="sidebarAccent" className="h-16 w-full text-xs shadow-lg shadow-accent/50 backdrop-blur-lg bg-accent/70 hover:bg-accent/80 border border-white/20 transition-all">
                        <div className="flex items-center justify-center gap-1">
                            <>
                                {" "}
                                <ShoppingBag />
                                <span className="text-xs font-bold">BUY</span>
                            </>
                        </div>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2 bg-white/10 dark:bg-black/30 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-lg shadow-lg shadow-black/20" side="top" align="start">
                    <div className="space-y-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-left hover:bg-white/20 dark:hover:bg-white/10 backdrop-blur-sm transition-all border border-transparent hover:border-white/20"
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
                            className="w-full justify-start text-left hover:bg-white/20 dark:hover:bg-white/10 backdrop-blur-sm transition-all border border-transparent hover:border-white/20"
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

"use client"

import { useState } from "react"
import { Button } from "~/components/shadcn/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/shadcn/ui/popover"

import { Home, Grid3x3, ImageIcon, Video, Sparkles, ChevronDown, Music, Text, Layers, Upload, Infinity, Coins, ShoppingBag } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCredits } from "~/hooks/use-credits"

export default function AISidebar() {
    const [isCreditsOpen, setIsCreditsOpen] = useState(false)
    const { balance, packages, usageStats, isLoading, refetch } = useCredits()

    const router = useRouter()
    const navItems = [
        { icon: Home, label: "Home", active: true, href: "/ai" },
        { icon: ImageIcon, label: "Image", active: false, href: "/ai-generation" },
        { icon: Video, label: "Video", active: false, href: "/ai-generation" },
        { icon: Music, label: "Music", active: false, href: "/artist/studio" },
        { icon: Text, label: "Text", active: false, href: "/text-generation" },
    ]

    return (
        <aside className="hidden md:absolute left-2 top-2 bottom-2  w-20 border-2  md:flex flex-col items-center  gap-6 rounded-lg z-10 bg-background/80 backdrop-blur-sm">
            {/* Navigation Items */}
            <nav className="flex-1 flex flex-col items-center gap-1 w-full rounded-lg ">
                {navItems.map((item, index) => (
                    <button
                        key={index}
                        className={`relative w-full  flex flex-col items-center gap-1 py-3 transition-colors ${item.active ? "text-sidebar-foreground bg-accent rounded-lg shadow-sm shadow-foreground"
                            : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/10"
                            }`}
                        onClick={() => {
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
                    <Button
                        variant="sidebarAccent"
                        className="h-16 w-full text-xs shadow-sm shadow-foreground">
                        <div className="flex items-center justify-center gap-2">
                            {
                                balance > 0 ?
                                    <>
                                        <Coins />
                                        <span className="text-xs font-bold">{balance}</span>
                                    </>
                                    : <> <ShoppingBag />
                                        <span className="text-xs font-bold">BUY</span></>
                            }
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

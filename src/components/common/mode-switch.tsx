"use client"

import { motion } from "framer-motion"
import { Paintbrush, User } from "lucide-react"
import { useState } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/shadcn/ui/tooltip"

import { Mode, useModeStore } from "../store/mode-store"

export function ModeSwitch() {
    const { selectedMode, toggleSelectedMode } = useModeStore()
    const [isHovering, setIsHovering] = useState(false)

    const isCreator = selectedMode === Mode.Creator
    const router = useRouter()
    return (
        <TooltipProvider>
            <div className="inline-flex flex-col  rounded-md p-1 shadow-sm shadow-black bg-gray-100/50 backdrop-blur-sm ">
                {/* User Mode Button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={() => {
                                isCreator && toggleSelectedMode()
                                router.push("/artist/home")
                            }}
                            className={cn(
                                "relative rounded-md transition-colors ",
                                "flex items-center justify-center",
                                "w-8 h-8", // Fixed square size
                                !isCreator && "text-white animate-bounce ",
                                isCreator && "text-gray-600 hover:text-gray-900 "
                            )}
                            disabled={!isCreator}
                        >
                            <VisuallyHidden>Switch to User mode</VisuallyHidden>
                            {!isCreator && (
                                <motion.div
                                    layoutId="activeBackgroundIcon"
                                    className="absolute inset-0 bg-blue-500 rounded-md "
                                    transition={{
                                        type: "spring",
                                        bounce: 0.15,
                                        duration: 0.5
                                    }}
                                />
                            )}
                            <User className="relative w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent
                        side="right"
                        className="font-medium"
                        sideOffset={8}
                    >
                        {!isCreator ? "User Mode" : "Switch to User Mode"}
                    </TooltipContent>
                </Tooltip>

                {/* Creator Mode Button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={() => {
                                !isCreator && toggleSelectedMode()
                                router.push("/artist/profile")
                            }}
                            className={cn(
                                "relative rounded-md transition-colors ",
                                "flex items-center justify-center",
                                "w-8 h-8", // Fixed square size
                                isCreator && "text-white animate-bounce",
                                !isCreator && "text-gray-600 hover:text-gray-900"
                            )}
                            disabled={isCreator}
                        >
                            <VisuallyHidden>Switch to Creator mode</VisuallyHidden>
                            {isCreator && (
                                <motion.div
                                    layoutId="activeBackgroundIcon"
                                    className="absolute inset-0 bg-purple-500 rounded-md"
                                    transition={{
                                        type: "spring",
                                        bounce: 0.15,
                                        duration: 0.5
                                    }}
                                />
                            )}
                            <Paintbrush className="relative w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent
                        side="right"
                        className="font-medium"
                        sideOffset={8}
                    >
                        {isCreator ? "Creator Mode" : "Switch to Creator Mode"}
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    )
}

import { type HTMLAttributes, forwardRef } from "react"
import { cn } from "~/lib/utils"
import { useRouter } from "next/navigation"

const VisuallyHidden = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(({ className, ...props }, ref) => {
    return (
        <span
            ref={ref}
            className={cn(
                "absolute h-px w-px p-0 overflow-hidden whitespace-nowrap border-0",
                "clip-[rect(0px,0px,0px,0px)]",
                className,
            )}
            {...props}
        />
    )
})
VisuallyHidden.displayName = "VisuallyHidden"

export { VisuallyHidden }

"use client"

import React from "react"

import { forwardRef } from "react"
import { Sparkles } from "lucide-react"
import { cn } from "~/lib/utils"

interface NeonInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onFocus?: () => void
    isExpanded?: boolean
    children?: React.ReactNode
}

const NeonInput = forwardRef<HTMLInputElement, NeonInputProps>(({ className, onFocus, isExpanded, children, ...props }, ref) => {
    return (
        <div className="relative w-full">
            {/* Rotating border effect */}
            <div className={cn("absolute -inset-[2px] rounded-2xl overflow-hidden transition-all duration-1000 ")}>
                <div className="absolute inset-0 animate-spin-slow  opacity-75">
                    <div className="h-full w-full bg-gradient-to-r from-accent via-accent to-primary blur-sm" />
                </div>
            </div>

            {/* Input container */}
            <div className={cn("relative bg-background backdrop-blur-xl rounded-2xl border  border-accent transition-all duration-1000")}>
                <div className="flex items-center gap-3 px-6 py-4">
                    <Sparkles className="w-5 h-5  flex-shrink-0 animate-pulse" />
                    <input
                        ref={ref}
                        type="text"
                        className={cn(
                            "flex-1 bg-transparent border-0 text-foreground placeholder:text-zinc-500 focus-visible:outline-none text-lg",
                            className,
                        )}
                        onFocus={onFocus}
                        {...props}
                    />
                </div>
                <div className={cn("overflow-hidden transition-all duration-600 ease-in-out", isExpanded ? "max-h-96 opacity-100 px-6 pb-6" : "max-h-0 opacity-0")}>
                    {children}
                </div>
            </div>
        </div>
    )
})

NeonInput.displayName = "NeonInput"

export { NeonInput }

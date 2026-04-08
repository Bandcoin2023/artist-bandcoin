"use client"

import { Button } from "~/components/shadcn/ui/button"
import { Glass } from "~/components/glass/glass"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/shadcn/ui/tooltip"
import { cn } from "~/lib/utils"
import {
  EyeIcon,
  MonitorIcon,
  MousePointerSquareDashedIcon,
  SmartphoneIcon,
  UnfoldHorizontalIcon,
} from "lucide-react"
import Link from "next/link"

export type EditorViewportType = "responsive" | "desktop" | "mobile"

type EditorShellHeaderProps = {
  isSelectionMode: boolean
  onToggleSelectionMode: () => void
  viewportType: EditorViewportType
  onViewportTypeChange: (viewportType: EditorViewportType) => void
  isPreviewMode: boolean
  onTogglePreviewMode: () => void
}

export function EditorShellHeader({
  isSelectionMode,
  onToggleSelectionMode,
  viewportType,
  onViewportTypeChange,
  isPreviewMode,
  onTogglePreviewMode,
}: EditorShellHeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-12 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex items-center px-2 md:px-4">
      <TooltipProvider>
        <div className="w-full flex h-full items-center justify-between gap-3 overflow-x-auto">
          <Button
            asChild
            variant="ghost"
            className="h-8 rounded-lg border border-black/10 bg-[#f8f6f1]/80 text-black/85 hover:bg-[#f8f6f1]"
          >
            <Link href="/profile">Discard</Link>
          </Button>

          <div className="flex items-center justify-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "h-9 w-9 rounded-lg border border-black/10 bg-[#f8f6f1]/65 text-black/65 hover:bg-[#f8f6f1]/85 hover:text-black/85",
                    isSelectionMode &&
                      "border-black/35 bg-white text-foreground ring-1 ring-black/20",
                  )}
                  onClick={onToggleSelectionMode}
                >
                  <MousePointerSquareDashedIcon />
                  <span className="sr-only">Enable selection</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Enable selection</TooltipContent>
            </Tooltip>

            <div className="relative overflow-hidden rounded-xl border border-black/10">
              <Glass
                className={{
                  root: "pointer-events-none absolute inset-0 z-0 rounded-xl *:rounded-xl",
                  tint: "bg-[#f8f6f1]/78",
                  effect:
                    "backdrop-blur-[3px] bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.45),transparent_45%)]",
                  shine:
                    "shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.9),_inset_-1px_-1px_1px_1px_rgba(255,255,255,0.65)]",
                }}
              />
              <div className="relative z-20 flex items-center gap-0.5 p-[3px]">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "h-7 w-7 rounded-md text-black/80 hover:bg-[#f8f6f1]",
                        viewportType === "responsive" &&
                          "text-foreground bg-[#f8f6f1]",
                      )}
                      onClick={() => onViewportTypeChange("responsive")}
                    >
                      <UnfoldHorizontalIcon />
                      <span className="sr-only">Responsive</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Responsive</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "h-7 w-7 rounded-md text-black/80 hover:bg-[#f8f6f1]",
                        viewportType === "desktop" && "text-foreground bg-[#f8f6f1]",
                      )}
                      onClick={() => onViewportTypeChange("desktop")}
                    >
                      <MonitorIcon />
                      <span className="sr-only">Desktop</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Desktop</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "h-7 w-7 rounded-md text-black/80 hover:bg-[#f8f6f1]",
                        viewportType === "mobile" && "text-foreground bg-[#f8f6f1]",
                      )}
                      onClick={() => onViewportTypeChange("mobile")}
                    >
                      <SmartphoneIcon />
                      <span className="sr-only">Mobile</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Mobile</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "h-8 w-8 rounded-lg border border-black/10 bg-[#f8f6f1]/80 text-black/85 hover:bg-[#f8f6f1]",
                    isPreviewMode && "text-foreground bg-[#f8f6f1]",
                  )}
                  onClick={onTogglePreviewMode}
                >
                  <EyeIcon />
                  <span className="sr-only">Preview</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Preview Site</TooltipContent>
            </Tooltip>

            <Button className="h-8 bg-black text-white hover:bg-black/85" disabled>
              Save
            </Button>
          </div>
        </div>
      </TooltipProvider>
    </header>
  )
}

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
  canSave: boolean
  isSaving: boolean
  onSave: () => void
}

export function EditorShellHeader({
  isSelectionMode,
  onToggleSelectionMode,
  viewportType,
  onViewportTypeChange,
  isPreviewMode,
  onTogglePreviewMode,
  canSave,
  isSaving,
  onSave,
}: EditorShellHeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-12 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex items-center px-2 md:px-4">
      <TooltipProvider>
        <div className="w-full flex h-full items-center justify-between gap-3 overflow-x-auto">
          <Button
            asChild
            variant="ghost"
            className="h-8 rounded-lg border border-border bg-background/85 text-foreground hover:bg-muted"
          >
            <Link href="/profile">Discard</Link>
          </Button>

          <div className="flex items-center justify-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "h-9 w-9 rounded-lg border border-border bg-background/75 text-foreground/70 hover:bg-muted hover:text-foreground",
                    isSelectionMode &&
                      "border-ring bg-background text-foreground ring-1 ring-ring/40",
                  )}
                  onClick={onToggleSelectionMode}
                >
                  <MousePointerSquareDashedIcon />
                  <span className="sr-only">Enable selection</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Enable selection</TooltipContent>
            </Tooltip>

            <div className="relative overflow-hidden rounded-xl border border-border">
              <Glass
                className={{
                  root: "pointer-events-none absolute inset-0 z-0 rounded-xl *:rounded-xl",
                  tint: "bg-white/70 dark:bg-slate-900/70",
                  effect:
                    "backdrop-blur-[3px] bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.35),transparent_45%)] dark:bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.08),transparent_45%)]",
                  shine:
                    "shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.85),_inset_-1px_-1px_1px_1px_rgba(255,255,255,0.55)] dark:shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.18),_inset_-1px_-1px_1px_1px_rgba(255,255,255,0.08)]",
                }}
              />
              <div className="relative z-20 flex items-center gap-0.5 p-[3px]">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "h-7 w-7 rounded-md text-foreground/75 hover:bg-background/80 hover:text-foreground dark:hover:bg-muted/60",
                        viewportType === "responsive" &&
                          "text-foreground bg-background dark:bg-background",
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
                        "h-7 w-7 rounded-md text-foreground/75 hover:bg-background/80 hover:text-foreground dark:hover:bg-muted/60",
                        viewportType === "desktop" && "text-foreground bg-background dark:bg-background",
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
                        "h-7 w-7 rounded-md text-foreground/75 hover:bg-background/80 hover:text-foreground dark:hover:bg-muted/60",
                        viewportType === "mobile" && "text-foreground bg-background dark:bg-background",
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
                    "h-8 w-8 rounded-lg border border-border bg-background/85 text-foreground/80 hover:bg-muted hover:text-foreground",
                    isPreviewMode && "text-foreground bg-background dark:bg-background",
                  )}
                  onClick={onTogglePreviewMode}
                >
                  <EyeIcon />
                  <span className="sr-only">Preview</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Preview Site</TooltipContent>
            </Tooltip>

            <Button
              className="h-8 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!canSave || isSaving}
              onClick={onSave}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </TooltipProvider>
    </header>
  )
}

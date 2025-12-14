"use client"

import { useState } from "react"
import { ImageIcon, Video, Settings2 } from "lucide-react"
import { Button } from "~/components/shadcn/ui/button"
import { Tabs, TabsList, TabsTrigger } from "~/components/shadcn/ui/tabs"
import { GenerationSidebar } from "~/components/ai-generation/sidebar/generation-sidebar"
import { MainArea } from "~/components/ai-generation/main/main-area"
import { useGenerationStore } from "~/lib/generation-store"
import { Sheet, SheetContent, SheetTrigger } from "~/components/shadcn/ui/sheet"
import { AppHeader } from "./app-header"

export function GenerationPanel() {
  const { mediaType, setMediaType } = useGenerationStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentView, setCurrentView] = useState<"generate" | "history" | "credits">("generate")

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">

      {/* Mobile Media Type Selector */}
      <div className="lg:hidden border-b border-border bg-card p-3">

        <div className="flex items-center justify-between mb-2">

          <Tabs value={mediaType} onValueChange={(v) => setMediaType(v as "image" | "video")} className="flex-1">
            <TabsList className="w-full grid grid-cols-2 h-10">
              <TabsTrigger value="image" className="gap-2">
                <ImageIcon className="h-4 w-4" />
                Image
              </TabsTrigger>
              <TabsTrigger value="video" className="gap-2">
                <Video className="h-4 w-4" />
                Video
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Mobile Settings Button */}
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="ml-2 bg-transparent">
                <Settings2 className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] p-0 w-full">
              <div className="h-full overflow-y-auto w-full">
                <GenerationSidebar />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">

          <GenerationSidebar />
        </div>

        {/* Main Generation Area */}
        <MainArea />
      </div>
    </div>
  )
}

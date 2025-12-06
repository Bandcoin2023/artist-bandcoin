"use client"

import { Tabs, TabsList, TabsTrigger } from "~/components/shadcn/ui/tabs"
import { Sparkles, FileText, Share2, ArrowLeft } from "lucide-react"
import { useContentGenerator } from "~/hooks/use-content-generator"
import type { ContentMode } from "~/types/content-genreation-types"
import { Button } from "../shadcn/ui/button"

export function Header() {
  const { contentMode, setContentMode } = useContentGenerator()

  return (
    <div className="p-5 border-b border-border">
      <div className="flex items-center gap-3 mb-5">

        <div>
          <Button>
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <Tabs value={contentMode} onValueChange={(v) => setContentMode(v as ContentMode)} className="w-full">
        <TabsList className="w-full h-11  p-1">
          <TabsTrigger
            value="seo"
            className="flex-1 h-9 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <FileText className="h-4 w-4" />
            SEO Content
          </TabsTrigger>
          <TabsTrigger
            value="social"
            className="flex-1 h-9 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Share2 className="h-4 w-4" />
            Social Media
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}

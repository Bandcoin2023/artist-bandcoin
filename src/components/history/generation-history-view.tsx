"use client"

import { useState } from "react"
import { ImageIcon, Video, Download, Trash2, Clock } from "lucide-react"
import { Card } from "~/components/shadcn/ui/card"
import { Button } from "~/components/shadcn/ui/button"
import { Badge } from "~/components/shadcn/ui/badge"
import { Checkbox } from "~/components/shadcn/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/shadcn/ui/select"
import { Input } from "~/components/shadcn/ui/input"
import { Skeleton } from "~/components/shadcn/ui/skeleton"

import { useToast } from "~/hooks/use-toast"
import { api } from "~/utils/api"

export function GenerationHistoryView() {
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [filter, setFilter] = useState<"all" | "image" | "video">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()

  const { data, isLoading } = api.ai.getAllAiContent.useQuery({})
  const deleteMutation = api.ai.deleteAiContent.useMutation({
    onSuccess: () => {
      toast({
        title: "Deleted successfully",
        description: "Generation has been removed",
      })
      setSelectedItems([])
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-video w-full" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  const generations = data?.aiContents ?? []

  const filteredGenerations = generations.filter((gen) => {
    const matchesFilter = filter === "all" || gen.contentType.toLowerCase() === filter
    const matchesSearch = gen.prompt.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const toggleSelection = (id: string) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate({
      ids: [Number(id)],
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search generations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images Only</SelectItem>
              <SelectItem value="video">Videos Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Actions Bar */}
      {selectedItems.length > 0 && (
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedItems.length} item{selectedItems.length > 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent text-destructive"
                onClick={() => selectedItems.forEach(handleDelete)}
                disabled={deleteMutation.isLoading}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedItems([])}>
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Generation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGenerations.map((gen) => (
          <Card key={gen.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative aspect-video bg-muted">
              <img src={gen.contentUrl || "/placeholder.svg"} alt={gen.prompt} className="w-full h-full object-cover" />

              {/* Selection Checkbox */}
              <div className="absolute top-2 left-2">
                <Checkbox
                  checked={selectedItems.includes(gen.id)}
                  onCheckedChange={() => toggleSelection(gen.id)}
                  className="bg-white/90 border-white"
                />
              </div>

              {/* Type Badge */}
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="gap-1">
                  {gen.contentType === "IMAGE" ? <ImageIcon className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                  {gen.contentType}
                </Badge>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-sm line-clamp-2 font-medium">{gen.prompt}</p>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(gen.createdAt).toLocaleDateString()}
                </span>
                <Badge variant="outline" className="text-xs">
                  {gen.model}
                </Badge>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent text-destructive hover:text-destructive"
                  onClick={() => handleDelete(gen.id)}
                  disabled={deleteMutation.isLoading}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredGenerations.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium mb-2">No generations found</p>
            <p className="text-sm">Try adjusting your filters or create your first AI generation</p>
          </div>
        </Card>
      )}
    </div>
  )
}

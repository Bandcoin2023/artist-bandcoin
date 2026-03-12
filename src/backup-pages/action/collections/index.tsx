"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Grid3X3, List, Filter, Trophy, Package, ChevronDown, ChevronUp, Crown, MapPin, Zap, Clock, Navigation } from 'lucide-react'
import { Button } from "~/components/shadcn/ui/button"
import { Input } from "~/components/shadcn/ui/input"
import { Card, CardContent } from "~/components/shadcn/ui/card"
import { Badge } from "~/components/shadcn/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/shadcn/ui/select"
import { api } from "~/utils/api"
import Image from "next/image"
import Loading from "~/components/common/loading"
import { useRouter } from "next/router"
import { formatDistanceToNow } from "date-fns"
import type { ConsumedLocation } from "~/types/game/location"

type ViewMode = 'grid' | 'list'
type SortOption = 'recent' | 'name' | 'brand'
type ContentFilter = 'all' | 'posts' | 'locations'

export default function CollectionsPage() {
    const [searchQuery, setSearchQuery] = useState("")
    const [viewMode, setViewMode] = useState<ViewMode>('grid')
    const [sortBy, setSortBy] = useState<SortOption>('recent')
    const [contentFilter, setContentFilter] = useState<ContentFilter>('all')
    const [showFilters, setShowFilters] = useState(false)
    const [showHeader, setShowHeader] = useState(true)
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
    const router = useRouter()

    const postsRes = api.maps.pin.getAllCollectedPosts.useQuery()
    const locationsRes = api.maps.pin.getConsumedLocations.useQuery()
    const posts = postsRes.data ?? []
    const locations = locationsRes.data ?? []

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => console.log("Location access denied")
            )
        }
    }, [])

    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 6371
        const dLat = (lat2 - lat1) * Math.PI / 180
        const dLng = (lng2 - lng1) * Math.PI / 180
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }

    // Normalise posts
    const normalisedPosts = posts.map((item) => ({
        id: item.id,
        type: 'post' as const,
        title: item.postGroup.heading,
        subtitle: item.postGroup.heading,
        description: item.postGroup.description ?? "",
        image: item.postGroup.medias.find((m) => m.type === "IMAGE")?.url ?? "https://bandcoin.io/images/logo.png",
        creatorName: item.postGroup.creator.name,
        collectedAt: new Date(item.collectedAt),
        subscription: item.postGroup.subscription ?? null,
        navigateTo: `/action/collections/post/${item.postId}`,
        lat: null as number | null,
        lng: null as number | null,
        limitRemaining: null as number | null,
        collected: true,
    }))

    // Normalise locations
    const normalisedLocations = locations.map((loc: ConsumedLocation) => ({
        id: loc.id,
        type: 'location' as const,
        title: loc.title,
        subtitle: loc.brand_name,
        description: loc.description,
        image: loc.image_url ?? null,
        creatorName: loc.brand_name,
        collectedAt: new Date(),
        subscription: null,
        navigateTo: `/action/collections/${loc.id}`,
        lat: loc.lat as number | null,
        lng: loc.lng as number | null,
        limitRemaining: loc.collection_limit_remaining as number | null,
        collected: loc.collected,
    }))

    // Merge based on content filter
    const merged = [
        ...(contentFilter !== 'locations' ? normalisedPosts : []),
        ...(contentFilter !== 'posts' ? normalisedLocations : []),
    ]

    const filtered = merged
        .filter((item) => {
            const q = searchQuery.toLowerCase()
            return (
                item.title.toLowerCase().includes(q) ||
                item.subtitle.toLowerCase().includes(q) ||
                item.description.toLowerCase().includes(q) ||
                item.creatorName.toLowerCase().includes(q)
            )
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'name': return a.title.localeCompare(b.title)
                case 'brand': return a.creatorName.localeCompare(b.creatorName)
                default: return b.collectedAt.getTime() - a.collectedAt.getTime()
            }
        })

    if (postsRes.isLoading || locationsRes.isLoading) return <Loading />

    const collectedLocations = locations.filter((l: ConsumedLocation) => l.collected).length

    return (
        <div className="min-h-screen bg-background">

            {/* Header */}
            <AnimatePresence>
                {showHeader && (
                    <motion.div
                        className="bg-background/95 backdrop-blur-xl border-b border-border shadow-sm"
                        initial={{ opacity: 0, y: -100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -100 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="px-5 pt-4 pb-5 space-y-4">

                            {/* Title */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-foreground">Collections</h1>
                                    <p className="text-muted-foreground text-sm">
                                        {posts.length} post{posts.length !== 1 ? 's' : ''} · {collectedLocations}/{locations.length} locations
                                    </p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setShowHeader(false)} className="p-2 rounded-xl">
                                    <ChevronUp className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Content filter tabs */}
                            <div className="flex gap-2">
                                {([
                                    { key: 'all', label: `All (${posts.length + locations.length})` },
                                    { key: 'posts', label: `Posts (${posts.length})` },
                                    { key: 'locations', label: `Locations (${locations.length})` },
                                ] as { key: ContentFilter; label: string }[]).map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => setContentFilter(key)}
                                        className={`px-3 py-1.5 rounded-2xl text-xs font-semibold transition-colors ${contentFilter === key
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    placeholder="Search title, creator..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-11 h-11 bg-muted border-0 rounded-2xl text-sm"
                                />
                            </div>

                            {/* View + sort controls */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Button variant={viewMode === 'grid' ? "default" : "outline"} size="sm" onClick={() => setViewMode('grid')} className="h-9 w-9 p-0 rounded-xl">
                                        <Grid3X3 className="w-4 h-4" />
                                    </Button>
                                    <Button variant={viewMode === 'list' ? "default" : "outline"} size="sm" onClick={() => setViewMode('list')} className="h-9 w-9 p-0 rounded-xl">
                                        <List className="w-4 h-4" />
                                    </Button>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="h-9 px-3 rounded-xl gap-1.5">
                                    <Filter className="w-3.5 h-3.5" />
                                    Sort
                                    {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </Button>
                            </div>

                            {/* Sort panel */}
                            <AnimatePresence>
                                {showFilters && (
                                    <motion.div
                                        className="p-4 bg-card border border-border rounded-2xl"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Sort by</label>
                                        <Select value={sortBy} onValueChange={(v: SortOption) => setSortBy(v)}>
                                            <SelectTrigger className="h-10 rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="recent">Most Recent</SelectItem>
                                                <SelectItem value="name">Title A–Z</SelectItem>
                                                <SelectItem value="brand">Creator A–Z</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating toggle */}
            {!showHeader && (
                <motion.div className="fixed top-4 right-4 z-50" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                    <Button onClick={() => setShowHeader(true)} size="sm" variant="outline" className="w-10 h-10 rounded-full p-0 bg-background/90 backdrop-blur-xl shadow-lg">
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </motion.div>
            )}

            {/* Content */}
            <div className={`px-5 py-5 pb-32 ${!showHeader ? 'pt-16' : ''}`}>
                <AnimatePresence mode="wait">

                    {/* Grid */}
                    {viewMode === 'grid' ? (
                        <motion.div key="grid" className="grid grid-cols-2 gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {filtered.map((item, index) => (
                                <motion.div
                                    key={`${item.type}-${item.id}`}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.04 * index }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => router.push(item.navigateTo)}
                                >
                                    <Card className="overflow-hidden bg-card border border-border cursor-pointer hover:shadow-md transition-shadow h-full">
                                        <CardContent className="p-0">
                                            <div className="aspect-square bg-muted relative overflow-hidden">
                                                <Image fill alt={item.title} src={item.image ?? "/placeholder.svg"} className="object-cover" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                                                {/* Type badge — top left */}
                                                <div className="absolute top-2 left-2">
                                                    {item.type === 'post' ? (
                                                        <Badge className="bg-primary/25 text-primary border border-primary/30 text-xs px-2 py-0.5 gap-1 backdrop-blur-sm">
                                                            <Package className="w-2.5 h-2.5" />
                                                            Post
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-secondary/25 text-secondary border border-secondary/30 text-xs px-2 py-0.5 gap-1 backdrop-blur-sm">
                                                            <MapPin className="w-2.5 h-2.5" />
                                                            Pin
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Status badge — top right */}
                                                <div className="absolute top-2 right-2">
                                                    {item.type === 'post' || item.collected ? (
                                                        <Badge className="bg-emerald-500/25 text-emerald-500 border border-emerald-500/30 text-xs px-2 py-0.5 gap-1 backdrop-blur-sm">
                                                            <Trophy className="w-2.5 h-2.5" />
                                                            Owned
                                                        </Badge>
                                                    ) : item.limitRemaining !== null && item.limitRemaining > 0 ? (
                                                        <Badge className="bg-primary/25 text-primary border border-primary/30 text-xs px-2 py-0.5 gap-1 backdrop-blur-sm">
                                                            <Zap className="w-2.5 h-2.5" />
                                                            {item.limitRemaining}
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-muted text-muted-foreground border border-border text-xs px-2 py-0.5 gap-1 backdrop-blur-sm">
                                                            <Clock className="w-2.5 h-2.5" />
                                                            Expired
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Distance — bottom right (locations only) */}
                                                {item.type === 'location' && userLocation && item.lat && item.lng && (
                                                    <div className="absolute bottom-2 right-2">
                                                        <Badge className="bg-black/40 text-white border-0 backdrop-blur-sm text-xs px-2 py-0.5 gap-1">
                                                            <Navigation className="w-2.5 h-2.5" />
                                                            {calculateDistance(userLocation.lat, userLocation.lng, item.lat, item.lng).toFixed(1)}km
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-3 space-y-1.5">
                                                <h3 className="font-semibold text-foreground text-sm line-clamp-1">{item.title}</h3>
                                                <p className="text-xs text-muted-foreground line-clamp-1">{item.subtitle}</p>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-3.5 h-3.5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                                        <span className="text-primary font-bold" style={{ fontSize: 7 }}>{item.creatorName.charAt(0)}</span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground truncate">{item.creatorName}</span>
                                                </div>
                                                {item.subscription && (
                                                    <Badge className="bg-secondary/15 text-secondary border border-secondary/20 text-xs gap-1 px-2 py-0.5">
                                                        <Crown className="w-2.5 h-2.5" />
                                                        {item.subscription.name}
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>

                    ) : (
                        // List view
                        <motion.div key="list" className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {filtered.map((item, index) => (
                                <motion.div
                                    key={`${item.type}-${item.id}`}
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.04 * index }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={() => router.push(item.navigateTo)}
                                >
                                    <Card className="overflow-hidden bg-card border border-border cursor-pointer hover:shadow-md transition-shadow">
                                        <CardContent className="p-0">
                                            <div className="flex">
                                                {/* Thumbnail */}
                                                <div className="w-20 h-20 bg-muted relative overflow-hidden shrink-0">
                                                    <Image fill alt={item.title} src={item.image ?? "/placeholder.svg"} className="object-cover" />
                                                    {/* Colour strip indicating type */}
                                                    <div className={`absolute bottom-0 left-0 right-0 h-1 ${item.type === 'post' ? 'bg-primary' : 'bg-secondary'}`} />
                                                </div>

                                                <div className="flex-1 p-3 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <div className="min-w-0">
                                                            <h3 className="font-semibold text-foreground text-sm line-clamp-1">{item.title}</h3>
                                                            <p className="text-xs text-muted-foreground line-clamp-1">{item.subtitle}</p>
                                                        </div>
                                                        <div className="flex flex-col gap-1 items-end shrink-0">
                                                            {item.type === 'post' ? (
                                                                <Badge className="bg-primary/15 text-primary border border-primary/20 text-xs px-2 py-0.5 gap-1">
                                                                    <Package className="w-2.5 h-2.5" /> Post
                                                                </Badge>
                                                            ) : (
                                                                <Badge className="bg-secondary/15 text-secondary border border-secondary/20 text-xs px-2 py-0.5 gap-1">
                                                                    <MapPin className="w-2.5 h-2.5" /> Pin
                                                                </Badge>
                                                            )}
                                                            {(item.type === 'post' || item.collected) && (
                                                                <Badge className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 text-xs px-2 py-0.5 gap-1">
                                                                    <Trophy className="w-2.5 h-2.5" /> Owned
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{item.description}</p>

                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-3.5 h-3.5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                                                <span className="text-primary font-bold" style={{ fontSize: 7 }}>{item.creatorName.charAt(0)}</span>
                                                            </div>
                                                            <span className="text-xs text-muted-foreground truncate max-w-[80px]">{item.creatorName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {item.type === 'location' && userLocation && item.lat && item.lng && (
                                                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                                                    <Navigation className="w-3 h-3" />
                                                                    {calculateDistance(userLocation.lat, userLocation.lng, item.lat, item.lng).toFixed(1)}km
                                                                </span>
                                                            )}
                                                            <span className="text-xs text-muted-foreground">
                                                                {formatDistanceToNow(item.collectedAt, { addSuffix: true })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Empty state */}
                {filtered.length === 0 && (
                    <motion.div className="text-center py-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="w-16 h-16 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-4">
                            <Package className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-1">
                            {searchQuery ? "No results found" : "Nothing collected yet"}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            {searchQuery ? "Try adjusting your search" : "Collect posts and location pins to see them here"}
                        </p>
                        {searchQuery && (
                            <Button variant="outline" onClick={() => setSearchQuery("")} className="rounded-xl">
                                Clear Search
                            </Button>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    )
}
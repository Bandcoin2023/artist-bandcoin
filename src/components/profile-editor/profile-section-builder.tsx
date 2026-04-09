"use client"

import { Fragment, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react"
import { motion } from "motion/react"
import {
  CheckCircle2Icon,
  DollarSignIcon,
  GripVerticalIcon,
  Grid3X3Icon,
  ImageIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react"
import { useDrag, useDrop, DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import type { Layout } from "react-resizable-panels"
import { Glass } from "~/components/glass/glass"
import { Button } from "~/components/shadcn/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/shadcn/ui/dialog"
import { useProfileEditorStore } from "~/components/profile-editor/store/editor-store"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/shadcn/ui/select"
import { Switch } from "~/components/shadcn/ui/switch"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/shadcn/ui/popover"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/shadcn/ui/resizable"
import { cn } from "~/lib/utils"
import { PLATFORM_ASSET } from "~/lib/stellar/constant"
import { addrShort } from "~/utils/utils"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/shadcn/ui/avatar"

export type SectionLayoutItem = {
  id: string
  widthPct: number
  order: number
  kind: "container"
  hideContainerFrame?: boolean
  content?: SectionContainerContent | null
}

export type SectionLayoutSection = {
  id: string
  order: number
  direction: "row" | "column"
  hideSectionFrame?: boolean
  marginTop?: number
  marginBottom?: number
  containerGap?: number
  items: SectionLayoutItem[]
}

export type SectionLayout = {
  version: 2
  sections: SectionLayoutSection[]
}

export type SectionContainerContent =
  | {
      type: "subscription"
      packageOrder: number[]
      gradientMode?: boolean
    }
  | {
      type: "stats"
      metricOrder: StatsMetricKey[]
      showIcons?: boolean
    }
  | {
      type: "nft_collection"
      nftOrder: number[]
      showCreator?: boolean
      showPrice?: boolean
      maxItems?: number
    }
  | {
      type: "social_posts"
      postOrder: number[]
      filter?: "all" | "public" | "locked"
      showMedia?: boolean
      showEngagement?: boolean
      maxItems?: number
    }

export type BuilderSubscriptionPackage = {
  id: number
  name: string
  price: number
  description: string
  features: string[]
  color: string
  popular: boolean
  isActive: boolean
}

export type BuilderStatsData = {
  followers: number
  posts: number
  nfts: number
  revenue: number
}

export type BuilderNftCard = {
  id: number
  assetId: number
  name: string
  thumbnail: string | null
  creatorId: string | null
  price: number | null
  priceUSD: number | null
  percentage: number | null
  mediaType: string | null
}

export type BuilderSocialPost = {
  id: number
  heading: string | null
  content: string
  createdAt: string
  creatorId: string
  creatorName: string
  creatorProfileUrl: string | null
  locked: boolean
  likeCount: number
  commentCount: number
  medias: Array<{
    id: number
    url: string
    type: string
  }>
}

type StatsMetricKey = "followers" | "posts" | "nfts" | "revenue"

const STATS_ITEM_TYPE = "PROFILE_STATS_ITEM"
const NFT_COLLECTION_ITEM_TYPE = "PROFILE_NFT_COLLECTION_ITEM"
const SOCIAL_POST_ITEM_TYPE = "PROFILE_SOCIAL_POST_ITEM"
const DEFAULT_STATS_METRIC_ORDER: StatsMetricKey[] = [
  "followers",
  "posts",
  "nfts",
  "revenue",
]
const DEFAULT_NFT_MAX_ITEMS = 6
const DEFAULT_SOCIAL_POST_MAX_ITEMS = 6

const SECTION_ITEM_TYPE = "PROFILE_SECTION"
const CONTAINER_ITEM_TYPE = "PROFILE_SECTION_CONTAINER"
const SUBSCRIPTION_PACKAGE_ITEM_TYPE = "PROFILE_SUBSCRIPTION_PACKAGE_ITEM"
const MAX_CONTAINERS_PER_SECTION = 4

function getSubscriptionColorClass(input: string | null | undefined) {
  const tokens = (input ?? "")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
  const bgToken = tokens.find(
    (token) =>
      token.startsWith("bg-") &&
      token !== "bg-gradient-to-r" &&
      token !== "bg-gradient-to-l" &&
      token !== "bg-gradient-to-t" &&
      token !== "bg-gradient-to-b",
  )
  return bgToken ?? "bg-muted"
}

function formatStatsValue(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)
}

function getStatsMeta(key: StatsMetricKey): {
  label: string
  valueLabel: string
  icon: typeof UsersIcon
} {
  switch (key) {
    case "followers":
      return { label: "Total Followers", valueLabel: "Followers", icon: UsersIcon }
    case "posts":
      return { label: "Total Posts", valueLabel: "Posts", icon: Grid3X3Icon }
    case "nfts":
      return { label: "Total NFTs", valueLabel: "NFTs", icon: ImageIcon }
    case "revenue":
      return { label: "Total Revenue", valueLabel: "Revenue", icon: DollarSignIcon }
    default:
      return { label: "Stat", valueLabel: "Stat", icon: UsersIcon }
  }
}

function normalizeStatsMetricOrder(order: StatsMetricKey[] | null | undefined): StatsMetricKey[] {
  const base = Array.isArray(order) ? order : []
  const deduped: StatsMetricKey[] = []
  for (const key of base) {
    if (!DEFAULT_STATS_METRIC_ORDER.includes(key)) continue
    if (deduped.includes(key)) continue
    deduped.push(key)
  }
  for (const key of DEFAULT_STATS_METRIC_ORDER) {
    if (!deduped.includes(key)) deduped.push(key)
  }
  return deduped
}

function normalizeNftMaxItems(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_NFT_MAX_ITEMS
  return Math.max(1, Math.min(12, Math.round(value)))
}

function normalizeSocialPostMaxItems(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_SOCIAL_POST_MAX_ITEMS
  return Math.max(1, Math.min(12, Math.round(value)))
}

function formatRelativePostTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const now = new Date()
  const diffTime = Math.max(0, now.getTime() - date.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffTime / (1000 * 60))
      return `${diffMinutes}m ago`
    }
    return `${diffHours}h ago`
  }
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function clampWidth(width: number) {
  return Math.max(5, Math.min(95, width))
}

function clampSectionMargin(value: number) {
  return Math.max(0, Math.min(240, Math.round(value)))
}

function clampSectionContainerGap(value: number) {
  return Math.max(0, Math.min(64, Math.round(value)))
}

function createContainer(seed: number): SectionLayoutItem {
  return {
    id: `container-${seed}`,
    widthPct: 100,
    order: 0,
    kind: "container",
    hideContainerFrame: true,
    content: null,
  }
}

function normalizeContainerWidths(items: SectionLayoutItem[]): SectionLayoutItem[] {
  if (items.length === 0) return []
  const evenWidth = 100 / items.length
  return items.map((item) => ({
    ...item,
    widthPct: clampWidth(item.widthPct ?? evenWidth),
  }))
}

function readPanelSize(
  sizes: Layout,
  itemId: string,
  index: number,
  fallback: number,
): number {
  if (Array.isArray(sizes)) {
    const sizeList = sizes as Array<number | undefined>
    const value = sizeList[index]
    return typeof value === "number" && Number.isFinite(value) ? value : fallback
  }

  const record = sizes as Record<string, number | string | undefined>
  const byId = record[itemId]
  if (typeof byId === "number" && Number.isFinite(byId)) return byId
  if (typeof byId === "string") {
    const parsed = Number.parseFloat(byId)
    if (Number.isFinite(parsed)) return parsed
  }

  const byIndex = record[String(index)]
  if (typeof byIndex === "number" && Number.isFinite(byIndex)) return byIndex
  if (typeof byIndex === "string") {
    const parsed = Number.parseFloat(byIndex)
    if (Number.isFinite(parsed)) return parsed
  }

  return fallback
}

function SectionContainerCard({
  sectionId,
  id,
  index,
  direction,
  isSubscription,
  hideContainerFrame,
  onMove,
  canInsert,
  onAddBefore,
  onAddAfter,
  children,
}: {
  sectionId: string
  id: string
  index: number
  direction: "row" | "column"
  isSubscription?: boolean
  hideContainerFrame?: boolean
  onMove: (sectionId: string, dragId: string, hoverId: string) => void
  canInsert: boolean
  onAddBefore: () => void
  onAddAfter: () => void
  children: ReactNode
}) {
  const [isHovered, setIsHovered] = useState(false)
  const isSelectionMode = useProfileEditorStore((state) => state.isSelectionMode)
  const selectedOverlay = useProfileEditorStore((state) => state.selectedOverlay)
  const setSelectedOverlay = useProfileEditorStore((state) => state.setSelectedOverlay)

  const isSelected =
    selectedOverlay?.kind === "container" &&
    selectedOverlay.sectionId === sectionId &&
    selectedOverlay.containerId === id
  const showOverlay = isSelectionMode && (isHovered || isSelected)
  const showInsertButtons = canInsert && (isHovered || isSelected)
  const overlayColorClass = isSelected ? "border-[#f97316]" : "border-[#2b5cff]"
  const labelBgClass = isSelected ? "bg-[#f97316]" : "bg-[#2b5cff]"

  const [{ isDragging }, dragRef, previewRef] = useDrag(
    () => ({
      type: CONTAINER_ITEM_TYPE,
      item: { id, sectionId },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [id, sectionId],
  )

  const [, dropRef] = useDrop(
    () => ({
      accept: CONTAINER_ITEM_TYPE,
      hover: (dragItem: { id: string; sectionId: string }) => {
        if (dragItem.sectionId !== sectionId) return
        if (dragItem.id === id) return
        onMove(sectionId, dragItem.id, id)
      },
    }),
    [id, onMove, sectionId],
  )

  return (
    <div
      ref={(node) => {
        dropRef(node)
        previewRef(node)
      }}
      data-profile-container-root="true"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(event) => {
        event.stopPropagation()
        if (!isSelectionMode) return
        setSelectedOverlay({
          kind: "container",
          sectionId,
          containerId: id,
        })
      }}
      className={`group relative ${isSubscription ? "" : "bg-background/70"} p-0 transition-opacity ${
        isDragging ? "opacity-60" : "opacity-100"
      }`}
      data-section-index={index}
    >
      <div
        className={`pointer-events-none absolute inset-0 z-20 border-2 ${overlayColorClass} transition-opacity ${
          showOverlay ? "opacity-100" : "opacity-0"
        }`}
      />

      {showOverlay ? (
        <div
          className={`pointer-events-none absolute left-0 top-0 z-30 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white ${labelBgClass}`}
        >
          <button
            type="button"
            ref={(node) => {
              dragRef(node)
            }}
            className="pointer-events-auto inline-flex h-4 w-4 cursor-grab items-center justify-center rounded-sm hover:bg-muted active:cursor-grabbing"
            aria-label="Drag container"
            onClick={(event) => event.stopPropagation()}
          >
            <GripVerticalIcon className="h-3.5 w-3.5" />
          </button>
          <span>Container {index + 1}</span>
        </div>
      ) : null}

      {canInsert && showOverlay ? (
        <>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className={
              direction === "column"
                ? `absolute left-1/2 top-8 z-30 h-6 w-6 -translate-x-1/2 shadow-sm transition-opacity ${
                    showInsertButtons ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`
                : `absolute left-1 top-1/2 z-30 h-6 w-6 -translate-y-1/2 shadow-sm transition-opacity ${
                    showInsertButtons ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`
            }
            onClick={(event) => {
              event.stopPropagation()
              onAddBefore()
            }}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            <span className="sr-only">
              {direction === "column" ? "Add container above" : "Add container before"}
            </span>
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className={
              direction === "column"
                ? `absolute bottom-1 left-1/2 z-30 h-6 w-6 -translate-x-1/2 shadow-sm transition-opacity ${
                    showInsertButtons ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`
                : `absolute right-1 top-1/2 z-30 h-6 w-6 -translate-y-1/2 shadow-sm transition-opacity ${
                    showInsertButtons ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`
            }
            onClick={(event) => {
              event.stopPropagation()
              onAddAfter()
            }}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            <span className="sr-only">
              {direction === "column" ? "Add container below" : "Add container after"}
            </span>
          </Button>
        </>
      ) : null}
      <div className={hideContainerFrame ? "p-0" : "border border-border/45 p-2"}>{children}</div>
    </div>
  )
}

function SectionShell({
  id,
  index,
  hasContainers,
  hideSectionFrame,
  marginTop,
  marginBottom,
  onMove,
  children,
}: {
  id: string
  index: number
  hasContainers: boolean
  hideSectionFrame: boolean
  marginTop: number
  marginBottom: number
  onMove: (dragId: string, hoverId: string) => void
  children: ReactNode
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [isHoveringContainer, setIsHoveringContainer] = useState(false)
  const isSelectionMode = useProfileEditorStore((state) => state.isSelectionMode)
  const selectedOverlay = useProfileEditorStore((state) => state.selectedOverlay)
  const setSelectedOverlay = useProfileEditorStore((state) => state.setSelectedOverlay)

  const isSelected = selectedOverlay?.kind === "section" && selectedOverlay.sectionId === id
  const showOverlay = isSelectionMode && (isSelected || (isHovered && !isHoveringContainer))
  const showChip = isSelectionMode && (hasContainers || showOverlay)
  const overlayColorClass = isSelected ? "border-[#f97316]" : "border-[#2b5cff]"
  const labelBgClass = isSelected ? "bg-[#f97316]" : "bg-[#2b5cff]"

  const [{ isDragging }, dragRef, previewRef] = useDrag(
    () => ({
      type: SECTION_ITEM_TYPE,
      item: { id },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [id],
  )

  const [, dropRef] = useDrop(
    () => ({
      accept: SECTION_ITEM_TYPE,
      hover: (dragItem: { id: string }) => {
        if (dragItem.id === id) return
        onMove(dragItem.id, id)
      },
    }),
    [id, onMove],
  )

  return (
    <div
      ref={(node) => {
        dropRef(node)
        previewRef(node)
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={(event) => {
        const target = event.target as HTMLElement | null
        const overContainer = Boolean(target?.closest('[data-profile-container-root="true"]'))
        if (overContainer !== isHoveringContainer) {
          setIsHoveringContainer(overContainer)
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsHoveringContainer(false)
      }}
      onClick={(event) => {
        event.stopPropagation()
        if (!isSelectionMode) return
        setSelectedOverlay({
          kind: "section",
          sectionId: id,
        })
      }}
      className={`relative isolate bg-background/20 transition-opacity ${
        isDragging ? "opacity-60" : "opacity-100"
      }`}
      style={{
        marginTop: `${clampSectionMargin(marginTop)}px`,
        marginBottom: `${clampSectionMargin(marginBottom)}px`,
      }}
    >
      <div
        className={`pointer-events-none absolute inset-0 z-[1] border-2 ${overlayColorClass} transition-opacity ${
          showOverlay ? "opacity-100" : "opacity-0"
        }`}
      />
      {showChip ? (
        <div
          className={`pointer-events-auto absolute left-0 -top-5 z-[2] inline-flex cursor-pointer items-center gap-1 px-2 py-0.5 text-xs font-medium text-white ${labelBgClass}`}
          onClick={(event) => {
            event.stopPropagation()
            if (!isSelectionMode) return
            setSelectedOverlay({
              kind: "section",
              sectionId: id,
            })
          }}
        >
          <button
            type="button"
            ref={(node) => {
              dragRef(node)
            }}
            className="pointer-events-auto inline-flex h-4 w-4 cursor-grab items-center justify-center rounded-sm hover:bg-muted active:cursor-grabbing"
            aria-label="Drag section"
            onClick={(event) => event.stopPropagation()}
          >
            <GripVerticalIcon className="h-3.5 w-3.5" />
          </button>
          <span>Section {index + 1}</span>
        </div>
      ) : null}
      <div className={hideSectionFrame ? "p-0" : "border border-border/45 p-2"}>{children}</div>
    </div>
  )
}

function SubscriptionPackageOrderRow({
  pkg,
  sectionId,
  containerId,
  onMove,
}: {
  pkg: BuilderSubscriptionPackage
  sectionId: string
  containerId: string
  onMove: (sectionId: string, containerId: string, dragPackageId: number, hoverPackageId: number) => void
}) {
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: SUBSCRIPTION_PACKAGE_ITEM_TYPE,
      item: { id: pkg.id },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [pkg.id],
  )

  const [, dropRef] = useDrop(
    () => ({
      accept: SUBSCRIPTION_PACKAGE_ITEM_TYPE,
      hover: (item: { id: number }) => {
        if (item.id === pkg.id) return
        onMove(sectionId, containerId, item.id, pkg.id)
      },
    }),
    [containerId, onMove, pkg.id, sectionId],
  )

  return (
    <div
      ref={(node) => {
        dragRef(node)
        dropRef(node)
      }}
      className={`flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5 ${
        isDragging ? "opacity-60" : "opacity-100"
      }`}
    >
      <div className="inline-flex items-center gap-2 min-w-0">
        <GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{pkg.name}</span>
      </div>
      <span className="text-xs text-muted-foreground">{pkg.price}</span>
    </div>
  )
}

function StatsMetricOrderRow({
  metric,
  sectionId,
  containerId,
  onMove,
}: {
  metric: StatsMetricKey
  sectionId: string
  containerId: string
  onMove: (sectionId: string, containerId: string, dragMetric: StatsMetricKey, hoverMetric: StatsMetricKey) => void
}) {
  const meta = getStatsMeta(metric)
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: STATS_ITEM_TYPE,
      item: { metric },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [metric],
  )

  const [, dropRef] = useDrop(
    () => ({
      accept: STATS_ITEM_TYPE,
      hover: (item: { metric: StatsMetricKey }) => {
        if (item.metric === metric) return
        onMove(sectionId, containerId, item.metric, metric)
      },
    }),
    [containerId, metric, onMove, sectionId],
  )

  return (
    <div
      ref={(node) => {
        dragRef(node)
        dropRef(node)
      }}
      className={`flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5 ${
        isDragging ? "opacity-60" : "opacity-100"
      }`}
    >
      <div className="inline-flex min-w-0 items-center gap-2">
        <GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{meta.label}</span>
      </div>
    </div>
  )
}

function NftOrderRow({
  nft,
  sectionId,
  containerId,
  onMove,
}: {
  nft: BuilderNftCard
  sectionId: string
  containerId: string
  onMove: (sectionId: string, containerId: string, dragNftId: number, hoverNftId: number) => void
}) {
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: NFT_COLLECTION_ITEM_TYPE,
      item: { id: nft.id },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [nft.id],
  )

  const [, dropRef] = useDrop(
    () => ({
      accept: NFT_COLLECTION_ITEM_TYPE,
      hover: (item: { id: number }) => {
        if (item.id === nft.id) return
        onMove(sectionId, containerId, item.id, nft.id)
      },
    }),
    [containerId, nft.id, onMove, sectionId],
  )

  return (
    <div
      ref={(node) => {
        dragRef(node)
        dropRef(node)
      }}
      className={`flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5 ${
        isDragging ? "opacity-60" : "opacity-100"
      }`}
    >
      <div className="inline-flex min-w-0 items-center gap-2">
        <GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{nft.name}</span>
      </div>
      <span className="text-xs text-muted-foreground">#{nft.id}</span>
    </div>
  )
}

function SocialPostOrderRow({
  post,
  sectionId,
  containerId,
  onMove,
}: {
  post: BuilderSocialPost
  sectionId: string
  containerId: string
  onMove: (sectionId: string, containerId: string, dragPostId: number, hoverPostId: number) => void
}) {
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: SOCIAL_POST_ITEM_TYPE,
      item: { id: post.id },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [post.id],
  )

  const [, dropRef] = useDrop(
    () => ({
      accept: SOCIAL_POST_ITEM_TYPE,
      hover: (item: { id: number }) => {
        if (item.id === post.id) return
        onMove(sectionId, containerId, item.id, post.id)
      },
    }),
    [containerId, onMove, post.id, sectionId],
  )

  return (
    <div
      ref={(node) => {
        dragRef(node)
        dropRef(node)
      }}
      className={`flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5 ${
        isDragging ? "opacity-60" : "opacity-100"
      }`}
    >
      <div className="inline-flex min-w-0 items-center gap-2">
        <GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{post.heading ?? "Untitled post"}</span>
      </div>
      <span className="text-xs text-muted-foreground">#{post.id}</span>
    </div>
  )
}

export function ProfileSectionBuilder({
  layout,
  onLayoutChange,
  subscriptions,
  statsData,
  nftCards,
  socialPosts,
  onCreatePackage,
  onCreateNft,
  onCreatePost,
}: {
  layout: SectionLayout
  onLayoutChange: (layout: SectionLayout) => void
  subscriptions: BuilderSubscriptionPackage[]
  statsData: BuilderStatsData
  nftCards: BuilderNftCard[]
  socialPosts: BuilderSocialPost[]
  onCreatePackage: () => void
  onCreateNft: () => void
  onCreatePost: () => void
}) {
  const isSelectionMode = useProfileEditorStore((state) => state.isSelectionMode)
  const [addItemTarget, setAddItemTarget] = useState<{ sectionId: string; containerId: string } | null>(
    null,
  )
  const orderedSections = useMemo(
    () => [...layout.sections].sort((a, b) => a.order - b.order),
    [layout.sections],
  )
  const selectedOverlay = useProfileEditorStore((state) => state.selectedOverlay)
  const setSelectedOverlay = useProfileEditorStore((state) => state.setSelectedOverlay)

  const selectedSectionId = selectedOverlay?.kind === "section" ? selectedOverlay.sectionId : null
  const selectedSection = selectedSectionId
    ? orderedSections.find((section) => section.id === selectedSectionId) ?? null
    : null
  const selectedContainer =
    selectedOverlay?.kind === "container"
      ? orderedSections
          .find((section) => section.id === selectedOverlay.sectionId)
          ?.items.find((item) => item.id === selectedOverlay.containerId) ?? null
      : null
  const selectedContainerSectionId =
    selectedOverlay?.kind === "container" ? selectedOverlay.sectionId : null
  const selectedSubscriptionContent =
    selectedContainer?.content?.type === "subscription" ? selectedContainer.content : null
  const selectedStatsContent =
    selectedContainer?.content?.type === "stats" ? selectedContainer.content : null
  const selectedNftContent =
    selectedContainer?.content?.type === "nft_collection" ? selectedContainer.content : null
  const selectedSocialPostsContent =
    selectedContainer?.content?.type === "social_posts" ? selectedContainer.content : null

  useEffect(() => {
    if (!selectedSectionId) return
    const sectionExists = orderedSections.some((section) => section.id === selectedSectionId)
    if (!sectionExists) {
      setSelectedOverlay(null)
    }
  }, [orderedSections, selectedSectionId, setSelectedOverlay])

  useEffect(() => {
    if (selectedOverlay?.kind !== "container") return
    const exists = orderedSections.some(
      (section) =>
        section.id === selectedOverlay.sectionId &&
        section.items.some((item) => item.id === selectedOverlay.containerId),
    )
    if (!exists) {
      setSelectedOverlay(null)
    }
  }, [orderedSections, selectedOverlay, setSelectedOverlay])

  const moveSection = (dragId: string, hoverId: string) => {
    const current = [...orderedSections]
    const dragIndex = current.findIndex((section) => section.id === dragId)
    const hoverIndex = current.findIndex((section) => section.id === hoverId)
    if (dragIndex === -1 || hoverIndex === -1 || dragIndex === hoverIndex) return

    const [dragged] = current.splice(dragIndex, 1)
    if (!dragged) return
    current.splice(hoverIndex, 0, dragged)

    onLayoutChange({
      version: 2,
      sections: current.map((section, index) => ({
        ...section,
        order: index,
      })),
    })
  }

  const moveContainer = (sectionId: string, dragId: string, hoverId: string) => {
    const nextSections = orderedSections.map((section) => {
      if (section.id !== sectionId) return section

      const current = [...section.items].sort((a, b) => a.order - b.order)
      const dragIndex = current.findIndex((item) => item.id === dragId)
      const hoverIndex = current.findIndex((item) => item.id === hoverId)
      if (dragIndex === -1 || hoverIndex === -1 || dragIndex === hoverIndex) return section

      const [dragged] = current.splice(dragIndex, 1)
      if (!dragged) return section
      current.splice(hoverIndex, 0, dragged)

      return {
        ...section,
        items: current.map((item, idx) => ({ ...item, order: idx })),
      }
    })

    onLayoutChange({ version: 2, sections: nextSections })
  }

  const handleSectionResize = (sectionId: string, sizes: Layout) => {
    const nextSections = orderedSections.map((section) => {
      if (section.id !== sectionId) return section

      const nextItems = [...section.items]
        .sort((a, b) => a.order - b.order)
        .map((item, index) => {
          const parsedSize = readPanelSize(sizes, item.id, index, item.widthPct)
          return {
            ...item,
            widthPct: clampWidth(Number.isFinite(parsedSize) ? parsedSize : item.widthPct),
          }
        })

      return {
        ...section,
        items: nextItems,
      }
    })

    onLayoutChange({ version: 2, sections: nextSections })
  }

  const addSection = (afterSectionId?: string) => {
    const current = [...orderedSections]
    const insertAt =
      afterSectionId === undefined
        ? current.length
        : Math.max(
            0,
            current.findIndex((section) => section.id === afterSectionId) + 1,
          )

    const seed = Date.now()
    const nextSection: SectionLayoutSection = {
      id: `section-${seed}`,
      order: 0,
      direction: "row",
      hideSectionFrame: false,
      marginTop: 0,
      marginBottom: 0,
      containerGap: 0,
      items: [],
    }

    current.splice(insertAt, 0, nextSection)
    const nextSections = current.map((section, index) => ({
      ...section,
      order: index,
    }))

    onLayoutChange({ version: 2, sections: nextSections })
  }

  const setSectionDirection = (sectionId: string, direction: "row" | "column") => {
    onLayoutChange({
      version: 2,
      sections: orderedSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              direction,
            }
          : section,
      ),
    })
  }

  const setSectionFrameVisibility = (sectionId: string, hidden: boolean) => {
    onLayoutChange({
      version: 2,
      sections: orderedSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              hideSectionFrame: hidden,
            }
          : section,
      ),
    })
  }

  const setSectionMargins = (
    sectionId: string,
    nextMargins: {
      marginTop?: number
      marginBottom?: number
    },
  ) => {
    onLayoutChange({
      version: 2,
      sections: orderedSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              marginTop:
                nextMargins.marginTop === undefined
                  ? section.marginTop ?? 0
                  : clampSectionMargin(nextMargins.marginTop),
              marginBottom:
                nextMargins.marginBottom === undefined
                  ? section.marginBottom ?? 0
                  : clampSectionMargin(nextMargins.marginBottom),
            }
          : section,
      ),
    })
  }

  const setSectionContainerGap = (sectionId: string, gap: number) => {
    onLayoutChange({
      version: 2,
      sections: orderedSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              containerGap: clampSectionContainerGap(gap),
            }
          : section,
      ),
    })
  }

  const deleteSection = (sectionId: string) => {
    const remaining = orderedSections.filter((section) => section.id !== sectionId)
    onLayoutChange({
      version: 2,
      sections: remaining.map((section, index) => ({
        ...section,
        order: index,
      })),
    })
    setSelectedOverlay(null)
  }

  const addContainer = (
    sectionId: string,
    options?: {
      aroundId?: string
      position?: "before" | "after" | "end"
    },
  ) => {
    const nextSections = orderedSections.map((section) => {
      if (section.id !== sectionId) return section
      const current = [...section.items].sort((a, b) => a.order - b.order)
      if (current.length >= MAX_CONTAINERS_PER_SECTION) return section

      const seed = Date.now()
      const nextContainer = createContainer(seed)
      const nextList = [...current]

      if (options?.aroundId) {
        const anchorIndex = nextList.findIndex((item) => item.id === options.aroundId)
        if (anchorIndex >= 0) {
          const insertAt = options.position === "before" ? anchorIndex : anchorIndex + 1
          nextList.splice(insertAt, 0, nextContainer)
        } else {
          nextList.push(nextContainer)
        }
      } else {
        nextList.push(nextContainer)
      }

      const nextItems = normalizeContainerWidths(nextList).map((item, index) => ({
        ...item,
        order: index,
      }))

      return {
        ...section,
        items: nextItems,
      }
    })

    onLayoutChange({ version: 2, sections: nextSections })
  }

  const deleteContainer = (sectionId: string, containerId: string) => {
    const nextSections = orderedSections.map((section) => {
      if (section.id !== sectionId) return section
      const remaining = section.items.filter((item) => item.id !== containerId)
      const resized = normalizeContainerWidths(remaining).map((item, index) => ({
        ...item,
        order: index,
      }))
      return {
        ...section,
        items: resized,
      }
    })

    onLayoutChange({ version: 2, sections: nextSections })
    setSelectedOverlay({
      kind: "section",
      sectionId,
    })
  }

  const setContainerContent = (
    sectionId: string,
    containerId: string,
    content: SectionContainerContent | null,
  ) => {
    const nextSections = orderedSections.map((section) => {
      if (section.id !== sectionId) return section
      return {
        ...section,
        items: section.items.map((item) =>
          item.id === containerId
            ? {
                ...item,
                content,
              }
            : item,
        ),
      }
    })

    onLayoutChange({ version: 2, sections: nextSections })
  }

  const setContainerFrameVisibility = (sectionId: string, containerId: string, hidden: boolean) => {
    const nextSections = orderedSections.map((section) => {
      if (section.id !== sectionId) return section
      return {
        ...section,
        items: section.items.map((item) =>
          item.id === containerId
            ? {
                ...item,
                hideContainerFrame: hidden,
              }
            : item,
        ),
      }
    })

    onLayoutChange({ version: 2, sections: nextSections })
  }

  const moveSubscriptionPackage = (
    sectionId: string,
    containerId: string,
    dragPackageId: number,
    hoverPackageId: number,
  ) => {
    const packageOrder = selectedSubscriptionPackages.map((pkg) => pkg.id)
    const dragIndex = packageOrder.findIndex((id) => id === dragPackageId)
    const hoverIndex = packageOrder.findIndex((id) => id === hoverPackageId)
    if (dragIndex === -1 || hoverIndex === -1 || dragIndex === hoverIndex) return

    const [draggedId] = packageOrder.splice(dragIndex, 1)
    if (draggedId === undefined) return
    packageOrder.splice(hoverIndex, 0, draggedId)

    setContainerContent(sectionId, containerId, {
      type: "subscription",
      packageOrder,
      gradientMode: Boolean(selectedSubscriptionContent?.gradientMode),
    })
  }

  const moveStatsMetric = (
    sectionId: string,
    containerId: string,
    dragMetric: StatsMetricKey,
    hoverMetric: StatsMetricKey,
  ) => {
    const currentOrder =
      selectedStatsContent
        ? normalizeStatsMetricOrder(selectedStatsContent.metricOrder)
        : [...DEFAULT_STATS_METRIC_ORDER]
    const dragIndex = currentOrder.findIndex((key) => key === dragMetric)
    const hoverIndex = currentOrder.findIndex((key) => key === hoverMetric)
    if (dragIndex === -1 || hoverIndex === -1 || dragIndex === hoverIndex) return

    const [dragged] = currentOrder.splice(dragIndex, 1)
    if (!dragged) return
    currentOrder.splice(hoverIndex, 0, dragged)

    setContainerContent(sectionId, containerId, {
      type: "stats",
      metricOrder: currentOrder,
      showIcons: selectedStatsContent ? Boolean(selectedStatsContent.showIcons) : true,
    })
  }

  const moveNftCard = (
    sectionId: string,
    containerId: string,
    dragNftId: number,
    hoverNftId: number,
  ) => {
    const order = selectedNftCards.map((nft) => nft.id)
    const dragIndex = order.findIndex((id) => id === dragNftId)
    const hoverIndex = order.findIndex((id) => id === hoverNftId)
    if (dragIndex === -1 || hoverIndex === -1 || dragIndex === hoverIndex) return
    const [dragged] = order.splice(dragIndex, 1)
    if (dragged === undefined) return
    order.splice(hoverIndex, 0, dragged)
    setContainerContent(sectionId, containerId, {
      type: "nft_collection",
      nftOrder: order,
      showCreator: selectedNftContent ? selectedNftContent.showCreator !== false : true,
      showPrice: selectedNftContent ? selectedNftContent.showPrice !== false : true,
      maxItems: normalizeNftMaxItems(selectedNftContent?.maxItems),
    })
  }

  const moveSocialPost = (
    sectionId: string,
    containerId: string,
    dragPostId: number,
    hoverPostId: number,
  ) => {
    const order = selectedSocialPosts.map((post) => post.id)
    const dragIndex = order.findIndex((id) => id === dragPostId)
    const hoverIndex = order.findIndex((id) => id === hoverPostId)
    if (dragIndex === -1 || hoverIndex === -1 || dragIndex === hoverIndex) return
    const [dragged] = order.splice(dragIndex, 1)
    if (dragged === undefined) return
    order.splice(hoverIndex, 0, dragged)
    setContainerContent(sectionId, containerId, {
      type: "social_posts",
      postOrder: order,
      filter: selectedSocialPostsContent?.filter ?? "all",
      showMedia: selectedSocialPostsContent?.showMedia !== false,
      showEngagement: selectedSocialPostsContent?.showEngagement !== false,
      maxItems: normalizeSocialPostMaxItems(selectedSocialPostsContent?.maxItems),
    })
  }

  const subscriptionPackageMap = useMemo(
    () => new Map(subscriptions.map((pkg) => [pkg.id, pkg])),
    [subscriptions],
  )
  const selectedSubscriptionPackages = useMemo(() => {
    if (!selectedSubscriptionContent) return []
    const orderedIds = selectedSubscriptionContent.packageOrder
    const ordered = orderedIds
      .map((id) => subscriptionPackageMap.get(id))
      .filter((pkg): pkg is BuilderSubscriptionPackage => Boolean(pkg))
    const remaining = subscriptions.filter((pkg) => !orderedIds.includes(pkg.id))
    return [...ordered, ...remaining]
  }, [selectedSubscriptionContent, subscriptionPackageMap, subscriptions])
  const selectedStatsMetricOrder = useMemo(() => {
    if (!selectedStatsContent) return []
    return normalizeStatsMetricOrder(selectedStatsContent.metricOrder)
  }, [selectedStatsContent])
  const nftMap = useMemo(() => new Map(nftCards.map((card) => [card.id, card])), [nftCards])
  const selectedNftCards = useMemo(() => {
    if (!selectedNftContent) return []
    const ordered = selectedNftContent.nftOrder
      .map((id) => nftMap.get(id))
      .filter((card): card is BuilderNftCard => Boolean(card))
    const remaining = nftCards.filter((card) => !selectedNftContent.nftOrder.includes(card.id))
    return [...ordered, ...remaining]
  }, [nftCards, nftMap, selectedNftContent])
  const socialPostMap = useMemo(() => new Map(socialPosts.map((post) => [post.id, post])), [socialPosts])
  const selectedSocialPosts = useMemo(() => {
    if (!selectedSocialPostsContent) return []
    const ordered = selectedSocialPostsContent.postOrder
      .map((id) => socialPostMap.get(id))
      .filter((post): post is BuilderSocialPost => Boolean(post))
    const remaining = socialPosts.filter((post) => !selectedSocialPostsContent.postOrder.includes(post.id))
    return [...ordered, ...remaining]
  }, [selectedSocialPostsContent, socialPostMap, socialPosts])
  const usedItemTypes = useMemo(() => {
    const used = new Set<string>()
    for (const section of orderedSections) {
      for (const item of section.items) {
        if (item.content?.type) {
          used.add(item.content.type)
        }
      }
    }
    return used
  }, [orderedSections])
  const canAddSubscriptionItem = !usedItemTypes.has("subscription")
  const canAddStatsItem = !usedItemTypes.has("stats")
  const canAddNftCollectionItem = !usedItemTypes.has("nft_collection")
  const canAddSocialPostsItem = !usedItemTypes.has("social_posts")

  const renderContainerBody = (sectionId: string, item: SectionLayoutItem) => {
    if (item.content?.type === "subscription") {
      const subscriptionContent = item.content
      const isGradientMode = Boolean(subscriptionContent.gradientMode)
      const orderedPackages = subscriptionContent.packageOrder
        .map((id) => subscriptionPackageMap.get(id))
        .filter((pkg): pkg is BuilderSubscriptionPackage => Boolean(pkg))
      const remainingPackages = subscriptions.filter((pkg) => !subscriptionContent.packageOrder.includes(pkg.id))
      const visiblePackages = [...orderedPackages, ...remainingPackages]

      return (
        <div className="min-h-[180px] w-full">
          {visiblePackages.length === 0 ? (
            <div className="flex h-full min-h-[140px] items-center justify-center text-sm text-muted-foreground">
              No subscription packages yet
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visiblePackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="relative overflow-hidden border border-[#dfdfdf] bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:border-white/15 dark:bg-[#121212] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)]"
                >
                  {isGradientMode ? (
                    <div
                      className={cn("pointer-events-none absolute inset-0 opacity-30", getSubscriptionColorClass(pkg.color))}
                      style={{ maskImage: "linear-gradient(to bottom, black, transparent 70%)" }}
                      aria-hidden="true"
                    />
                  ) : null}
                  {pkg.popular ? (
                    <div className="absolute right-3 top-2 z-[1] rounded-md bg-[#141414] px-2 py-1 text-[11px] font-semibold text-white dark:bg-[#f4f4f4] dark:text-[#121212]">
                      Most popular
                    </div>
                  ) : null}

                  <div className="relative z-[1] space-y-3 p-4">
                    <p className="pr-24 text-[22px] font-semibold leading-none text-[#151515] dark:text-[#f3f3f3]">
                      {pkg.name}
                    </p>
                    <div className="flex items-end gap-1.5">
                      <span className="text-[52px] font-semibold leading-[0.9] tracking-[-0.03em] text-[#111111] dark:text-white">
                        {pkg.price} Fyron
                      </span>
                      <span className="pb-1 text-sm text-[#6c6c6c] dark:text-[#b6b6b6]">per month</span>
                    </div>
                  </div>

                  <div className="relative z-[1] border-t border-[#ececec] p-4 dark:border-white/10">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#1f1f1f] dark:text-[#f0f0f0]">
                      Features
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-[#666] dark:text-[#ababab]">{pkg.description}</p>
                    <ul className="mt-3 space-y-2">
                      {pkg.features.slice(0, 5).map((feature, idx) => (
                        <li
                          key={`${pkg.id}-${idx}`}
                          className="flex items-start gap-2.5 text-sm text-[#252525] dark:text-[#e7e7e7]"
                        >
                          <CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#161616] dark:text-[#f2f2f2]" />
                          <span className="leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div
                    className={cn("h-3 w-full border-t border-black/10 dark:border-white/10", getSubscriptionColorClass(pkg.color))}
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (item.content?.type === "stats") {
      const metricOrder = normalizeStatsMetricOrder(item.content.metricOrder)
      const showIcons = item.content.showIcons !== false
      return (
        <div className="w-full border border-solid border-muted-foreground/30">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
            {metricOrder.map((metric) => {
              const meta = getStatsMeta(metric)
              const value =
                metric === "followers"
                  ? statsData.followers
                  : metric === "posts"
                    ? statsData.posts
                    : metric === "nfts"
                      ? statsData.nfts
                      : statsData.revenue
              const Icon = meta.icon
              return (
                <div
                  key={`${sectionId}-${item.id}-${metric}`}
                  className="border-b border-r border-[#ececec] p-4 last:border-r-0 md:[&:nth-child(2n)]:border-r-0 xl:[&:nth-child(2n)]:border-r xl:[&:nth-child(4n)]:border-r-0 [&:nth-last-child(-n+1)]:border-b-0 md:[&:nth-last-child(-n+2)]:border-b-0 xl:[&:nth-last-child(-n+4)]:border-b-0 dark:border-white/10"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    {meta.label}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    {showIcons ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
                    <p className="text-3xl font-semibold leading-none">{formatStatsValue(value)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    if (item.content?.type === "nft_collection") {
      const content = item.content
      const maxItems = normalizeNftMaxItems(content.maxItems)
      const ordered = content.nftOrder
        .map((id) => nftMap.get(id))
        .filter((card): card is BuilderNftCard => Boolean(card))
      const remaining = nftCards.filter((card) => !content.nftOrder.includes(card.id))
      const visible = [...ordered, ...remaining].slice(0, maxItems)

      return (
        <div className="w-full">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold">Creator&apos;s NFT Collection</h2>
            <Button type="button" size="sm" onClick={onCreateNft}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create New NFT
            </Button>
          </div>
          {visible.length === 0 ? (
            <div className="flex min-h-[180px] items-center justify-center border border-dashed border-muted-foreground/30 text-sm text-muted-foreground">
              No NFTs available
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((card) => {
                const creatorLabel = card.creatorId ? addrShort(card.creatorId, 5) : "Admin"
                const typeLabel =
                  card.mediaType === "THREE_D" ? "3D Model" : (card.mediaType ?? "Collectible")
                return (
                  <div
                    key={`${sectionId}-${item.id}-${card.id}`}
                    className="group h-full overflow-hidden rounded-[0.95rem] border border-[#ddd9d0] bg-white shadow-[0_6px_18px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-none"
                  >
                    <div className="relative flex h-full flex-col overflow-hidden p-0">
                      <div className="relative aspect-[0.96] overflow-hidden rounded-t-[0.95rem] bg-[#d8c7bb] dark:bg-zinc-800">
                        <img
                          src={card.thumbnail ?? "/images/logo.png"}
                          alt={card.name}
                          className="h-full min-h-[240px] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      </div>

                      <div className="flex flex-1 flex-col gap-2 px-4 pb-3.5 pt-3">
                        <div className="inline-flex w-fit rounded-[2px] bg-[#f3f1ee] px-2 py-0.5 text-[0.64rem] font-medium text-black/60 dark:bg-zinc-800 dark:text-zinc-300">
                          {typeLabel}
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="line-clamp-1 text-[0.98rem] font-semibold leading-tight text-black/90 dark:text-zinc-100">
                              {card.name}
                            </h2>
                          </div>
                          {content.showCreator !== false ? (
                            <p className="shrink-0 truncate font-mono text-sm text-foreground/70 dark:text-zinc-400">
                              {creatorLabel}
                            </p>
                          ) : null}
                        </div>

                        <div className="relative overflow-hidden rounded-none border-0">
                          <div className="relative z-10 space-y-0">
                            {content.showPrice !== false && card.price ? (
                              <div className="flex items-center gap-2 text-sm font-medium text-black/88 dark:text-zinc-100">
                                <span>{card.price}</span>
                                <span className="text-black/55 dark:text-zinc-400">
                                  {PLATFORM_ASSET.code.toUpperCase()}
                                </span>
                              </div>
                            ) : null}
                            {content.showPrice !== false && card.priceUSD ? (
                              <p className="text-sm text-black/52 dark:text-zinc-400">
                                {`Approx. $${card.priceUSD}`}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    if (item.content?.type === "social_posts") {
      const content = item.content
      const filter = content.filter ?? "all"
      const maxItems = normalizeSocialPostMaxItems(content.maxItems)
      const ordered = content.postOrder
        .map((id) => socialPostMap.get(id))
        .filter((post): post is BuilderSocialPost => Boolean(post))
      const remaining = socialPosts.filter((post) => !content.postOrder.includes(post.id))
      const filtered = [...ordered, ...remaining].filter((post) => {
        if (filter === "public") return !post.locked
        if (filter === "locked") return post.locked
        return true
      })
      const visible = filtered.slice(0, maxItems)

      return (
        <div className="w-full">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold">Social Posts</h2>
            <Button type="button" size="sm" onClick={onCreatePost}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create New Post
            </Button>
          </div>
          {visible.length === 0 ? (
            <div className="flex min-h-[180px] items-center justify-center border border-dashed border-muted-foreground/30 text-sm text-muted-foreground">
              No posts available
            </div>
          ) : (
            <div className="space-y-0">
              {visible.map((post) => {
                const firstMedia = post.medias[0]
                return (
                  <div
                    key={`${sectionId}-${item.id}-${post.id}`}
                    className="overflow-hidden rounded-none border-b border-zinc-200 bg-white shadow-none transition-colors dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="p-4 pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex w-full items-start gap-3">
                          <Avatar className="h-11 w-11 border border-zinc-200 dark:border-zinc-700">
                            <AvatarImage src={post.creatorProfileUrl ?? undefined} alt={post.creatorName} />
                            <AvatarFallback>{post.creatorName.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <div className="flex items-center gap-2 leading-none">
                              <span className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                {post.creatorName}
                              </span>
                              <span className="inline-flex h-5 items-center rounded px-1 text-[11px] text-zinc-700 ring-1 ring-zinc-300 dark:text-zinc-200 dark:ring-zinc-700">
                                {post.locked ? "Locked" : "Public"}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                              {formatRelativePostTime(post.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 overflow-hidden px-4 pb-3 pt-1">
                      <div className="space-y-3">
                        {post.heading ? (
                          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{post.heading}</h2>
                        ) : null}
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">{stripHtml(post.content)}</p>
                        {content.showMedia !== false && firstMedia ? (
                          <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
                            {firstMedia.type === "IMAGE" ? (
                              <img src={firstMedia.url} alt={post.heading ?? "Post media"} className="h-56 w-full object-cover" />
                            ) : (
                              <div className="flex h-40 items-center justify-center bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                                {firstMedia.type}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {content.showEngagement !== false ? (
                      <div className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
                        <div className="flex w-full items-center gap-2">
                          <div className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-zinc-600 dark:text-zinc-300">
                            <span className="text-xs">{post.likeCount}</span>
                            <span className="text-xs">Likes</span>
                          </div>
                          <div className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-zinc-600 dark:text-zinc-300">
                            <span className="text-xs">{post.commentCount}</span>
                            <span className="text-xs">Comments</span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="min-h-[180px] w-full border border-dashed border-muted-foreground/30 bg-muted/30 p-6">
        <div className="flex min-h-[140px] items-center justify-center">
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-2"
            onClick={(event) => {
              event.stopPropagation()
              setAddItemTarget({ sectionId, containerId: item.id })
            }}
          >
            <PlusIcon className="h-4 w-4" />
            Add item
          </Button>
        </div>
      </div>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="mt-8">
        {isSelectionMode && orderedSections.length === 0 ? (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2"
              onClick={() => addSection()}
            >
              <PlusIcon className="h-4 w-4" />
              Add new section
            </Button>
          </div>
        ) : null}

        {orderedSections.map((section) => {
          const orderedItems = [...section.items].sort((a, b) => a.order - b.order)
          const sectionGap = clampSectionContainerGap(section.containerGap ?? 0)
          const verticalSectionMinHeight =
            orderedItems.length * 180 + Math.max(0, orderedItems.length - 1) * Math.max(1, sectionGap)
          return (
            <SectionShell
              key={section.id}
              id={section.id}
              index={section.order}
              hasContainers={orderedItems.length > 0}
              hideSectionFrame={Boolean(section.hideSectionFrame)}
              marginTop={section.marginTop ?? 0}
              marginBottom={section.marginBottom ?? 0}
              onMove={moveSection}
            >
              {orderedItems.length === 0 ? (
                <div className="flex items-center justify-center border border-dashed border-muted-foreground/30 bg-muted/20 p-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 gap-2"
                    onClick={() => addContainer(section.id)}
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add container
                  </Button>
                </div>
              ) : section.direction === "column" ? (
                <div
                  className="flex w-full flex-col"
                  style={{
                    minHeight: `${verticalSectionMinHeight}px`,
                    gap: `${Math.max(1, sectionGap)}px`,
                  }}
                >
                  {orderedItems.map((item, index) => (
                    <div key={item.id} className="min-h-[180px] overflow-visible">
                      <div
                        className="h-full"
                        style={{
                          flexGrow: Math.max(10, Math.min(95, item.widthPct)),
                        }}
                      >
                        <SectionContainerCard
                          sectionId={section.id}
                          id={item.id}
                          index={index}
                          direction={section.direction}
                          isSubscription={item.content?.type === "subscription"}
                          hideContainerFrame={item.hideContainerFrame !== false}
                          onMove={moveContainer}
                          canInsert={orderedItems.length < MAX_CONTAINERS_PER_SECTION}
                          onAddBefore={() =>
                            addContainer(section.id, {
                              aroundId: item.id,
                              position: "before",
                            })
                          }
                          onAddAfter={() =>
                            addContainer(section.id, {
                              aroundId: item.id,
                              position: "after",
                            })
                          }
                        >
                          {renderContainerBody(section.id, item)}
                        </SectionContainerCard>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ResizablePanelGroup
                  orientation="horizontal"
                  onLayoutChange={(sizes) => handleSectionResize(section.id, sizes)}
                  className="w-full"
                >
                  {orderedItems.map((item, index) => (
                    <Fragment key={item.id}>
                      <ResizablePanel
                        id={item.id}
                        defaultSize={`${item.widthPct}%`}
                        minSize={10}
                        className="overflow-visible"
                      >
                        <SectionContainerCard
                          sectionId={section.id}
                          id={item.id}
                          index={index}
                          direction={section.direction}
                          isSubscription={item.content?.type === "subscription"}
                          hideContainerFrame={item.hideContainerFrame !== false}
                          onMove={moveContainer}
                          canInsert={orderedItems.length < MAX_CONTAINERS_PER_SECTION}
                          onAddBefore={() =>
                            addContainer(section.id, {
                              aroundId: item.id,
                              position: "before",
                            })
                          }
                          onAddAfter={() =>
                            addContainer(section.id, {
                              aroundId: item.id,
                              position: "after",
                            })
                          }
                        >
                          {renderContainerBody(section.id, item)}
                        </SectionContainerCard>
                      </ResizablePanel>
                      {index < orderedItems.length - 1 ? (
                        <ResizableHandle
                          className="bg-transparent hover:bg-border/30"
                          style={{ width: `${Math.max(1, sectionGap)}px` }}
                        />
                      ) : null}
                    </Fragment>
                  ))}
                </ResizablePanelGroup>
              )}
            </SectionShell>
          )
        })}

        {isSelectionMode && orderedSections.length > 0 ? (
          <div className="pt-6 flex justify-center">
            <Button type="button" variant="outline" className="h-9 gap-2" onClick={() => addSection()}>
              <PlusIcon className="h-4 w-4" />
              Add new section
            </Button>
          </div>
        ) : null}

        {isSelectionMode && selectedSection ? (
          <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex justify-center px-3">
            <motion.div
              initial={{ y: 28, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 28, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              className="pointer-events-auto relative w-full max-w-[720px] overflow-hidden rounded-2xl border border-black/20 p-2 sm:w-fit"
              onPointerDown={(event) => {
                event.stopPropagation()
              }}
              onClick={(event) => {
                event.stopPropagation()
              }}
            >
              <Glass
                className={{
                  root: "pointer-events-none absolute inset-0 z-0 rounded-2xl *:rounded-2xl",
                  tint: "bg-[#f3f1ea]/70",
                  effect: "backdrop-blur-[8px]",
                  shine:
                    "shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.85),_inset_-1px_-1px_1px_1px_rgba(255,255,255,0.5)]",
                }}
              />
              <div className="relative z-10 flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <Select
                  value={selectedSection.direction}
                  onValueChange={(value) =>
                    setSectionDirection(selectedSection.id, value as "row" | "column")
                  }
                >
                  <SelectTrigger className="h-9 w-full shrink-0 border-black/20 bg-white/80 sm:w-40">
                    <SelectValue placeholder="Direction" />
                  </SelectTrigger>
                  <SelectContent side="top" align="start">
                    <SelectItem value="row">Row</SelectItem>
                    <SelectItem value="column">Column</SelectItem>
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-9 w-9 shrink-0 border border-black/20 bg-white/80 hover:bg-white"
                    >
                      <SlidersHorizontalIcon className="h-4 w-4" />
                      <span className="sr-only">Adjust section margins</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="start"
                    className="w-[320px] rounded-[28px] border border-[#d9d9db] bg-white px-6 py-4 shadow-[0_16px_28px_rgba(0,0,0,0.08)]"
                  >
                    <div className="space-y-5">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[16px] font-semibold text-[#25262b]">Top Margin</p>
                          <span className="text-sm text-[#4e4f55]">{selectedSection.marginTop ?? 0}px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={240}
                          step={1}
                          value={selectedSection.marginTop ?? 0}
                          onChange={(event) =>
                            setSectionMargins(selectedSection.id, {
                              marginTop: Number.parseInt(event.target.value, 10),
                            })
                          }
                          className="cover-height-slider w-full"
                          style={{ "--cover-progress": `${Math.round(((selectedSection.marginTop ?? 0) / 240) * 100)}%` } as CSSProperties}
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[16px] font-semibold text-[#25262b]">Bottom Margin</p>
                          <span className="text-sm text-[#4e4f55]">{selectedSection.marginBottom ?? 0}px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={240}
                          step={1}
                          value={selectedSection.marginBottom ?? 0}
                          onChange={(event) =>
                            setSectionMargins(selectedSection.id, {
                              marginBottom: Number.parseInt(event.target.value, 10),
                            })
                          }
                          className="cover-height-slider w-full"
                          style={{ "--cover-progress": `${Math.round(((selectedSection.marginBottom ?? 0) / 240) * 100)}%` } as CSSProperties}
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[16px] font-semibold text-[#25262b]">Container Gap</p>
                          <span className="text-sm text-[#4e4f55]">{selectedSection.containerGap ?? 0}px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={64}
                          step={1}
                          value={selectedSection.containerGap ?? 0}
                          onChange={(event) =>
                            setSectionContainerGap(
                              selectedSection.id,
                              Number.parseInt(event.target.value, 10),
                            )
                          }
                          className="cover-height-slider w-full"
                          style={
                            {
                              "--cover-progress": `${Math.round(((selectedSection.containerGap ?? 0) / 64) * 100)}%`,
                            } as CSSProperties
                          }
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 flex-1 border border-black/20 bg-white/80 text-red-600 hover:bg-white sm:flex-none"
                  onClick={() => deleteSection(selectedSection.id)}
                >
                  <Trash2Icon className="h-4 w-4" />
                  Delete
                </Button>
                <div className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-black/20 bg-white/80 px-3 sm:w-auto sm:justify-start">
                  <span className="text-xs font-medium text-foreground">Hide frame</span>
                  <Switch
                    checked={Boolean(selectedSection.hideSectionFrame)}
                    onCheckedChange={(checked) =>
                      setSectionFrameVisibility(selectedSection.id, checked)
                    }
                  />
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}

        <Dialog
          open={Boolean(addItemTarget)}
          onOpenChange={(open) => {
            if (!open) setAddItemTarget(null)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add item</DialogTitle>
              <DialogDescription>Select what to place in this container.</DialogDescription>
            </DialogHeader>
            <div className="pt-2">
              {canAddSubscriptionItem || canAddStatsItem || canAddNftCollectionItem || canAddSocialPostsItem ? (
                <div className="space-y-2">
                  {canAddSubscriptionItem ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full justify-start"
                      onClick={() => {
                        if (!addItemTarget) return
                        setContainerContent(addItemTarget.sectionId, addItemTarget.containerId, {
                          type: "subscription",
                          packageOrder: subscriptions.map((pkg) => pkg.id),
                          gradientMode: false,
                        })
                        setAddItemTarget(null)
                      }}
                    >
                      Subscription
                    </Button>
                  ) : null}
                  {canAddStatsItem ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full justify-start"
                      onClick={() => {
                        if (!addItemTarget) return
                        setContainerContent(addItemTarget.sectionId, addItemTarget.containerId, {
                          type: "stats",
                          metricOrder: [...DEFAULT_STATS_METRIC_ORDER],
                          showIcons: true,
                        })
                        setAddItemTarget(null)
                      }}
                    >
                      Stats
                    </Button>
                  ) : null}
                  {canAddNftCollectionItem ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full justify-start"
                      onClick={() => {
                        if (!addItemTarget) return
                        setContainerContent(addItemTarget.sectionId, addItemTarget.containerId, {
                          type: "nft_collection",
                          nftOrder: nftCards.map((card) => card.id),
                          showCreator: true,
                          showPrice: true,
                          maxItems: DEFAULT_NFT_MAX_ITEMS,
                        })
                        setAddItemTarget(null)
                      }}
                    >
                      Creator&apos;s NFT Collection
                    </Button>
                  ) : null}
                  {canAddSocialPostsItem ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full justify-start"
                      onClick={() => {
                        if (!addItemTarget) return
                        setContainerContent(addItemTarget.sectionId, addItemTarget.containerId, {
                          type: "social_posts",
                          postOrder: socialPosts.map((post) => post.id),
                          filter: "all",
                          showMedia: true,
                          showEngagement: true,
                          maxItems: DEFAULT_SOCIAL_POST_MAX_ITEMS,
                        })
                        setAddItemTarget(null)
                      }}
                    >
                      Social Posts
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No items available to add.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {isSelectionMode &&
        selectedOverlay?.kind === "container" &&
        selectedContainerSectionId &&
        selectedContainer?.content?.type === "subscription" ? (
          <div className="pointer-events-none fixed right-3 top-1/2 z-[85] -translate-y-1/2">
            <div
              className="pointer-events-auto relative w-[280px] overflow-hidden rounded-2xl border border-black/20 p-3"
              onPointerDown={(event) => {
                event.stopPropagation()
              }}
              onClick={(event) => {
                event.stopPropagation()
              }}
            >
              <Glass
                className={{
                  root: "pointer-events-none absolute inset-0 z-0 rounded-2xl *:rounded-2xl",
                  tint: "bg-[#f3f1ea]/90",
                  effect: "backdrop-blur-[10px]",
                  shine:
                    "shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.85),_inset_-1px_-1px_1px_1px_rgba(255,255,255,0.5)]",
                }}
              />
              <div className="relative z-10 space-y-3">
                <p className="text-sm font-semibold">Subscription container</p>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Reorder package item</p>
                  <div className="max-h-[220px] space-y-1 overflow-y-auto pr-1">
                    {selectedSubscriptionPackages.map((pkg) => (
                      <SubscriptionPackageOrderRow
                        key={pkg.id}
                        pkg={pkg}
                        sectionId={selectedContainerSectionId}
                        containerId={selectedContainer.id}
                        onMove={moveSubscriptionPackage}
                      />
                    ))}
                  </div>
                </div>
                <div className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-black/20 bg-white/80 px-3">
                  <span className="text-xs font-medium text-foreground">Gradient mode</span>
                  <Switch
                    checked={Boolean(selectedSubscriptionContent?.gradientMode)}
                    onCheckedChange={(checked) =>
                      setContainerContent(selectedContainerSectionId, selectedContainer.id, {
                        type: "subscription",
                        packageOrder: selectedSubscriptionContent?.packageOrder ?? [],
                        gradientMode: checked,
                      })
                    }
                  />
                </div>
                <div className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-black/20 bg-white/80 px-3">
                  <span className="text-xs font-medium text-foreground">Show frame</span>
                  <Switch
                    checked={!selectedContainer.hideContainerFrame}
                    onCheckedChange={(checked) =>
                      setContainerFrameVisibility(
                        selectedContainerSectionId,
                        selectedContainer.id,
                        !checked,
                      )
                    }
                  />
                </div>
                <Button type="button" variant="secondary" className="h-9 w-full" onClick={onCreatePackage}>
                  Create new package
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 w-full border border-black/20 bg-white/80 text-red-600 hover:bg-white"
                  onClick={() => deleteContainer(selectedContainerSectionId, selectedContainer.id)}
                >
                  Delete container
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        {isSelectionMode &&
        selectedOverlay?.kind === "container" &&
        selectedContainerSectionId &&
        selectedContainer?.content?.type === "stats" ? (
          <div className="pointer-events-none fixed right-3 top-1/2 z-[85] -translate-y-1/2">
            <div
              className="pointer-events-auto relative w-[280px] overflow-hidden rounded-2xl border border-black/20 p-3"
              onPointerDown={(event) => {
                event.stopPropagation()
              }}
              onClick={(event) => {
                event.stopPropagation()
              }}
            >
              <Glass
                className={{
                  root: "pointer-events-none absolute inset-0 z-0 rounded-2xl *:rounded-2xl",
                  tint: "bg-[#f3f1ea]/90",
                  effect: "backdrop-blur-[10px]",
                  shine:
                    "shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.85),_inset_-1px_-1px_1px_1px_rgba(255,255,255,0.5)]",
                }}
              />
              <div className="relative z-10 space-y-3">
                <p className="text-sm font-semibold">Stats container</p>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Reorder stats</p>
                  <div className="space-y-1">
                    {selectedStatsMetricOrder.map((metric) => (
                      <StatsMetricOrderRow
                        key={`${selectedContainer.id}-${metric}`}
                        metric={metric}
                        sectionId={selectedContainerSectionId}
                        containerId={selectedContainer.id}
                        onMove={moveStatsMetric}
                      />
                    ))}
                  </div>
                </div>
                <div className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-black/20 bg-white/80 px-3">
                  <span className="text-xs font-medium text-foreground">Show icons</span>
                  <Switch
                    checked={selectedStatsContent?.showIcons !== false}
                    onCheckedChange={(checked) =>
                      setContainerContent(selectedContainerSectionId, selectedContainer.id, {
                        type: "stats",
                        metricOrder: normalizeStatsMetricOrder(selectedStatsContent?.metricOrder),
                        showIcons: checked,
                      })
                    }
                  />
                </div>
                <div className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-black/20 bg-white/80 px-3">
                  <span className="text-xs font-medium text-foreground">Show frame</span>
                  <Switch
                    checked={!selectedContainer.hideContainerFrame}
                    onCheckedChange={(checked) =>
                      setContainerFrameVisibility(
                        selectedContainerSectionId,
                        selectedContainer.id,
                        !checked,
                      )
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 w-full border border-black/20 bg-white/80 text-red-600 hover:bg-white"
                  onClick={() => deleteContainer(selectedContainerSectionId, selectedContainer.id)}
                >
                  Delete container
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        {isSelectionMode &&
        selectedOverlay?.kind === "container" &&
        selectedContainerSectionId &&
        selectedContainer?.content?.type === "nft_collection" ? (
          <div className="pointer-events-none fixed right-3 top-1/2 z-[85] -translate-y-1/2">
            <div
              className="pointer-events-auto relative w-[300px] overflow-hidden rounded-2xl border border-black/20 p-3"
              onPointerDown={(event) => {
                event.stopPropagation()
              }}
              onClick={(event) => {
                event.stopPropagation()
              }}
            >
              <Glass
                className={{
                  root: "pointer-events-none absolute inset-0 z-0 rounded-2xl *:rounded-2xl",
                  tint: "bg-[#f3f1ea]/90",
                  effect: "backdrop-blur-[10px]",
                  shine:
                    "shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.85),_inset_-1px_-1px_1px_1px_rgba(255,255,255,0.5)]",
                }}
              />
              <div className="relative z-10 space-y-3">
                <p className="text-sm font-semibold">NFT collection container</p>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Reorder NFTs</p>
                  <div className="max-h-[220px] space-y-1 overflow-y-auto pr-1">
                    {selectedNftCards.map((nft) => (
                      <NftOrderRow
                        key={`${selectedContainer.id}-${nft.id}`}
                        nft={nft}
                        sectionId={selectedContainerSectionId}
                        containerId={selectedContainer.id}
                        onMove={moveNftCard}
                      />
                    ))}
                  </div>
                </div>
                <div className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-black/20 bg-white/80 px-3">
                  <span className="text-xs font-medium text-foreground">Show creator</span>
                  <Switch
                    checked={selectedNftContent?.showCreator !== false}
                    onCheckedChange={(checked) =>
                      setContainerContent(selectedContainerSectionId, selectedContainer.id, {
                        type: "nft_collection",
                        nftOrder: selectedNftContent?.nftOrder ?? [],
                        showCreator: checked,
                        showPrice: selectedNftContent?.showPrice !== false,
                        maxItems: normalizeNftMaxItems(selectedNftContent?.maxItems),
                      })
                    }
                  />
                </div>
                <div className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-black/20 bg-white/80 px-3">
                  <span className="text-xs font-medium text-foreground">Show price</span>
                  <Switch
                    checked={selectedNftContent?.showPrice !== false}
                    onCheckedChange={(checked) =>
                      setContainerContent(selectedContainerSectionId, selectedContainer.id, {
                        type: "nft_collection",
                        nftOrder: selectedNftContent?.nftOrder ?? [],
                        showCreator: selectedNftContent?.showCreator !== false,
                        showPrice: checked,
                        maxItems: normalizeNftMaxItems(selectedNftContent?.maxItems),
                      })
                    }
                  />
                </div>
                <div className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-black/20 bg-white/80 px-3">
                  <span className="text-xs font-medium text-foreground">Show frame</span>
                  <Switch
                    checked={!selectedContainer.hideContainerFrame}
                    onCheckedChange={(checked) =>
                      setContainerFrameVisibility(
                        selectedContainerSectionId,
                        selectedContainer.id,
                        !checked,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">Max items</span>
                    <span className="text-xs text-muted-foreground">
                      {normalizeNftMaxItems(selectedNftContent?.maxItems)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    step={1}
                    value={normalizeNftMaxItems(selectedNftContent?.maxItems)}
                    onChange={(event) =>
                      setContainerContent(selectedContainerSectionId, selectedContainer.id, {
                        type: "nft_collection",
                        nftOrder: selectedNftContent?.nftOrder ?? [],
                        showCreator: selectedNftContent?.showCreator !== false,
                        showPrice: selectedNftContent?.showPrice !== false,
                        maxItems: Number.parseInt(event.target.value, 10),
                      })
                    }
                    className="cover-height-slider w-full"
                    style={
                      {
                        "--cover-progress": `${Math.round((normalizeNftMaxItems(selectedNftContent?.maxItems) / 12) * 100)}%`,
                      } as CSSProperties
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 w-full border border-black/20 bg-white/80 text-red-600 hover:bg-white"
                  onClick={() => deleteContainer(selectedContainerSectionId, selectedContainer.id)}
                >
                  Delete container
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        {isSelectionMode &&
        selectedOverlay?.kind === "container" &&
        selectedContainerSectionId &&
        selectedContainer?.content?.type === "social_posts" ? (
          <div className="pointer-events-none fixed right-3 top-1/2 z-[85] -translate-y-1/2">
            <div
              className="pointer-events-auto relative w-[300px] overflow-hidden rounded-2xl border border-black/20 p-3"
              onPointerDown={(event) => {
                event.stopPropagation()
              }}
              onClick={(event) => {
                event.stopPropagation()
              }}
            >
              <Glass
                className={{
                  root: "pointer-events-none absolute inset-0 z-0 rounded-2xl *:rounded-2xl",
                  tint: "bg-[#f3f1ea]/90",
                  effect: "backdrop-blur-[10px]",
                  shine:
                    "shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.85),_inset_-1px_-1px_1px_1px_rgba(255,255,255,0.5)]",
                }}
              />
              <div className="relative z-10 space-y-3">
                <p className="text-sm font-semibold">Social posts container</p>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Reorder posts</p>
                  <div className="max-h-[220px] space-y-1 overflow-y-auto pr-1">
                    {selectedSocialPosts.map((post) => (
                      <SocialPostOrderRow
                        key={`${selectedContainer.id}-${post.id}`}
                        post={post}
                        sectionId={selectedContainerSectionId}
                        containerId={selectedContainer.id}
                        onMove={moveSocialPost}
                      />
                    ))}
                  </div>
                </div>
                <Select
                  value={selectedSocialPostsContent?.filter ?? "all"}
                  onValueChange={(value) =>
                    setContainerContent(selectedContainerSectionId, selectedContainer.id, {
                      type: "social_posts",
                      postOrder: selectedSocialPostsContent?.postOrder ?? [],
                      filter: value as "all" | "public" | "locked",
                      showMedia: selectedSocialPostsContent?.showMedia !== false,
                      showEngagement: selectedSocialPostsContent?.showEngagement !== false,
                      maxItems: normalizeSocialPostMaxItems(selectedSocialPostsContent?.maxItems),
                    })
                  }
                >
                  <SelectTrigger className="h-9 w-full border-black/20 bg-white/80">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent side="left" align="start">
                    <SelectItem value="all">All Posts</SelectItem>
                    <SelectItem value="public">Public Only</SelectItem>
                    <SelectItem value="locked">Locked Only</SelectItem>
                  </SelectContent>
                </Select>
                <div className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-black/20 bg-white/80 px-3">
                  <span className="text-xs font-medium text-foreground">Show media</span>
                  <Switch
                    checked={selectedSocialPostsContent?.showMedia !== false}
                    onCheckedChange={(checked) =>
                      setContainerContent(selectedContainerSectionId, selectedContainer.id, {
                        type: "social_posts",
                        postOrder: selectedSocialPostsContent?.postOrder ?? [],
                        filter: selectedSocialPostsContent?.filter ?? "all",
                        showMedia: checked,
                        showEngagement: selectedSocialPostsContent?.showEngagement !== false,
                        maxItems: normalizeSocialPostMaxItems(selectedSocialPostsContent?.maxItems),
                      })
                    }
                  />
                </div>
                <div className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-black/20 bg-white/80 px-3">
                  <span className="text-xs font-medium text-foreground">Show engagement</span>
                  <Switch
                    checked={selectedSocialPostsContent?.showEngagement !== false}
                    onCheckedChange={(checked) =>
                      setContainerContent(selectedContainerSectionId, selectedContainer.id, {
                        type: "social_posts",
                        postOrder: selectedSocialPostsContent?.postOrder ?? [],
                        filter: selectedSocialPostsContent?.filter ?? "all",
                        showMedia: selectedSocialPostsContent?.showMedia !== false,
                        showEngagement: checked,
                        maxItems: normalizeSocialPostMaxItems(selectedSocialPostsContent?.maxItems),
                      })
                    }
                  />
                </div>
                <div className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-black/20 bg-white/80 px-3">
                  <span className="text-xs font-medium text-foreground">Show frame</span>
                  <Switch
                    checked={!selectedContainer.hideContainerFrame}
                    onCheckedChange={(checked) =>
                      setContainerFrameVisibility(
                        selectedContainerSectionId,
                        selectedContainer.id,
                        !checked,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">Max items</span>
                    <span className="text-xs text-muted-foreground">
                      {normalizeSocialPostMaxItems(selectedSocialPostsContent?.maxItems)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    step={1}
                    value={normalizeSocialPostMaxItems(selectedSocialPostsContent?.maxItems)}
                    onChange={(event) =>
                      setContainerContent(selectedContainerSectionId, selectedContainer.id, {
                        type: "social_posts",
                        postOrder: selectedSocialPostsContent?.postOrder ?? [],
                        filter: selectedSocialPostsContent?.filter ?? "all",
                        showMedia: selectedSocialPostsContent?.showMedia !== false,
                        showEngagement: selectedSocialPostsContent?.showEngagement !== false,
                        maxItems: Number.parseInt(event.target.value, 10),
                      })
                    }
                    className="cover-height-slider w-full"
                    style={
                      {
                        "--cover-progress": `${Math.round((normalizeSocialPostMaxItems(selectedSocialPostsContent?.maxItems) / 12) * 100)}%`,
                      } as CSSProperties
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 w-full border border-black/20 bg-white/80 text-red-600 hover:bg-white"
                  onClick={() => deleteContainer(selectedContainerSectionId, selectedContainer.id)}
                >
                  Delete container
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DndProvider>
  )
}

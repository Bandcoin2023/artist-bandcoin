"use client"

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react"
import { motion } from "motion/react"
import { CheckCircle2Icon, GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react"
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
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/shadcn/ui/resizable"
import { cn } from "~/lib/utils"

export type SectionLayoutItem = {
  id: string
  widthPct: number
  order: number
  kind: "container"
  content?: SectionContainerContent | null
}

export type SectionLayoutSection = {
  id: string
  order: number
  direction: "row" | "column"
  hideSectionFrame?: boolean
  items: SectionLayoutItem[]
}

export type SectionLayout = {
  version: 2
  sections: SectionLayoutSection[]
}

export type SectionContainerContent = {
  type: "subscription"
  packageOrder: number[]
  gradientMode?: boolean
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

function clampWidth(width: number) {
  return Math.max(5, Math.min(95, width))
}

function createContainer(seed: number): SectionLayoutItem {
  return {
    id: `container-${seed}`,
    widthPct: 100,
    order: 0,
    kind: "container",
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
    const value = sizes[index]
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
      {children}
    </div>
  )
}

function SectionShell({
  id,
  index,
  hasContainers,
  hideSectionFrame,
  onMove,
  children,
}: {
  id: string
  index: number
  hasContainers: boolean
  hideSectionFrame: boolean
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

export function ProfileSectionBuilder({
  layout,
  onLayoutChange,
  subscriptions,
  onCreatePackage,
}: {
  layout: SectionLayout
  onLayoutChange: (layout: SectionLayout) => void
  subscriptions: BuilderSubscriptionPackage[]
  onCreatePackage: () => void
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
      let nextList = [...current]

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
      gradientMode: Boolean(selectedContainer?.content?.gradientMode),
    })
  }

  const subscriptionPackageMap = useMemo(
    () => new Map(subscriptions.map((pkg) => [pkg.id, pkg])),
    [subscriptions],
  )
  const selectedSubscriptionPackages = useMemo(() => {
    if (selectedContainer?.content?.type !== "subscription") return []
    const ordered = selectedContainer.content.packageOrder
      .map((id) => subscriptionPackageMap.get(id))
      .filter((pkg): pkg is BuilderSubscriptionPackage => Boolean(pkg))
    const remaining = subscriptions.filter((pkg) => !selectedContainer.content?.packageOrder.includes(pkg.id))
    return [...ordered, ...remaining]
  }, [selectedContainer, subscriptionPackageMap, subscriptions])
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

  const renderContainerBody = (sectionId: string, item: SectionLayoutItem) => {
    if (item.content?.type === "subscription") {
      const isGradientMode = Boolean(item.content.gradientMode)
      const orderedPackages = item.content.packageOrder
        .map((id) => subscriptionPackageMap.get(id))
        .filter((pkg): pkg is BuilderSubscriptionPackage => Boolean(pkg))
      const remainingPackages = subscriptions.filter((pkg) => !item.content?.packageOrder.includes(pkg.id))
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
          return (
            <SectionShell
              key={section.id}
              id={section.id}
              index={section.order}
              hasContainers={orderedItems.length > 0}
              hideSectionFrame={Boolean(section.hideSectionFrame)}
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
                <ResizablePanelGroup
                  orientation="vertical"
                  onLayoutChange={(sizes) => handleSectionResize(section.id, sizes)}
                  className="w-full min-h-[220px]"
                >
                  {orderedItems.map((item, index) => (
                    <Fragment key={item.id}>
                      <ResizablePanel
                        id={item.id}
                        defaultSize={item.widthPct}
                        minSize={10}
                        className="min-h-[180px] overflow-visible"
                      >
                        <SectionContainerCard
                          sectionId={section.id}
                          id={item.id}
                          index={index}
                          direction={section.direction}
                          isSubscription={item.content?.type === "subscription"}
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
                        <ResizableHandle className="h-px w-full bg-border/45 hover:bg-border/70" />
                      ) : null}
                    </Fragment>
                  ))}
                </ResizablePanelGroup>
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
                        <ResizableHandle className="w-px bg-border/45 hover:bg-border/70" />
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
              className="pointer-events-auto relative w-fit overflow-hidden rounded-2xl border border-black/20 p-2"
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
              <div className="relative z-10 flex items-center gap-2">
                <Select
                  value={selectedSection.direction}
                  onValueChange={(value) =>
                    setSectionDirection(selectedSection.id, value as "row" | "column")
                  }
                >
                  <SelectTrigger className="h-9 w-40 shrink-0 border-black/20 bg-white/80">
                    <SelectValue placeholder="Direction" />
                  </SelectTrigger>
                  <SelectContent side="top" align="start">
                    <SelectItem value="row">Row</SelectItem>
                    <SelectItem value="column">Column</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 border border-black/20 bg-white/80 text-red-600 hover:bg-white"
                  onClick={() => deleteSection(selectedSection.id)}
                >
                  <Trash2Icon className="h-4 w-4" />
                  Delete
                </Button>
                <div className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/20 bg-white/80 px-3">
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
            <div className="pointer-events-auto relative w-[280px] overflow-hidden rounded-2xl border border-black/20 p-3">
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
                    checked={Boolean(selectedContainer.content.gradientMode)}
                    onCheckedChange={(checked) =>
                      setContainerContent(selectedContainerSectionId, selectedContainer.id, {
                        type: "subscription",
                        packageOrder: selectedContainer.content?.packageOrder ?? [],
                        gradientMode: checked,
                      })
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
      </div>
    </DndProvider>
  )
}

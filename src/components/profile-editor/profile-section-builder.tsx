"use client"

import { Fragment, useMemo, useState, type ReactNode } from "react"
import { GripVerticalIcon, PlusIcon } from "lucide-react"
import { useDrag, useDrop, DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import type { Layout } from "react-resizable-panels"
import { Button } from "~/components/shadcn/ui/button"
import { useProfileEditorStore } from "~/components/profile-editor/store/editor-store"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/shadcn/ui/resizable"

export type SectionLayoutItem = {
  id: string
  widthPct: number
  order: number
  kind: "container"
}

export type SectionLayoutSection = {
  id: string
  order: number
  items: SectionLayoutItem[]
}

export type SectionLayout = {
  version: 2
  sections: SectionLayoutSection[]
}

const SECTION_ITEM_TYPE = "PROFILE_SECTION"
const CONTAINER_ITEM_TYPE = "PROFILE_SECTION_CONTAINER"
const MAX_CONTAINERS_PER_SECTION = 4

function clampWidth(width: number) {
  return Math.max(5, Math.min(95, width))
}

function createContainer(seed: number): SectionLayoutItem {
  return {
    id: `container-${seed}`,
    widthPct: 100,
    order: 0,
    kind: "container",
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

function SectionContainerCard({
  sectionId,
  id,
  index,
  onMove,
  canInsert,
  onAddBefore,
  onAddAfter,
  children,
}: {
  sectionId: string
  id: string
  index: number
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
      className={`group relative h-full bg-background/70 p-0 transition-opacity ${
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
            ref={dragRef}
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
            className="absolute left-1 top-1/2 z-30 h-6 w-6 -translate-y-1/2 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
            onClick={(event) => {
              event.stopPropagation()
              onAddBefore()
            }}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            <span className="sr-only">Add container before</span>
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute right-1 top-1/2 z-30 h-6 w-6 -translate-y-1/2 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
            onClick={(event) => {
              event.stopPropagation()
              onAddAfter()
            }}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            <span className="sr-only">Add container after</span>
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
  onMove,
  children,
}: {
  id: string
  index: number
  hasContainers: boolean
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
  const showChip = hasContainers || showOverlay
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
            ref={dragRef}
            className="pointer-events-auto inline-flex h-4 w-4 cursor-grab items-center justify-center rounded-sm hover:bg-muted active:cursor-grabbing"
            aria-label="Drag section"
            onClick={(event) => event.stopPropagation()}
          >
            <GripVerticalIcon className="h-3.5 w-3.5" />
          </button>
          <span>Section {index + 1}</span>
        </div>
      ) : null}
      {children}
    </div>
  )
}

export function ProfileSectionBuilder({
  layout,
  onLayoutChange,
}: {
  layout: SectionLayout
  onLayoutChange: (layout: SectionLayout) => void
}) {
  const orderedSections = useMemo(
    () => [...layout.sections].sort((a, b) => a.order - b.order),
    [layout.sections],
  )

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
        .map((item) => {
          const rawSize = sizes[item.id]
          const parsedSize =
            typeof rawSize === "number"
              ? rawSize
              : typeof rawSize === "string"
                ? Number.parseFloat(rawSize)
                : item.widthPct

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
      items: [],
    }

    current.splice(insertAt, 0, nextSection)
    const nextSections = current.map((section, index) => ({
      ...section,
      order: index,
    }))

    onLayoutChange({ version: 2, sections: nextSections })
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

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="mt-8">
        {orderedSections.length === 0 ? (
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
              onMove={moveSection}
            >
              {orderedItems.length === 0 ? (
                <div className="flex min-h-[220px] items-center justify-center border border-dashed border-muted-foreground/30 bg-muted/20 p-4">
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
              ) : (
                <ResizablePanelGroup
                  orientation="horizontal"
                  onLayoutChange={(sizes) => handleSectionResize(section.id, sizes)}
                  className="min-h-[220px]"
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
                          <div className="h-full min-h-[180px] w-full border border-dashed border-muted-foreground/30 bg-muted/30 p-4">
                            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                              Drop or add items here
                            </div>
                          </div>
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

        {orderedSections.length > 0 ? (
          <div className="pt-6 flex justify-center">
            <Button type="button" variant="outline" className="h-9 gap-2" onClick={() => addSection()}>
              <PlusIcon className="h-4 w-4" />
              Add new section
            </Button>
          </div>
        ) : null}
      </div>
    </DndProvider>
  )
}

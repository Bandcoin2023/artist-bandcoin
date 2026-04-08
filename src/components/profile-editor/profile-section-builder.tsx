"use client"

import { Fragment, useMemo, type ReactNode } from "react"
import { PlusIcon } from "lucide-react"
import { useDrag, useDrop, DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import type { Layout } from "react-resizable-panels"
import { Button } from "~/components/shadcn/ui/button"
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

const ITEM_TYPE = "PROFILE_SECTION_CONTAINER"
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

function SectionCard({
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
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: ITEM_TYPE,
      item: { id, sectionId },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [id, sectionId],
  )

  const [, dropRef] = useDrop(
    () => ({
      accept: ITEM_TYPE,
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
        dragRef(node)
      }}
      className={`group relative h-full border border-border bg-background/70 p-0 transition-opacity ${
        isDragging ? "opacity-60" : "opacity-100"
      }`}
      data-section-index={index}
    >
      {canInsert ? (
        <>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute left-1 top-1/2 z-20 h-6 w-6 -translate-y-1/2 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
            onClick={onAddBefore}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            <span className="sr-only">Add container before</span>
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute right-1 top-1/2 z-20 h-6 w-6 -translate-y-1/2 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
            onClick={onAddAfter}
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
            <div key={section.id} className="space-y-2">
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
                      <ResizablePanel id={item.id} defaultSize={`${item.widthPct}%`} minSize={10}>
                        <SectionCard
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
                        </SectionCard>
                      </ResizablePanel>
                      {index < orderedItems.length - 1 ? (
                        <ResizableHandle className="w-px bg-border/45 hover:bg-border/70" />
                      ) : null}
                    </Fragment>
                  ))}
                </ResizablePanelGroup>
              )}
            </div>
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

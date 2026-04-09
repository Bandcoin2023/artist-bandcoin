import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react"
import {
  CameraIcon,
  Loader2Icon,
  MonitorIcon,
  SlidersHorizontalIcon,
  SmartphoneIcon,
  UnfoldHorizontalIcon,
} from "lucide-react"
import { UploadS3Button } from "~/components/common/upload-button"
import { Button } from "~/components/shadcn/ui/button"
import { Textarea } from "~/components/shadcn/ui/textarea"
import { api } from "~/utils/api"
import { toast } from "~/components/shadcn/ui/use-toast"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/shadcn/ui/popover"
import {
  type BuilderSubscriptionPackage,
  type SectionContainerContent,
  ProfileSectionBuilder,
  type SectionLayout,
  type SectionLayoutItem,
  type SectionLayoutSection,
} from "~/components/profile-editor/profile-section-builder"
import {
  PROFILE_EDITOR_MESSAGE_SOURCE,
  isParentToPreviewMessage,
  type PreviewToParentMessage,
} from "~/components/profile-editor/lib/communication"
import { useProfileEditorStore } from "~/components/profile-editor/store/editor-store"
import { useAddSubsciptionModalStore } from "~/components/store/add-subscription-modal-store"

const COVER_INPUT_ID = "profile-editor-cover-upload-input"
const PROFILE_INPUT_ID = "profile-editor-avatar-upload-input"

type SavedProfile = {
  name: string
  description: string
}

type CoverHeights = {
  coverHeightDefault: number
  coverHeightDesktop: number
  coverHeightMobile: number
}

const DEFAULT_COVER_HEIGHTS: CoverHeights = {
  coverHeightDefault: 240,
  coverHeightDesktop: 240,
  coverHeightMobile: 220,
}

function isSectionContainerContent(
  value: unknown,
): value is SectionContainerContent {
  if (!value || typeof value !== "object") return false
  const input = value as {
    type?: unknown
    packageOrder?: unknown
    gradientMode?: unknown
    metricOrder?: unknown
    showIcons?: unknown
  }
  if (input.type === "subscription") {
    return (
      Array.isArray(input.packageOrder) &&
      input.packageOrder.every((entry) => typeof entry === "number" && Number.isInteger(entry)) &&
      (input.gradientMode === undefined || typeof input.gradientMode === "boolean")
    )
  }
  if (input.type === "stats") {
    return (
      Array.isArray(input.metricOrder) &&
      input.metricOrder.every(
        (entry) =>
          entry === "followers" || entry === "posts" || entry === "nfts" || entry === "revenue",
      ) &&
      (input.showIcons === undefined || typeof input.showIcons === "boolean")
    )
  }
  return false
}

type BreakpointLayoutMap = {
  responsive: SectionLayout
  desktop: SectionLayout
  mobile: SectionLayout
}

type ViewportKey = "responsive" | "desktop" | "mobile"

type ResponsiveValue<T> = {
  default: T
  desktop: T | null
  mobile: T | null
}

type SectionLayoutConfigItem = {
  id: string
  order: number
  kind: "container"
  widthPct: ResponsiveValue<number>
  content: ResponsiveValue<SectionContainerContent | null>
}

type SectionLayoutConfigSection = {
  id: string
  order: number
  direction: ResponsiveValue<"row" | "column">
  hideSectionFrame: ResponsiveValue<boolean>
  marginTop: ResponsiveValue<number>
  marginBottom: ResponsiveValue<number>
  items: SectionLayoutConfigItem[]
}

type SectionLayoutConfig = {
  version: 3
  sections: SectionLayoutConfigSection[]
}

function createDefaultSectionLayout(): SectionLayout {
  return {
    version: 2,
    sections: [],
  }
}

function createDefaultSectionLayoutConfig(): SectionLayoutConfig {
  return {
    version: 3,
    sections: [],
  }
}

function normalizeLayout(layout: SectionLayout): SectionLayout {
  const sortedSections = [...layout.sections].sort((a, b) => a.order - b.order)
  return {
    version: 2,
    sections: sortedSections.map((section, sectionIndex) => {
      const sortedItems = [...section.items].sort((a, b) => a.order - b.order).slice(0, 4)
      return {
        id: section.id,
        order: sectionIndex,
        direction: section.direction === "column" ? "column" : "row",
        hideSectionFrame: Boolean(section.hideSectionFrame),
        marginTop: normalizeSectionMargin(section.marginTop),
        marginBottom: normalizeSectionMargin(section.marginBottom),
        items: sortedItems.map((item, itemIndex) => ({
          id: item.id,
          widthPct: Math.max(5, Math.min(95, item.widthPct)),
          order: itemIndex,
          kind: "container",
          content: normalizeContainerContent(item.content),
        })),
      }
    }),
  }
}

function normalizeSectionMargin(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0
  return Math.max(0, Math.min(240, Math.round(value)))
}

function normalizeContainerContent(content: unknown): SectionContainerContent | null {
  if (!content || typeof content !== "object") return null
  const value = content as {
    type?: unknown
    packageOrder?: unknown
    gradientMode?: unknown
    metricOrder?: unknown
    showIcons?: unknown
  }
  if (value.type === "subscription") {
    if (!Array.isArray(value.packageOrder)) {
      return {
        type: "subscription",
        packageOrder: [],
        gradientMode: false,
      }
    }

    const deduped: number[] = []
    for (const id of value.packageOrder) {
      if (typeof id !== "number" || !Number.isInteger(id)) continue
      if (deduped.includes(id)) continue
      deduped.push(id)
    }

    return {
      type: "subscription",
      packageOrder: deduped,
      gradientMode: typeof value.gradientMode === "boolean" ? value.gradientMode : false,
    }
  }
  if (value.type === "stats") {
    const safeOrder = Array.isArray(value.metricOrder)
      ? value.metricOrder.filter(
          (entry): entry is "followers" | "posts" | "nfts" | "revenue" =>
            entry === "followers" ||
            entry === "posts" ||
            entry === "nfts" ||
            entry === "revenue",
        )
      : []
    const defaultOrder: Array<"followers" | "posts" | "nfts" | "revenue"> = [
      "followers",
      "posts",
      "nfts",
      "revenue",
    ]
    const deduped = [...new Set([...safeOrder, ...defaultOrder])]
    return {
      type: "stats",
      metricOrder: deduped,
      showIcons: typeof value.showIcons === "boolean" ? value.showIcons : true,
    }
  }
  return null
}

function isSectionLayout(value: unknown): value is SectionLayout {
  if (!value || typeof value !== "object") return false
  const input = value as { version?: unknown; sections?: unknown }
  if (input.version !== 2 || !Array.isArray(input.sections)) return false

  return input.sections.every((section) => {
    if (!section || typeof section !== "object") return false
    const entry = section as Partial<SectionLayoutSection>
    return (
      typeof entry.id === "string" &&
      typeof entry.order === "number" &&
      (entry.direction === "row" || entry.direction === "column") &&
      (entry.marginTop === undefined || typeof entry.marginTop === "number") &&
      (entry.marginBottom === undefined || typeof entry.marginBottom === "number") &&
      Array.isArray(entry.items) &&
      entry.items.every((item) => {
        if (!item || typeof item !== "object") return false
        const rowItem = item as Partial<SectionLayoutItem>
        return (
          typeof rowItem.id === "string" &&
          typeof rowItem.widthPct === "number" &&
          typeof rowItem.order === "number" &&
          rowItem.kind === "container" &&
          (rowItem.content === undefined || rowItem.content === null || Boolean(normalizeContainerContent(rowItem.content)))
        )
      })
    )
  })
}

function isResponsiveValue<T>(
  value: unknown,
  validate: (candidate: unknown) => candidate is T,
): value is ResponsiveValue<T> {
  if (!value || typeof value !== "object") return false
  const input = value as { default?: unknown; desktop?: unknown; mobile?: unknown }
  const desktopValid = input.desktop === null || validate(input.desktop)
  const mobileValid = input.mobile === null || validate(input.mobile)
  return validate(input.default) && desktopValid && mobileValid
}

function isSectionLayoutConfig(value: unknown): value is SectionLayoutConfig {
  if (!value || typeof value !== "object") return false
  const input = value as { version?: unknown; sections?: unknown }
  if (input.version !== 3 || !Array.isArray(input.sections)) return false

  return input.sections.every((section) => {
    if (!section || typeof section !== "object") return false
    const item = section as {
      id?: unknown
      order?: unknown
      direction?: unknown
      hideSectionFrame?: unknown
      marginTop?: unknown
      marginBottom?: unknown
      items?: unknown
    }
    if (typeof item.id !== "string" || typeof item.order !== "number") return false
    if (
      !isResponsiveValue(item.direction, (candidate): candidate is "row" | "column" =>
        candidate === "row" || candidate === "column",
      )
    ) {
      return false
    }
    if (
      item.hideSectionFrame !== undefined &&
      !isResponsiveValue(
        item.hideSectionFrame,
        (candidate): candidate is boolean => typeof candidate === "boolean",
      )
    ) {
      return false
    }
    if (
      item.marginTop !== undefined &&
      !isResponsiveValue(item.marginTop, (candidate): candidate is number => typeof candidate === "number")
    ) {
      return false
    }
    if (
      item.marginBottom !== undefined &&
      !isResponsiveValue(item.marginBottom, (candidate): candidate is number => typeof candidate === "number")
    ) {
      return false
    }
    if (!Array.isArray(item.items)) return false
    return item.items.every((container) => {
      if (!container || typeof container !== "object") return false
      const c = container as {
        id?: unknown
        order?: unknown
        kind?: unknown
        widthPct?: unknown
        content?: unknown
      }
      return (
        typeof c.id === "string" &&
        typeof c.order === "number" &&
        c.kind === "container" &&
        isResponsiveValue(c.widthPct, (candidate): candidate is number => typeof candidate === "number") &&
        (c.content === undefined ||
          isResponsiveValue(c.content, (candidate): candidate is SectionContainerContent | null =>
            candidate === null || isSectionContainerContent(candidate),
          ))
      )
    })
  })
}

function parseSectionLayout(value: unknown): SectionLayout {
  if (isSectionLayout(value)) {
    return normalizeLayout(value)
  }

  return createDefaultSectionLayout()
}

function normalizeResponsiveNumber(value: number): number {
  return Math.max(5, Math.min(95, value))
}

function resolveResponsiveValue<T>(value: ResponsiveValue<T>, viewport: ViewportKey): T {
  if (viewport === "desktop" && value.desktop !== null) return value.desktop
  if (viewport === "mobile" && value.mobile !== null) return value.mobile
  return value.default
}

function withResponsiveValue<T>(
  current: ResponsiveValue<T>,
  viewport: ViewportKey,
  nextValue: T,
): ResponsiveValue<T> {
  if (viewport === "responsive") {
    return {
      ...current,
      default: nextValue,
    }
  }

  if (viewport === "desktop") {
    return {
      ...current,
      desktop: nextValue,
    }
  }

  return {
    ...current,
    mobile: nextValue,
  }
}

function normalizeLayoutConfig(layoutConfig: SectionLayoutConfig): SectionLayoutConfig {
  const sortedSections = [...layoutConfig.sections].sort((a, b) => a.order - b.order)
  return {
    version: 3,
    sections: sortedSections.map((section, sectionIndex) => {
      const sortedItems = [...section.items].sort((a, b) => a.order - b.order).slice(0, 4)
      const normalizedDirection: ResponsiveValue<"row" | "column"> = {
        default: section.direction.default === "column" ? "column" : "row",
        desktop:
          section.direction.desktop === null
            ? null
            : section.direction.desktop === "column"
              ? "column"
              : "row",
        mobile:
          section.direction.mobile === null
            ? null
            : section.direction.mobile === "column"
              ? "column"
              : "row",
      }
      const normalizedHideSectionFrame: ResponsiveValue<boolean> = {
        default: Boolean(section.hideSectionFrame?.default),
        desktop:
          section.hideSectionFrame?.desktop === null || section.hideSectionFrame?.desktop === undefined
            ? null
            : Boolean(section.hideSectionFrame.desktop),
        mobile:
          section.hideSectionFrame?.mobile === null || section.hideSectionFrame?.mobile === undefined
            ? null
            : Boolean(section.hideSectionFrame.mobile),
      }
      const normalizedMarginTop: ResponsiveValue<number> = {
        default: normalizeSectionMargin(section.marginTop?.default),
        desktop:
          section.marginTop?.desktop === null || section.marginTop?.desktop === undefined
            ? null
            : normalizeSectionMargin(section.marginTop.desktop),
        mobile:
          section.marginTop?.mobile === null || section.marginTop?.mobile === undefined
            ? null
            : normalizeSectionMargin(section.marginTop.mobile),
      }
      const normalizedMarginBottom: ResponsiveValue<number> = {
        default: normalizeSectionMargin(section.marginBottom?.default),
        desktop:
          section.marginBottom?.desktop === null || section.marginBottom?.desktop === undefined
            ? null
            : normalizeSectionMargin(section.marginBottom.desktop),
        mobile:
          section.marginBottom?.mobile === null || section.marginBottom?.mobile === undefined
            ? null
            : normalizeSectionMargin(section.marginBottom.mobile),
      }

      return {
        id: section.id,
        order: sectionIndex,
        direction: normalizedDirection,
        hideSectionFrame: normalizedHideSectionFrame,
        marginTop: normalizedMarginTop,
        marginBottom: normalizedMarginBottom,
        items: sortedItems.map((item, itemIndex) => ({
          id: item.id,
          order: itemIndex,
          kind: "container" as const,
          widthPct: {
            default: normalizeResponsiveNumber(item.widthPct.default),
            desktop:
              item.widthPct.desktop === null ? null : normalizeResponsiveNumber(item.widthPct.desktop),
            mobile: item.widthPct.mobile === null ? null : normalizeResponsiveNumber(item.widthPct.mobile),
          },
          // Backward-safe: v3 configs created before container content support may omit `content`.
          ...(item.content
            ? {
                content: {
                  default: normalizeContainerContent(item.content.default),
                  desktop: normalizeContainerContent(item.content.desktop),
                  mobile: normalizeContainerContent(item.content.mobile),
                },
              }
            : {
                content: {
                  default: null,
                  desktop: null,
                  mobile: null,
                },
              }),
        })),
      }
    }),
  }
}

function resolveLayoutForViewport(
  layoutConfig: SectionLayoutConfig,
  viewport: ViewportKey,
): SectionLayout {
  return normalizeLayout({
    version: 2,
    sections: layoutConfig.sections.map((section) => ({
      id: section.id,
      order: section.order,
      direction: resolveResponsiveValue(section.direction, viewport),
      hideSectionFrame: resolveResponsiveValue(section.hideSectionFrame, viewport),
      marginTop: resolveResponsiveValue(section.marginTop, viewport),
      marginBottom: resolveResponsiveValue(section.marginBottom, viewport),
      items: section.items.map((item) => ({
        id: item.id,
        order: item.order,
        kind: "container" as const,
        widthPct: resolveResponsiveValue(item.widthPct, viewport),
        content: resolveResponsiveValue(item.content, viewport),
      })),
    })),
  })
}

function serializeLayoutConfig(layoutConfig: SectionLayoutConfig) {
  return JSON.stringify(normalizeLayoutConfig(layoutConfig))
}

function createSectionLayoutConfigFromLegacyLayouts(layouts: BreakpointLayoutMap): SectionLayoutConfig {
  const defaultLayout =
    layouts.responsive.sections.length > 0
      ? layouts.responsive
      : layouts.desktop.sections.length > 0
        ? layouts.desktop
        : layouts.mobile

  const desktopSections = new Map<string, SectionLayoutSection>(
    layouts.desktop.sections.map((section) => [section.id, section]),
  )
  const mobileSections = new Map<string, SectionLayoutSection>(
    layouts.mobile.sections.map((section) => [section.id, section]),
  )

  return normalizeLayoutConfig({
    version: 3,
    sections: defaultLayout.sections.map((section) => {
      const desktopSection = desktopSections.get(section.id)
      const mobileSection = mobileSections.get(section.id)
      const desktopItems = new Map<string, SectionLayoutItem>(
        (desktopSection?.items ?? []).map((item) => [item.id, item]),
      )
      const mobileItems = new Map<string, SectionLayoutItem>(
        (mobileSection?.items ?? []).map((item) => [item.id, item]),
      )

      return {
        id: section.id,
        order: section.order,
        direction: {
          default: section.direction,
          desktop:
            desktopSection && desktopSection.direction !== section.direction
              ? desktopSection.direction
              : null,
          mobile:
            mobileSection && mobileSection.direction !== section.direction ? mobileSection.direction : null,
        },
        hideSectionFrame: {
          default: Boolean(section.hideSectionFrame),
          desktop:
            desktopSection && Boolean(desktopSection.hideSectionFrame) !== Boolean(section.hideSectionFrame)
              ? Boolean(desktopSection.hideSectionFrame)
              : null,
          mobile:
            mobileSection && Boolean(mobileSection.hideSectionFrame) !== Boolean(section.hideSectionFrame)
              ? Boolean(mobileSection.hideSectionFrame)
              : null,
        },
        marginTop: {
          default: normalizeSectionMargin(section.marginTop),
          desktop:
            desktopSection &&
            normalizeSectionMargin(desktopSection.marginTop) !== normalizeSectionMargin(section.marginTop)
              ? normalizeSectionMargin(desktopSection.marginTop)
              : null,
          mobile:
            mobileSection &&
            normalizeSectionMargin(mobileSection.marginTop) !== normalizeSectionMargin(section.marginTop)
              ? normalizeSectionMargin(mobileSection.marginTop)
              : null,
        },
        marginBottom: {
          default: normalizeSectionMargin(section.marginBottom),
          desktop:
            desktopSection &&
            normalizeSectionMargin(desktopSection.marginBottom) !==
              normalizeSectionMargin(section.marginBottom)
              ? normalizeSectionMargin(desktopSection.marginBottom)
              : null,
          mobile:
            mobileSection &&
            normalizeSectionMargin(mobileSection.marginBottom) !== normalizeSectionMargin(section.marginBottom)
              ? normalizeSectionMargin(mobileSection.marginBottom)
              : null,
        },
        items: section.items.map((item) => {
          const desktopItem = desktopItems.get(item.id)
          const mobileItem = mobileItems.get(item.id)
          return {
            id: item.id,
            order: item.order,
            kind: "container" as const,
            widthPct: {
              default: item.widthPct,
              desktop:
                desktopItem && Math.abs(desktopItem.widthPct - item.widthPct) > 0.01
                  ? desktopItem.widthPct
                  : null,
              mobile:
                mobileItem && Math.abs(mobileItem.widthPct - item.widthPct) > 0.01
                  ? mobileItem.widthPct
                  : null,
            },
            content: {
              default: normalizeContainerContent(item.content),
              desktop:
                desktopItem && JSON.stringify(normalizeContainerContent(desktopItem.content)) !== JSON.stringify(normalizeContainerContent(item.content))
                  ? normalizeContainerContent(desktopItem.content)
                  : null,
              mobile:
                mobileItem && JSON.stringify(normalizeContainerContent(mobileItem.content)) !== JSON.stringify(normalizeContainerContent(item.content))
                  ? normalizeContainerContent(mobileItem.content)
                  : null,
            },
          }
        }),
      }
    }),
  })
}

function parseSectionLayoutConfig(
  defaultLayoutValue: unknown,
  desktopLayoutValue: unknown,
  mobileLayoutValue: unknown,
): SectionLayoutConfig {
  if (isSectionLayoutConfig(defaultLayoutValue)) {
    return normalizeLayoutConfig(defaultLayoutValue)
  }

  const legacyLayouts: BreakpointLayoutMap = {
    responsive: parseSectionLayout(defaultLayoutValue),
    desktop: parseSectionLayout(desktopLayoutValue),
    mobile: parseSectionLayout(mobileLayoutValue),
  }

  return createSectionLayoutConfigFromLegacyLayouts(legacyLayouts)
}

function updateLayoutConfigForViewport(
  current: SectionLayoutConfig,
  nextLayout: SectionLayout,
  viewport: ViewportKey,
): SectionLayoutConfig {
  const normalizedNext = normalizeLayout(nextLayout)
  const currentSections = new Map(current.sections.map((section) => [section.id, section]))

  const nextSections: SectionLayoutConfigSection[] = normalizedNext.sections.map((section) => {
    const currentSection = currentSections.get(section.id)
    const currentItems = new Map((currentSection?.items ?? []).map((item) => [item.id, item]))

    return {
      id: section.id,
      order: section.order,
      direction: withResponsiveValue(
        currentSection?.direction ?? {
          default: section.direction,
          desktop: null,
          mobile: null,
        },
        viewport,
        section.direction,
      ),
      hideSectionFrame: withResponsiveValue(
        currentSection?.hideSectionFrame ?? {
          default: Boolean(section.hideSectionFrame),
          desktop: null,
          mobile: null,
        },
        viewport,
        Boolean(section.hideSectionFrame),
      ),
      marginTop: withResponsiveValue(
        currentSection?.marginTop ?? {
          default: normalizeSectionMargin(section.marginTop),
          desktop: null,
          mobile: null,
        },
        viewport,
        normalizeSectionMargin(section.marginTop),
      ),
      marginBottom: withResponsiveValue(
        currentSection?.marginBottom ?? {
          default: normalizeSectionMargin(section.marginBottom),
          desktop: null,
          mobile: null,
        },
        viewport,
        normalizeSectionMargin(section.marginBottom),
      ),
      items: section.items.map((item) => {
        const currentItem = currentItems.get(item.id)
        return {
          id: item.id,
          order: item.order,
          kind: "container" as const,
          widthPct: withResponsiveValue(
            currentItem?.widthPct ?? {
              default: item.widthPct,
              desktop: null,
              mobile: null,
            },
            viewport,
            item.widthPct,
          ),
          content: withResponsiveValue(
            currentItem?.content ?? {
              default: normalizeContainerContent(item.content),
              desktop: null,
              mobile: null,
            },
            viewport,
            normalizeContainerContent(item.content),
          ),
        }
      }),
    }
  })

  return normalizeLayoutConfig({
    version: 3,
    sections: nextSections,
  })
}

export function ProfilePreviewEditor() {
  const utils = api.useUtils()
  const { openForCreate } = useAddSubsciptionModalStore()
  const creatorQuery = api.fan.creator.meCreator.useQuery(undefined, {
    refetchOnWindowFocus: false,
  })
  const creatorId = creatorQuery.data?.id ?? ""
  const subscriptionsQuery = api.fan.creator.getCreatorPackages.useQuery(
    { id: creatorId },
    {
      enabled: Boolean(creatorId),
      refetchOnWindowFocus: false,
    },
  )

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [savedProfile, setSavedProfile] = useState<SavedProfile>({
    name: "",
    description: "",
  })
  const [coverHeights, setCoverHeights] = useState<CoverHeights>(DEFAULT_COVER_HEIGHTS)
  const [savedCoverHeights, setSavedCoverHeights] = useState<CoverHeights>(DEFAULT_COVER_HEIGHTS)
  const [sectionLayoutConfig, setSectionLayoutConfig] =
    useState<SectionLayoutConfig>(createDefaultSectionLayoutConfig)
  const [savedSectionLayoutConfig, setSavedSectionLayoutConfig] =
    useState<SectionLayoutConfig>(createDefaultSectionLayoutConfig)
  const activeViewport = useProfileEditorStore((state) => state.viewportType)
  const setStateFromSync = useProfileEditorStore((state) => state.setStateFromSync)
  const setSelectedOverlay = useProfileEditorStore((state) => state.setSelectedOverlay)

  useEffect(() => {
    if (!creatorQuery.data) return

    const initialName = creatorQuery.data.name ?? ""
    const initialDescription = creatorQuery.data.bio ?? ""
    const loadedCoverHeights: CoverHeights = {
      coverHeightDefault:
        typeof creatorQuery.data.coverHeightDefault === "number"
          ? creatorQuery.data.coverHeightDefault
          : DEFAULT_COVER_HEIGHTS.coverHeightDefault,
      coverHeightDesktop:
        typeof creatorQuery.data.coverHeightDesktop === "number"
          ? creatorQuery.data.coverHeightDesktop
          : DEFAULT_COVER_HEIGHTS.coverHeightDesktop,
      coverHeightMobile:
        typeof creatorQuery.data.coverHeightMobile === "number"
          ? creatorQuery.data.coverHeightMobile
          : DEFAULT_COVER_HEIGHTS.coverHeightMobile,
    }
    setName(initialName)
    setDescription(initialDescription)
    setSavedProfile({ name: initialName, description: initialDescription })
    setCoverHeights(loadedCoverHeights)
    setSavedCoverHeights(loadedCoverHeights)

    const loadedLayoutConfig = parseSectionLayoutConfig(
      creatorQuery.data.sectionLayoutDefault,
      creatorQuery.data.sectionLayoutDesktop,
      creatorQuery.data.sectionLayoutMobile,
    )
    setSectionLayoutConfig(loadedLayoutConfig)
    setSavedSectionLayoutConfig(loadedLayoutConfig)
  }, [creatorQuery.data])

  const updateProfileInfo = api.fan.creator.updateCreatorProfileInfo.useMutation()
  const updateCoverHeights = api.fan.creator.updateCreatorCoverHeights.useMutation()
  const updateSectionLayouts = api.fan.creator.updateCreatorSectionLayouts.useMutation()

  const updateProfileImage = api.fan.creator.changeCreatorProfilePicture.useMutation({
    onSuccess: async () => {
      await utils.fan.creator.meCreator.invalidate()
      toast({
        title: "Updated",
        description: "Profile photo updated successfully.",
      })
    },
    onError: (error) => {
      toast({
        title: "Failed to update photo",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const updateCoverImage = api.fan.creator.changeCreatorCoverPicture.useMutation({
    onSuccess: async () => {
      await utils.fan.creator.meCreator.invalidate()
      toast({
        title: "Updated",
        description: "Cover photo updated successfully.",
      })
    },
    onError: (error) => {
      toast({
        title: "Failed to update cover",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const isSaving =
    updateProfileInfo.isLoading ||
    updateCoverHeights.isLoading ||
    updateSectionLayouts.isLoading ||
    updateProfileImage.isLoading ||
    updateCoverImage.isLoading

  const isDirty = useMemo(() => {
    const isProfileDirty = name !== savedProfile.name || description !== savedProfile.description
    const isCoverHeightDirty =
      coverHeights.coverHeightDefault !== savedCoverHeights.coverHeightDefault ||
      coverHeights.coverHeightDesktop !== savedCoverHeights.coverHeightDesktop ||
      coverHeights.coverHeightMobile !== savedCoverHeights.coverHeightMobile
    const isSectionLayoutDirty =
      serializeLayoutConfig(sectionLayoutConfig) !== serializeLayoutConfig(savedSectionLayoutConfig)

    return isProfileDirty || isCoverHeightDirty || isSectionLayoutDirty
  }, [
    coverHeights,
    description,
    name,
    savedCoverHeights,
    savedProfile.description,
    savedProfile.name,
    savedSectionLayoutConfig,
    sectionLayoutConfig,
  ])

  const postToParent = useCallback((message: PreviewToParentMessage) => {
    window.parent.postMessage(message, window.location.origin)
  }, [])

  useEffect(() => {
    postToParent({
      source: PROFILE_EDITOR_MESSAGE_SOURCE,
      type: "READY",
    })
  }, [postToParent])

  useEffect(() => {
    postToParent({
      source: PROFILE_EDITOR_MESSAGE_SOURCE,
      type: "DIRTY_STATE",
      dirty: isDirty,
    })
  }, [isDirty, postToParent])

  useEffect(() => {
    postToParent({
      source: PROFILE_EDITOR_MESSAGE_SOURCE,
      type: "COVER_HEIGHT_STATE",
      coverHeightDefault: coverHeights.coverHeightDefault,
      coverHeightDesktop: coverHeights.coverHeightDesktop,
      coverHeightMobile: coverHeights.coverHeightMobile,
    })
  }, [coverHeights, postToParent])

  const handleSaveFromParent = useCallback(
    async (requestId: number) => {
      if (!creatorQuery.data) {
        postToParent({
          source: PROFILE_EDITOR_MESSAGE_SOURCE,
          type: "SAVE_STATE",
          status: "error",
          requestId,
          message: "Creator profile not found.",
        })
        return
      }

      const trimmedName = name.trim()
      const trimmedDescription = description.trim()

      if (!trimmedName) {
        toast({
          title: "Name is required",
          description: "Please enter a name before saving.",
          variant: "destructive",
        })
        postToParent({
          source: PROFILE_EDITOR_MESSAGE_SOURCE,
          type: "SAVE_STATE",
          status: "error",
          requestId,
          message: "Name is required.",
        })
        return
      }

      postToParent({
        source: PROFILE_EDITOR_MESSAGE_SOURCE,
        type: "SAVE_STATE",
        status: "saving",
        requestId,
      })

      try {
        const normalizedLayoutConfig = normalizeLayoutConfig(sectionLayoutConfig)

        await Promise.all([
          updateProfileInfo.mutateAsync({
            name: trimmedName,
            bio: trimmedDescription,
            instagram: creatorQuery.data.instagram ?? undefined,
            twitter: creatorQuery.data.twitter ?? undefined,
            website: creatorQuery.data.website ?? undefined,
          }),
          updateCoverHeights.mutateAsync({
            coverHeightDefault: coverHeights.coverHeightDefault,
            coverHeightDesktop: coverHeights.coverHeightDesktop,
            coverHeightMobile: coverHeights.coverHeightMobile,
          }),
          updateSectionLayouts.mutateAsync({
            sectionLayoutDefault: normalizedLayoutConfig,
            sectionLayoutDesktop: null,
            sectionLayoutMobile: null,
          }),
        ])

        setName(trimmedName)
        setDescription(trimmedDescription)
        setSavedProfile({
          name: trimmedName,
          description: trimmedDescription,
        })
        setSavedCoverHeights(coverHeights)
        setSectionLayoutConfig(normalizedLayoutConfig)
        setSavedSectionLayoutConfig(normalizedLayoutConfig)

        await utils.fan.creator.meCreator.invalidate()

        postToParent({
          source: PROFILE_EDITOR_MESSAGE_SOURCE,
          type: "DIRTY_STATE",
          dirty: false,
        })
        postToParent({
          source: PROFILE_EDITOR_MESSAGE_SOURCE,
          type: "SAVE_STATE",
          status: "saved",
          requestId,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save profile."
        toast({
          title: "Failed to save profile",
          description: message,
          variant: "destructive",
        })
        postToParent({
          source: PROFILE_EDITOR_MESSAGE_SOURCE,
          type: "SAVE_STATE",
          status: "error",
          requestId,
          message,
        })
      }
    },
    [
      creatorQuery.data,
      coverHeights,
      description,
      name,
      postToParent,
      sectionLayoutConfig,
      updateCoverHeights,
      updateSectionLayouts,
      updateProfileInfo,
      utils.fan.creator.meCreator,
    ],
  )

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window.parent) return
      if (!isParentToPreviewMessage(event.data)) return

      if (event.data.type === "REQUEST_SAVE") {
        void handleSaveFromParent(event.data.requestId)
        return
      }

      if (event.data.type === "SET_VIEWPORT") {
        setStateFromSync({
          isSelectionMode: useProfileEditorStore.getState().isSelectionMode,
          isPreviewMode: useProfileEditorStore.getState().isPreviewMode,
          viewportType: event.data.viewport,
        })
        return
      }

      if (event.data.type === "SYNC_EDITOR_STATE") {
        setStateFromSync({
          isSelectionMode: event.data.state.isSelectionMode,
          isPreviewMode: event.data.state.isPreviewMode,
          viewportType: event.data.state.viewportType,
        })
        return
      }

      if (event.data.type === "SET_COVER_HEIGHT") {
        const nextHeight = Math.max(120, Math.min(720, Math.round(event.data.height)))
        if (event.data.viewport === "desktop") {
          setCoverHeights((prev) => ({ ...prev, coverHeightDesktop: nextHeight }))
          return
        }

        if (event.data.viewport === "mobile") {
          setCoverHeights((prev) => ({ ...prev, coverHeightMobile: nextHeight }))
          return
        }

        setCoverHeights((prev) => ({ ...prev, coverHeightDefault: nextHeight }))
      }
    }

    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [handleSaveFromParent, setStateFromSync])

  const triggerUpload = (inputId: string) => {
    const input = document.getElementById(inputId) as HTMLInputElement | null
    input?.click()
  }

  const subscriptionPackages: BuilderSubscriptionPackage[] = useMemo(
    () =>
      (subscriptionsQuery.data ?? []).map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        description: pkg.description,
        features: pkg.features,
        color: pkg.color,
        popular: pkg.popular,
        isActive: pkg.isActive,
      })),
    [subscriptionsQuery.data],
  )
  const statsData = useMemo(
    () => ({
      followers: creatorQuery.data?._count?.followers ?? 0,
      posts: creatorQuery.data?._count?.postGroups ?? 0,
      nfts: creatorQuery.data?._count?.assets ?? 0,
      revenue: 0,
    }),
    [creatorQuery.data?._count?.assets, creatorQuery.data?._count?.followers, creatorQuery.data?._count?.postGroups],
  )
  const handleCreatePackage = useCallback(() => {
    if (!creatorQuery.data) return
    openForCreate({
      customPageAsset: creatorQuery.data.customPageAssetCodeIssuer,
      pageAsset: creatorQuery.data.pageAsset,
    })
  }, [creatorQuery.data, openForCreate])

  if (creatorQuery.isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <Loader2Icon className="h-4 w-4 animate-spin" />
          Loading profile editor...
        </div>
      </main>
    )
  }

  if (!creatorQuery.data) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-xl p-8 text-center">
          <h2 className="text-xl font-semibold text-foreground">Creator profile not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You need a creator profile before editing this preview.
          </p>
        </div>
      </main>
    )
  }

  const coverUrl = creatorQuery.data.coverUrl ?? "/images/header.jpg"
  const profileUrl = creatorQuery.data.profileUrl ?? "/images/icons/avatar-icon.png"
  const ViewportIcon =
    activeViewport === "desktop"
      ? MonitorIcon
      : activeViewport === "mobile"
        ? SmartphoneIcon
        : UnfoldHorizontalIcon
  const currentCoverHeight =
    activeViewport === "desktop"
      ? coverHeights.coverHeightDesktop
      : activeViewport === "mobile"
        ? coverHeights.coverHeightMobile
        : coverHeights.coverHeightDefault
  const coverHeightProgress = Math.round(((currentCoverHeight - 120) / (720 - 120)) * 100)
  const activeSectionLayout = resolveLayoutForViewport(sectionLayoutConfig, activeViewport)

  const handleSectionLayoutChange = (nextLayout: SectionLayout) => {
    setSectionLayoutConfig((prev) => updateLayoutConfigForViewport(prev, nextLayout, activeViewport))
  }

  return (
    <main
      className="light min-h-screen overflow-x-hidden"
      onClick={() => {
        setSelectedOverlay(null)
      }}
    >
      <UploadS3Button
        endpoint="coverUploader"
        id={COVER_INPUT_ID}
        variant="hidden"
        onClientUploadComplete={(file) => {
          updateCoverImage.mutate(file.url)
        }}
      />
      <UploadS3Button
        endpoint="profileUploader"
        id={PROFILE_INPUT_ID}
        variant="hidden"
        onClientUploadComplete={(file) => {
          updateProfileImage.mutate(file.url)
        }}
      />

      <section className="w-full">
        <div className="relative w-full" style={{ height: `${currentCoverHeight}px` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute right-4 top-4 border border-border bg-background/90 text-foreground hover:bg-background"
            onClick={() => triggerUpload(COVER_INPUT_ID)}
            disabled={isSaving}
          >
            <CameraIcon className="h-4 w-4" />
            Change cover
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-4 bottom-4 h-9 w-9 border border-border bg-background/90 text-foreground hover:bg-background"
              >
                <SlidersHorizontalIcon className="h-4 w-4" />
                <span className="sr-only">Adjust cover height</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="end"
              className="w-[320px] rounded-[28px] border border-[#d9d9db] bg-white px-6 py-4 shadow-[0_16px_28px_rgba(0,0,0,0.08)]"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[16px] font-semibold text-[#25262b]">Height</p>
                  <span className="inline-flex items-center justify-center text-foreground">
                    <ViewportIcon className="h-4 w-4" />
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={120}
                    max={720}
                    step={1}
                    value={currentCoverHeight}
                    onChange={(event) => {
                      const nextHeight = Number(event.target.value)

                      if (activeViewport === "desktop") {
                        setCoverHeights((prev) => ({ ...prev, coverHeightDesktop: nextHeight }))
                        return
                      }

                      if (activeViewport === "mobile") {
                        setCoverHeights((prev) => ({ ...prev, coverHeightMobile: nextHeight }))
                        return
                      }

                      setCoverHeights((prev) => ({ ...prev, coverHeightDefault: nextHeight }))
                    }}
                    className="cover-height-slider flex-1"
                    style={
                      {
                        "--cover-progress": `${coverHeightProgress}%`,
                      } as CSSProperties
                    }
                  />
                  <span className="w-12 text-right text-xs font-semibold text-[#5f6168]">
                    {currentCoverHeight}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-medium text-[#8f9094]">
                  <span>Low</span>
                  <div className="mx-2 flex-1 h-[10px] bg-[repeating-linear-gradient(to_right,transparent_0px,transparent_9px,#cfeaf8_9px,#cfeaf8_11px)] rounded-sm" />
                  <span>High</span>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="relative mx-auto w-full md:w-[85vw] min-w-0 pt-14 pb-32 px-2 md:px-0">
          <div className="absolute -top-12 left-2 md:left-0">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-[#e2e8f0] shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={profileUrl} alt="Profile" className="h-full w-full object-cover" />
            </div>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full border border-border bg-background text-foreground hover:bg-muted"
              onClick={() => triggerUpload(PROFILE_INPUT_ID)}
              disabled={isSaving}
            >
              <CameraIcon className="h-4 w-4" />
              <span className="sr-only">Change profile photo</span>
            </Button>
          </div>

          <div className="space-y-2">
            <input
              id="profile-editor-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 block w-full min-w-0 whitespace-nowrap overflow-x-hidden overflow-y-hidden text-ellipsis border-0 bg-transparent p-0 !py-0 text-3xl font-semibold leading-[1.1] text-foreground outline-none focus:outline-none"
              placeholder="Artist name"
            />

            <Textarea
              id="profile-editor-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-[88px] resize-none border-0 bg-transparent p-0 text-base leading-relaxed text-foreground/80 shadow-none outline-none focus-visible:ring-0"
              placeholder="Tell visitors about this profile."
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-sm text-muted-foreground">
                Joined{" "}
                {new Date(creatorQuery.data.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            <ProfileSectionBuilder
              layout={activeSectionLayout}
              onLayoutChange={handleSectionLayoutChange}
              subscriptions={subscriptionPackages}
              statsData={statsData}
              onCreatePackage={handleCreatePackage}
            />
          </div>
        </div>
      </section>
      <style jsx global>{`
        .cover-height-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 28px;
          border-radius: 8px;
          background: linear-gradient(
            to right,
            #8fd2ea 0%,
            #8fd2ea var(--cover-progress),
            #dfdfe1 var(--cover-progress),
            #dfdfe1 100%
          );
          padding: 0;
          outline: none;
        }

        .cover-height-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 6px;
          height: 18px;
          border-radius: 999px;
          border: 0;
          background: #1197e7;
          box-shadow: 0 0 0 1px rgba(17, 151, 231, 0.25);
          cursor: pointer;
        }

        .cover-height-slider::-moz-range-track {
          height: 28px;
          border: 0;
          border-radius: 8px;
          background: #dfdfe1;
        }

        .cover-height-slider::-moz-range-progress {
          height: 28px;
          border-radius: 8px;
          background: #8fd2ea;
        }

        .cover-height-slider::-moz-range-thumb {
          width: 6px;
          height: 18px;
          border-radius: 999px;
          border: 0;
          background: #1197e7;
          cursor: pointer;
        }
      `}</style>
    </main>
  )
}

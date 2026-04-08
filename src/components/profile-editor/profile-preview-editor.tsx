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

type BreakpointLayoutMap = {
  responsive: SectionLayout
  desktop: SectionLayout
  mobile: SectionLayout
}

function createDefaultSectionLayout(): SectionLayout {
  return {
    version: 2,
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
        items: sortedItems.map((item, itemIndex) => ({
          id: item.id,
          widthPct: Math.max(5, Math.min(95, item.widthPct)),
          order: itemIndex,
          kind: "container",
        })),
      }
    }),
  }
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
      Array.isArray(entry.items) &&
      entry.items.every((item) => {
        if (!item || typeof item !== "object") return false
        const rowItem = item as Partial<SectionLayoutItem>
        return (
          typeof rowItem.id === "string" &&
          typeof rowItem.widthPct === "number" &&
          typeof rowItem.order === "number" &&
          rowItem.kind === "container"
        )
      })
    )
  })
}

function isLegacySectionLayout(
  value: unknown,
): value is { version: 1; items: SectionLayoutItem[] } {
  if (!value || typeof value !== "object") return false
  const input = value as { version?: unknown; items?: unknown }
  if (input.version !== 1 || !Array.isArray(input.items)) return false

  return input.items.every((item) => {
    if (!item || typeof item !== "object") return false
    const entry = item as Partial<SectionLayoutItem>
    return (
      typeof entry.id === "string" &&
      typeof entry.widthPct === "number" &&
      typeof entry.order === "number" &&
      entry.kind === "container"
    )
  })
}

function parseSectionLayout(value: unknown): SectionLayout {
  if (isSectionLayout(value)) {
    return normalizeLayout(value)
  }

  if (isLegacySectionLayout(value)) {
    return normalizeLayout({
      version: 2,
      sections: [
        {
          id: "section-legacy-1",
          order: 0,
          items: value.items,
        },
      ],
    })
  }

  return createDefaultSectionLayout()
}

function serializeLayout(layout: SectionLayout) {
  return JSON.stringify(normalizeLayout(layout))
}

function createDefaultLayoutMap(): BreakpointLayoutMap {
  return {
    responsive: createDefaultSectionLayout(),
    desktop: createDefaultSectionLayout(),
    mobile: createDefaultSectionLayout(),
  }
}

function areLayoutMapsEqual(a: BreakpointLayoutMap, b: BreakpointLayoutMap) {
  return (
    serializeLayout(a.responsive) === serializeLayout(b.responsive) &&
    serializeLayout(a.desktop) === serializeLayout(b.desktop) &&
    serializeLayout(a.mobile) === serializeLayout(b.mobile)
  )
}

export function ProfilePreviewEditor() {
  const utils = api.useUtils()
  const creatorQuery = api.fan.creator.meCreator.useQuery(undefined, {
    refetchOnWindowFocus: false,
  })

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [savedProfile, setSavedProfile] = useState<SavedProfile>({
    name: "",
    description: "",
  })
  const [coverHeights, setCoverHeights] = useState<CoverHeights>(DEFAULT_COVER_HEIGHTS)
  const [savedCoverHeights, setSavedCoverHeights] = useState<CoverHeights>(DEFAULT_COVER_HEIGHTS)
  const [sectionLayouts, setSectionLayouts] = useState<BreakpointLayoutMap>(createDefaultLayoutMap)
  const [savedSectionLayouts, setSavedSectionLayouts] =
    useState<BreakpointLayoutMap>(createDefaultLayoutMap)
  const activeViewport = useProfileEditorStore((state) => state.viewportType)
  const setStateFromSync = useProfileEditorStore((state) => state.setStateFromSync)

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

    const loadedSectionLayouts: BreakpointLayoutMap = {
      responsive: parseSectionLayout(creatorQuery.data.sectionLayoutDefault),
      desktop: parseSectionLayout(creatorQuery.data.sectionLayoutDesktop),
      mobile: parseSectionLayout(creatorQuery.data.sectionLayoutMobile),
    }
    setSectionLayouts(loadedSectionLayouts)
    setSavedSectionLayouts(loadedSectionLayouts)
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
    const isSectionLayoutDirty = !areLayoutMapsEqual(sectionLayouts, savedSectionLayouts)

    return isProfileDirty || isCoverHeightDirty || isSectionLayoutDirty
  }, [
    coverHeights,
    description,
    name,
    savedCoverHeights,
    savedProfile.description,
    savedProfile.name,
    savedSectionLayouts,
    sectionLayouts,
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
        const normalizedSectionLayouts: BreakpointLayoutMap = {
          responsive: normalizeLayout(sectionLayouts.responsive),
          desktop: normalizeLayout(sectionLayouts.desktop),
          mobile: normalizeLayout(sectionLayouts.mobile),
        }

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
            sectionLayoutDefault: normalizedSectionLayouts.responsive,
            sectionLayoutDesktop: normalizedSectionLayouts.desktop,
            sectionLayoutMobile: normalizedSectionLayouts.mobile,
          }),
        ])

        setName(trimmedName)
        setDescription(trimmedDescription)
        setSavedProfile({
          name: trimmedName,
          description: trimmedDescription,
        })
        setSavedCoverHeights(coverHeights)
        setSectionLayouts(normalizedSectionLayouts)
        setSavedSectionLayouts(normalizedSectionLayouts)

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
      sectionLayouts,
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
  const activeSectionLayout =
    activeViewport === "desktop"
      ? sectionLayouts.desktop
      : activeViewport === "mobile"
        ? sectionLayouts.mobile
        : sectionLayouts.responsive

  const handleSectionLayoutChange = (nextLayout: SectionLayout) => {
    const normalized = normalizeLayout(nextLayout)
    if (activeViewport === "desktop") {
      setSectionLayouts((prev) => ({ ...prev, desktop: normalized }))
      return
    }

    if (activeViewport === "mobile") {
      setSectionLayouts((prev) => ({ ...prev, mobile: normalized }))
      return
    }

    setSectionLayouts((prev) => ({ ...prev, responsive: normalized }))
  }

  return (
    <main className="light min-h-screen overflow-x-hidden">
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

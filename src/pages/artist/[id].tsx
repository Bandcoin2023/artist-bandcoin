"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import {
  Save,
  Plus,
  X,
  GripVertical,
  Link2,
  Edit,
  Check,
  User,
  Trash2,
} from "lucide-react";

import { Button } from "~/components/shadcn/ui/button";
import { Card, CardContent } from "~/components/shadcn/ui/card";
import { toast } from "~/components/shadcn/ui/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/shadcn/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/shadcn/ui/tabs";
import { Input } from "~/components/shadcn/ui/input";
import { Label } from "~/components/shadcn/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/shadcn/ui/tooltip";
import { Switch } from "~/components/shadcn/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/shadcn/ui/dialog";

// Import components that can be added to dashboard
import StatsWidget from "~/components/widget/stats-widget";
import ProfileWidget from "~/components/widget/profile-widget";
import NFTGalleryWidget from "~/components/widget/nft-gallery-widget";
import RecentPostsWidget from "~/components/widget/recent-posts-widget";
import ChartWidget from "~/components/widget/chart-widget";
import CalendarWidget from "~/components/widget/calendar-widget";
import TodoWidget from "~/components/widget/todo-widget";
import CustomHTMLWidget from "~/components/widget/custom-html-widget";

// Import new widgets
import MusicPlayerWidget from "~/components/widget/music-player-widget";
import TourDatesWidget from "~/components/widget/tour-dates-widget";
import MembershipTiersWidget from "~/components/widget/membership-tiers-widget";
import MerchandiseWidget from "~/components/widget/merchandise-widget";
import BandMembersWidget from "~/components/widget/band-members-widget";
import VideoGalleryWidget from "~/components/widget/video-gallery-widget";
import NewsletterWidget from "~/components/widget/newsletter-widget";
import LyricsWidget from "~/components/widget/lyrics-widget";
import FanCommunityWidget from "~/components/widget/fan-community-widget";
import CoverProfileWidget from "~/components/widget/cover-profile-widget";
import FollowAndMembershipButton from "~/components/creator/follow-creator-button";

// Import the new utility functions and components
import {
  getWidgetDimensions,
  createDefaultWidgetSettings,
  generateGroupId,
  type WidgetHeight,
  type WidgetWidth,
  getGridSpan,
  getResponsiveHeight,
  shouldUseColumnLayout,
} from "~/components/widget/utils/widget-utils";
import WidgetSizeSelector from "~/components/widget/utils/widget-size-selector";
import WidgetGroupControls from "~/components/widget/utils/widget-group-controls";

// Update imports at the top to include the new types
import { api } from "~/utils/api"; // Adjust this import based on your tRPC setup
import type {
  CreatorWithPageAsset,
  GroupResizeState,
  SavedLayout,
  WidgetDefinition,
  WidgetItem,
  WidgetSettings,
} from "~/types/artist/dashboard";
import { cn } from "~/lib/utils";
import { useRouter } from "next/router";
import NotFound from "~/pages/404";
import Loading from "~/components/common/loading";
// Update the DEFAULT_LAYOUT to include default settings for each widget
const DEFAULT_LAYOUT: WidgetItem[] = [
  {
    id: "cover-profile",
    size: "large",
    order: 1,
    settings: createDefaultWidgetSettings("cover-profile"),
  },
  {
    id: "membership-tiers",
    size: "large",
    order: 4,
    settings: createDefaultWidgetSettings("membership-tiers"),
  },
  {
    id: "stats",
    size: "large",
    order: 5,
    settings: createDefaultWidgetSettings("stats"),
  },
  {
    id: "nft-gallery",
    size: "large",
    order: 9,
    settings: createDefaultWidgetSettings("nft-gallery"),
  },
  {
    id: "recent-posts",
    size: "large",
    order: 10,
    settings: createDefaultWidgetSettings("recent-posts"),
  },
];

// Available components for adding to dashboard
const AVAILABLE_WIDGETS: WidgetDefinition[] = [
  {
    id: "cover-profile",
    title: "Cover & Profile",
    description: "Display cover photo and profile information",
    component: CoverProfileWidget,
    icon: "user",
    special: true,
  },
  {
    id: "profile",
    title: "Profile Card",
    description: "Display artist profile information",
    component: ProfileWidget,
    icon: "user",
  },
  {
    id: "stats",
    title: "Statistics",
    description: "Show key performance metrics",
    component: StatsWidget,
    icon: "stats",
  },
  {
    id: "recent-posts",
    title: "Recent Posts",
    description: "Show your latest posts",
    component: RecentPostsWidget,
    icon: "posts",
  },
  {
    id: "nft-gallery",
    title: "NFT Gallery",
    description: "Display your NFT collection",
    component: NFTGalleryWidget,
    icon: "gallery",
  },
  {
    id: "chart",
    title: "Analytics Chart",
    description: "Visualize your data with charts",
    component: ChartWidget,
    icon: "chart",
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "Schedule and view upcoming events",
    component: CalendarWidget,
    icon: "calendar",
  },
  {
    id: "todo",
    title: "To-Do List",
    description: "Manage your tasks",
    component: TodoWidget,
    icon: "todo",
  },
  {
    id: "custom-html",
    title: "Custom HTML",
    description: "Add custom HTML content",
    component: CustomHTMLWidget,
    icon: "code",
  },
  {
    id: "music-player",
    title: "Music Player",
    description: "Play your music with controls and playlist",
    component: MusicPlayerWidget,
    icon: "music",
  },
  {
    id: "tour-dates",
    title: "Tour Dates",
    description: "Display upcoming shows and tour information",
    component: TourDatesWidget,
    icon: "calendar",
  },
  {
    id: "membership-tiers",
    title: "Membership Tiers",
    description: "Showcase membership options for fans",
    component: MembershipTiersWidget,
    icon: "users",
  },
  {
    id: "merchandise",
    title: "Merchandise",
    description: "Display and sell merchandise to fans",
    component: MerchandiseWidget,
    icon: "shopping",
  },
  {
    id: "band-members",
    title: "Band Members",
    description: "Introduce the band members to your fans",
    component: BandMembersWidget,
    icon: "users",
  },
  {
    id: "video-gallery",
    title: "Video Gallery",
    description: "Showcase your music videos and performances",
    component: VideoGalleryWidget,
    icon: "video",
  },
  {
    id: "newsletter",
    title: "Newsletter Signup",
    description: "Collect email subscriptions from fans",
    component: NewsletterWidget,
    icon: "mail",
  },
  {
    id: "lyrics",
    title: "Lyrics",
    description: "Share lyrics to your songs",
    component: LyricsWidget,
    icon: "file-text",
  },
  {
    id: "fan-community",
    title: "Fan Community",
    description: "Engage with your fan community",
    component: FanCommunityWidget,
    icon: "users",
  },
];

// Map height keys to pixel values
const HEIGHT_MAP: Record<WidgetHeight, number> = {
  SS: 100,
  S: 200,
  M: 300,
  L: 450,
  XL: 600,
  "2XL": 800,
  "3XL": 1000,
  "4XL": 1200,
};

export default function SingleCreatorViewPage({ creatorId }: { creatorId: string }) {
  // State variables
  const router = useRouter();
  const { id } = creatorId ? { id: creatorId } : router.query as { id: string };

  const [widgets, setWidgets] = useState<WidgetItem[]>(DEFAULT_LAYOUT);
  const [editMode, setEditMode] = useState(false);
  const [layoutName, setLayoutName] = useState("My Dashboard");
  const [layoutId, setLayoutId] = useState("");
  const [userView, setUserView] = useState(true);
  const [newLayoutName, setNewLayoutName] = useState("");
  const [makePublic, setMakePublic] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<string | null>(null);
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);
  const [isLayoutSaved, setIsLayoutSaved] = useState(false);

  const [selectionMode, setSelectionMode] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [resizingWidget, setResizingWidget] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartY, setResizeStartY] = useState(0);

  const widgetRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dashboardContainerRef = useRef<HTMLDivElement>(null);

  // Group resizing state
  const [resizingGroup, setResizingGroup] = useState<GroupResizeState | null>(
    null,
  );

  // Add a new state for profile editing mode
  const [isProfileEditMode, setIsProfileEditMode] = useState(false);

  // Add a state to track if user's layout is loaded
  const [userLayoutLoaded, setUserLayoutLoaded] = useState(false);

  // Add a window resize listener to handle responsive heights
  // Add this near the top of the component with other state variables
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  // Add tRPC hooks
  const utils = api.useUtils();
  const creator = api.fan.creator.getCreator.useQuery(
    {
      id: id,
    },
    {
      enabled: !!id,
    },
  );

  const dashboardsQuery = api.fan.dashboard.getAllFromPubkey.useQuery(
    {
      id: id,
    },
    {
      onSuccess: (data) => {
        if (data && data.length > 0 && !userLayoutLoaded) {
          // Find user's last saved layout
          const userLayouts = data.filter((d) => !d.isDefault);
          const defaultLayout = data.find((d) => d.isDefault);

          // Transform the data to match the expected format
          const transformLayout = (layout: (typeof data)[0] | undefined) => {
            if (!layout) return undefined;

            return {
              id: layout.id,
              name: layout.name,
              isDefault: layout.isDefault,
              isPublic: layout.isPublic,
              widgets: layout.widgets.map((widget) => ({
                widgetId: widget.widgetId,
                size: widget.size as "small" | "medium" | "large",
                order: widget.order,
                pinned: widget.pinned,
                groupId: widget.groupId,
                customWidth: widget.customWidth ?? undefined,
                settings: widget.settings as
                  | Record<string, unknown>
                  | null
                  | undefined,
              })),
            };
          };

          // If user has layouts, load the most recent one
          if (userLayouts.length > 0) {
            // Sort by updated date descending
            const sortedLayouts = [...userLayouts].sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime(),
            );

            const transformedLayout = transformLayout(sortedLayouts[0]);
            if (transformedLayout) {
              loadUserLayout(transformedLayout);
              setUserLayoutLoaded(true);
            }
          }
          // If no user layouts but there's a default layout, load that
          else if (defaultLayout && !userLayoutLoaded) {
            const transformedDefaultLayout = transformLayout(defaultLayout);
            if (transformedDefaultLayout) {
              loadUserLayout(transformedDefaultLayout);
              setUserLayoutLoaded(true);
            }
          }

          // Transform all layouts for the list
          const transformedLayouts = data.map((dashboard) => ({
            id: dashboard.id,
            name: dashboard.name,
            isDefault: dashboard.isDefault,
            isPublic: dashboard.isPublic,
            widgets: dashboard.widgets.map((widget) => ({
              id: widget.widgetId,
              size: widget.size as "small" | "medium" | "large",
              order: widget.order,
              pinned: widget.pinned,
              groupId: widget.groupId ?? undefined,
              customWidth: widget.customWidth ?? undefined,
              settings: widget.settings as WidgetSettings | undefined,
            })),
          }));

          setSavedLayouts(transformedLayouts);
        }
      },
    },
  );

  // Use mutations for all operations that modify data
  const dashboardByIdMutation = api.fan.dashboard.getById.useMutation();
  const saveDashboardMutation = api.fan.dashboard.save.useMutation({
    onSuccess: () => {
      utils.fan.dashboard.getAll.invalidate();
    },
  });
  const deleteDashboardMutation = api.fan.dashboard.delete.useMutation({
    onSuccess: () => {
      utils.fan.dashboard.getAll.invalidate();
    },
  });

  // Update the loadUserLayout function to ensure default sizes are applied when settings are missing
  const loadUserLayout = (
    dashboard:
      | {
        id: string;
        name: string;
        widgets: {
          widgetId: string;
          size: "small" | "medium" | "large";
          order: number;
          pinned: boolean;
          groupId?: string | null;
          customWidth?: number | null;
          settings?: Record<string, unknown> | null;
        }[];
        isDefault: boolean;
        isPublic: boolean;
      }
      | undefined,
  ) => {
    if (!dashboard) return; // Early return if dashboard is undefined

    try {
      console.log("Loading user layout:", dashboard.name);
      console.log(
        "Widget settings from database:",
        dashboard.widgets.map((w) => ({
          id: w.widgetId,
          settings: w.settings,
          settingsType: w.settings ? typeof w.settings : "undefined",
        })),
      );

      // Transform the data from Prisma format to our app format
      const widgetsData: WidgetItem[] = dashboard.widgets.map((widget) => {
        // Ensure settings is properly handled
        let processedSettings: WidgetSettings | undefined = undefined;

        if (widget.settings) {
          // If settings is a string (JSON string), parse it
          if (typeof widget.settings === "string") {
            try {
              processedSettings = JSON.parse(widget.settings) as WidgetSettings;
            } catch (e) {
              console.error(
                `Error parsing settings for widget ${widget.widgetId}:`,
                e,
              );
              processedSettings = createDefaultWidgetSettings(widget.widgetId);
            }
          }
          // If settings is already an object, use it directly
          else if (typeof widget.settings === "object") {
            processedSettings = widget.settings as WidgetSettings;
          }
        } else {
          // If no settings found, create default settings for this widget type
          processedSettings = createDefaultWidgetSettings(widget.widgetId);
        }

        if (!processedSettings?.height) {
          processedSettings = processedSettings ?? {};
          processedSettings.height = "L" as WidgetHeight;
        }

        if (!processedSettings?.width) {
          processedSettings = processedSettings ?? {};
          processedSettings.width = "L" as WidgetWidth;
        }

        console.log(
          `Processed settings for widget ${widget.widgetId}:`,
          processedSettings,
        );

        return {
          id: widget.widgetId,
          size: widget.size,
          order: widget.order,
          pinned: widget.pinned,
          groupId: widget.groupId ?? undefined,
          customWidth: widget.customWidth ?? undefined,
          settings: processedSettings,
        };
      });

      console.log("Transformed widgets data:", widgetsData);

      setWidgets(widgetsData);
      setLayoutName(dashboard.name);
      setLayoutId(dashboard.id);
      setIsLayoutSaved(true);
    } catch (error) {
      console.error("Error loading user layout:", error);
      // Silently fail and use default layout
    }
  };

  // Replace loadLayout with tRPC version
  const loadLayout = async (id: string) => {
    try {
      setIsLoading(true);

      // Use dashboard query
      const result = await dashboardByIdMutation.mutateAsync({ id });

      if (result) {
        // Debug the raw data from the database
        console.log("Raw dashboard data from database:", result);
        console.log(
          "Raw widget settings from database:",
          result.widgets.map((w) => ({ id: w.widgetId, settings: w.settings })),
        );

        const dashboard = result;

        // Transform the data from Prisma format to our app format
        const widgetsData: WidgetItem[] = dashboard.widgets.map((widget) => {
          console.log(
            `Loading widget ${widget.widgetId} with settings:`,
            widget.settings,
          );

          // Process settings, ensuring defaults are applied when missing
          let processedSettings: WidgetSettings | undefined = undefined;

          if (widget.settings) {
            processedSettings = widget.settings as WidgetSettings;
          } else {
            processedSettings = createDefaultWidgetSettings(widget.widgetId);
          }

          // Ensure height and width are set to defaults if missing
          if (!processedSettings.height) {
            processedSettings.height = "L" as WidgetHeight;
          }
          if (!processedSettings.width) {
            processedSettings.width = "L" as WidgetWidth;
          }

          return {
            id: widget.widgetId,
            size: widget.size as "small" | "medium" | "large",
            order: widget.order,
            pinned: widget.pinned,
            groupId: widget.groupId ?? undefined,
            customWidth: widget.customWidth ?? undefined,
            settings: processedSettings,
          };
        });

        // Force a re-render of the entire dashboard to ensure settings are applied
        setTimeout(() => {
          console.log(
            "Forcing re-render of dashboard with widgets:",
            widgetsData,
          );
          console.log(
            "Widget settings before re-render:",
            widgetsData.map((w) => ({ id: w.id, settings: w.settings })),
          );
          setWidgets([...widgetsData]);
        }, 50);

        // Update current layout instead of creating a new one
        setWidgets(widgetsData);
        setLayoutName(dashboard.name);
        setLayoutId(dashboard.id);
        setIsLayoutSaved(true);

        // After data is loaded, apply custom widths to DOM elements in the next render cycle
        setTimeout(() => {
          applyGroupWidgetSizes(widgetsData);
        }, 100);

        toast({
          title: "Layout loaded",
          description: `Dashboard layout "${dashboard.name}" has been loaded`,
        });
      }
    } catch (error) {
      console.error("Error loading layout:", error);
      toast({
        title: "Error",
        description: "Failed to load layout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Replace deleteLayout with tRPC version
  const deleteLayout = async (id: string) => {
    try {
      await deleteDashboardMutation.mutateAsync({ id });

      // Remove from local state
      setSavedLayouts(savedLayouts.filter((layout) => layout.id !== id));

      // If we deleted the current layout, reset to default
      if (id === layoutId) {
        setWidgets(DEFAULT_LAYOUT);
        setLayoutName("My Dashboard");
        setLayoutId("");
        setIsLayoutSaved(false);
      }

      toast({
        title: "Layout deleted",
        description: "The dashboard layout has been deleted",
      });
    } catch (error) {
      console.error("Error deleting layout:", error);
      toast({
        title: "Error",
        description: "Failed to delete layout",
        variant: "destructive",
      });
    }
  };

  // Replace saveLayout with tRPC version
  const handleSaveLayout = async () => {
    if (!newLayoutName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your layout",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      // Log all widget settings before saving
      console.log(
        "All widget settings before saving:",
        widgets.map((w) => ({
          id: w.id,
          settings: w.settings,
        })),
      );

      // Transform the widgets to ensure they match the expected type
      const transformedWidgets = widgets.map((widget) => {
        // Create a clean copy of the settings object
        const settings = widget.settings ? { ...widget.settings } : {};

        // For cover-profile widget, ensure coverHeight is explicitly included
        if (widget.id === "cover-profile" && widget.settings) {
          console.log(
            "Cover-profile widget settings before transform:",
            widget.settings,
          );
          settings.coverHeight = widget.settings.coverHeight ?? 180;
          console.log(
            "Cover-profile widget settings after transform:",
            settings,
          );
        }

        return {
          id: widget.id,
          size: widget.size,
          order: widget.order,
          pinned: widget.pinned ?? false,
          groupId: widget.groupId,
          customWidth: widget.customWidth,
          settings: settings, // Use the direct object reference
        };
      });

      // Log the transformed widgets
      console.log(
        "Transformed widgets for saving:",
        transformedWidgets.map((w) => ({
          id: w.id,
          settings: w.settings,
        })),
      );

      const dashboardData = {
        id: layoutId ?? undefined,
        name: newLayoutName,
        widgets: transformedWidgets,
        isDefault: makePublic,
        isPublic: makePublic,
      };

      const result = await saveDashboardMutation.mutateAsync(dashboardData);

      // Update local state
      setLayoutName(newLayoutName);
      setLayoutId(result.id);

      setNewLayoutName("");
      setMakePublic(false);
      setIsLayoutSaved(true);
      setEditMode(false);
      setSelectionMode(false);
      setSelectedWidgets([]);

      // Refresh the list of saved layouts
      utils.fan.dashboard.getAll.invalidate();

      toast({
        title: "Layout saved",
        description: `Dashboard layout "${newLayoutName}" has been saved${makePublic ? " and set as default for all users" : ""}`,
      });
    } catch (error) {
      console.error("Error saving layout:", error);
      toast({
        title: "Error",
        description: "Failed to save layout",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Add a function to toggle profile edit mode
  const toggleProfileEditMode = () => {
    setIsProfileEditMode(!isProfileEditMode);
    // If turning on profile edit mode, turn off dashboard edit mode
    if (!isProfileEditMode && editMode) {
      setEditMode(false);
      setSelectionMode(false);
      setSelectedWidgets([]);
    }
  };

  // Handle widget resize
  const handleWidgetResize = (
    widgetId: string,
    deltaX: number,
    deltaY: number,
  ) => {
    const widget = widgets.find((w) => w.id === widgetId);
    if (!widget) return;

    // For widgets in a group, adjust proportions
    if (widget.groupId) {
      const groupWidgets = widgets.filter((w) => w.groupId === widget.groupId);
      const groupContainer = document.querySelector(
        `[data-group-id="${widget.groupId}"]`,
      );

      if (groupContainer) {
        const containerWidth = groupContainer.clientWidth;
        const widgetEl = widgetRefs.current[widgetId];

        if (widgetEl) {
          // Calculate new width as percentage of container
          const currentWidth = widgetEl.offsetWidth;
          const newWidth = Math.max(100, currentWidth + deltaX);
          const widthPercent = (newWidth / containerWidth) * 100;

          // Update DOM for smooth resizing
          widgetEl.style.width = `${widthPercent}%`;

          // Adjust other widgets in the group
          const totalOtherWidgets = groupWidgets.length - 1;
          if (totalOtherWidgets > 0) {
            const otherWidgetsCurrentWidth = 100 - widthPercent;
            const widthPerOtherWidget =
              otherWidgetsCurrentWidth / totalOtherWidgets;

            groupWidgets.forEach((w) => {
              if (w.id !== widgetId) {
                const el = document.querySelector(`[data-widget-id="${w.id}"]`);
                if (el) {
                  (el as HTMLElement).style.width = `${widthPerOtherWidget}%`;
                }
              }
            });
          }
        }
      }
    }
    // For individual widgets, adjust height and width
    else {
      const widgetEl = widgetRefs.current[widgetId];
      if (widgetEl) {
        // Get current height and width from settings or default
        const currentHeight = (widget.settings?.height as WidgetHeight) ?? "M";
        const currentWidth = (widget.settings?.width as WidgetWidth) ?? "M";

        // Calculate new height
        const currentHeightPx = widgetEl.offsetHeight;
        const newHeight = Math.max(100, currentHeightPx + deltaY);

        // Find closest height preset
        let newHeightKey: WidgetHeight = "M";
        if (newHeight < 150) newHeightKey = "SS";
        else if (newHeight < 250) newHeightKey = "S";
        else if (newHeight < 350) newHeightKey = "M";
        else if (newHeight < 500) newHeightKey = "L";
        else if (newHeight < 700) newHeightKey = "XL";
        else if (newHeight < 900) newHeightKey = "2XL";
        else if (newHeight < 1100) newHeightKey = "3XL";
        else newHeightKey = "4XL";

        // Calculate new width if deltaX is significant
        let newWidthKey = currentWidth;
        if (Math.abs(deltaX) > 50) {
          const containerWidth =
            widgetEl.parentElement?.parentElement?.offsetWidth ?? 1200;
          const currentWidthPx = widgetEl.offsetWidth;
          const newWidth = Math.max(200, currentWidthPx + deltaX);
          const widthRatio = newWidth / containerWidth;

          if (widthRatio <= 0.2) newWidthKey = "SS";
          else if (widthRatio <= 0.3) newWidthKey = "S";
          else if (widthRatio <= 0.4) newWidthKey = "M";
          else if (widthRatio <= 0.55) newWidthKey = "L";
          else if (widthRatio <= 0.7) newWidthKey = "XL";
          else if (widthRatio <= 0.8) newWidthKey = "2XL";
          else if (widthRatio <= 0.9) newWidthKey = "3XL";
          else newWidthKey = "4XL";
        }

        // Update widget element for smooth resizing
        widgetEl.style.height = `${newHeight}px`;

        // Store the new height and width settings if they changed
        if (currentHeight !== newHeightKey || currentWidth !== newWidthKey) {
          setWidgets(
            widgets.map((w) => {
              if (w.id === widgetId) {
                return {
                  ...w,
                  settings: {
                    ...w.settings,
                    height: newHeightKey,
                    width: newWidthKey,
                  },
                };
              }
              return w;
            }),
          );
        }
      }
    }
  };

  useEffect(() => {
    // Load active layout from localStorage
    const loadActiveLayout = () => {
      try {
        const activeLayoutData = localStorage.getItem(
          "active-dashboard-layout",
        );
        if (activeLayoutData) {
          const { widgets, name } = JSON.parse(activeLayoutData) as {
            widgets: WidgetItem[];
            name: string;
          };
          setWidgets(widgets);
          setLayoutName(name);
          setIsLayoutSaved(true);
        }
      } catch (error) {
        console.error("Error loading active layout:", error);
      }
    };

    loadActiveLayout();
  }, []);

  // Add a useEffect to log the widgets state whenever it changes
  useEffect(() => {
    console.log("Widgets state updated:", widgets);
    console.log(
      "Widget settings in state:",
      widgets.map((w) => ({ id: w.id, settings: w.settings })),
    );
  }, [widgets]);

  // Add this useEffect to handle window resizing
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Update the addWidget function to ensure default settings are applied
  const addWidget = (widgetId: string) => {
    if (widgets.some((w) => w.id === widgetId)) {
      toast({
        title: "Widget already added",
        description: "This widget is already on your dashboard",
      });
      return;
    }

    const widgetToAdd = AVAILABLE_WIDGETS.find((w) => w.id === widgetId);
    if (!widgetToAdd) return;

    // Create default settings for this widget type
    const defaultSettings = createDefaultWidgetSettings(widgetId);

    // Add the widget to the end of the list
    const newWidget: WidgetItem = {
      id: widgetId,
      size: "large", // Changed from "medium" to "large" for consistency
      order: widgets.length + 1,
      pinned: widgetId === "cover-profile", // Pin the cover-profile widget
      settings: defaultSettings,
    };

    setWidgets([...widgets, newWidget]);

    toast({
      title: "Widget added",
      description: `${widgetToAdd.title} has been added to your dashboard`,
    });
  };

  // Add a helper function to apply group widget sizes
  const applyGroupWidgetSizes = (widgetsToApply = widgets) => {
    // Get all unique group IDs
    const groupIds = [
      ...new Set(widgetsToApply.filter((w) => w.groupId).map((w) => w.groupId)),
    ];

    // For each group, apply the custom widths
    groupIds.forEach((groupId) => {
      if (!groupId) return;

      const groupWidgets = widgetsToApply.filter((w) => w.groupId === groupId);

      // Don't apply custom widths if we're in column layout mode
      if (shouldUseColumnLayout(windowWidth)) {
        groupWidgets.forEach((widget) => {
          const el = document.querySelector(`[data-widget-id="${widget.id}"]`);
          if (el) {
            (el as HTMLElement).style.width = "100%";
          }
        });
        return;
      }

      groupWidgets.forEach((widget) => {
        if (widget.customWidth) {
          const el = document.querySelector(`[data-widget-id="${widget.id}"]`);
          if (el) {
            (el as HTMLElement).style.width = `${widget.customWidth}%`;
          }
        }
      });
    });
  };

  // Apply custom widths whenever widgets change
  useEffect(() => {
    // Apply custom widths for group widgets after a short delay to ensure DOM is ready
    const timer = setTimeout(() => {
      applyGroupWidgetSizes();
    }, 100);

    return () => clearTimeout(timer);
  }, [widgets]);

  // Render widget content
  const renderWidgetContent = (widgetId: string) => {
    const widgetDefinition = AVAILABLE_WIDGETS.find((w) => w.id === widgetId);
    if (!widgetDefinition) return null;

    const WidgetComponent = widgetDefinition.component;
    const widget = widgets.find((w) => w.id === widgetId);

    // Debug the widget and its settings
    console.log(`Rendering widget ${widgetId}:`, widget);

    const widgetSettings = widget?.settings ?? {};
    console.log(`Widget settings for ${widgetId}:`, widgetSettings);

    // Pass showDefaultValues prop when in edit mode
    const commonProps = {
      editMode,
      profileEditMode: isProfileEditMode,
      userView,
      widgetId,
      settings: widgetSettings,
      creatorData: creator.data as CreatorWithPageAsset,
      setProfileEditMode: toggleProfileEditMode,
      showDefaultValues: editMode, // Add this prop to show default values in edit mode
    };

    // Find the renderWidgetContent function and update the CoverProfileWidget section
    if (widgetId === "cover-profile") {
      const settingsKey = JSON.stringify(widgetSettings ?? {});
      console.log(`CoverProfileWidget settings key: ${settingsKey}`);
      console.log("Current cover-profile widget settings:", widgetSettings);

      return (
        <WidgetComponent
          key={`cover-profile-${settingsKey}`}
          {...commonProps}
          onSettingsChange={(newSettings) => {
            // Prevent unnecessary updates by comparing with current settings
            const currentSettings = widget?.settings ?? {};

            console.log(
              "Cover-profile settings change requested:",
              newSettings,
            );
            console.log("Current cover-profile settings:", currentSettings);

            // Ensure we preserve height and width settings
            const updatedSettings = {
              ...currentSettings,
              ...newSettings,
              height: newSettings.height ?? currentSettings.height ?? "L",
              width: newSettings.width ?? currentSettings.width ?? "L",
              // Explicitly include coverHeight to ensure it's saved
              coverHeight:
                newSettings.coverHeight ?? currentSettings.coverHeight ?? 180,
            };

            console.log("Final updated settings to be saved:", updatedSettings);

            setWidgets(
              widgets.map((w) => {
                if (w.id === widgetId) {
                  console.log(
                    `Updating widget ${widgetId} with settings:`,
                    updatedSettings,
                  );
                  return { ...w, settings: updatedSettings };
                }
                return w;
              }),
            );
          }}
        />
      );
    }

    // Add a key prop to force re-render when settings change
    return (
      <WidgetComponent
        key={`${widgetId}-${JSON.stringify(widgetSettings)}`}
        {...commonProps}
        onSettingsChange={(newSettings) => {
          // Prevent unnecessary updates by comparing with current settings
          const currentSettings = widget?.settings ?? {};

          console.log("Settings change requested:", newSettings);
          console.log("Current settings:", currentSettings);

          setWidgets(
            widgets.map((w) => {
              if (w.id === widgetId) {
                return {
                  ...w,
                  settings: { ...currentSettings, ...newSettings },
                };
              }
              return w;
            }),
          );
        }}
      />
    );
  };

  // Fix for the referee pattern to avoid creating functions in render
  const setWidgetRef = (el: HTMLDivElement | null, id: string): void => {
    widgetRefs.current[id] = el;
  };

  const setGroupRef = (el: HTMLDivElement | null, id: string): void => {
    groupRefs.current[id] = el;
  };

  // Group widgets by row for full-width handling
  const getWidgetRows = () => {
    const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);

    // First, handle the pinned widgets (they always go at the top)
    const pinnedWidgets = sortedWidgets.filter((w) => w.pinned);
    const unpinnedWidgets = sortedWidgets.filter((w) => !w.pinned);

    // Group widgets by their groupId
    const groupedWidgets: Record<string, WidgetItem[]> = {};

    unpinnedWidgets.forEach((widget) => {
      if (widget.groupId) {
        if (!groupedWidgets[widget.groupId]) {
          groupedWidgets[widget.groupId] = [];
        }
        groupedWidgets[widget.groupId]?.push(widget);
      }
    });

    // Process unpinned widgets to determine rows
    let currentRow: (WidgetItem | WidgetItem[])[] = [];
    const rows: (WidgetItem | WidgetItem[])[][] = [];

    // Add pinned widgets as their own rows
    pinnedWidgets.forEach((widget) => {
      rows.push([widget]);
    });

    // Process remaining widgets
    let currentRowWidth = 0;
    const maxRowWidth = 12; // 12-column grid

    unpinnedWidgets.forEach((widget) => {
      // Skip widgets that are part of a group (we'll handle them separately)
      if (widget.groupId && groupedWidgets[widget.groupId]) {
        // Only process the first widget of each group to avoid duplicates
        if (groupedWidgets[widget.groupId]?.[0]?.id !== widget.id) {
          return;
        }

        // Calculate the total width of the group
        const groupWidgets = groupedWidgets[widget.groupId];
        const groupWidth = 12; // Groups always take full width

        // If this group would exceed row width, start a new row
        if (
          currentRowWidth + groupWidth > maxRowWidth &&
          currentRow.length > 0
        ) {
          rows.push([...currentRow]);
          currentRow = [];
          currentRowWidth = 0;
        }

        // Add the group to the current row
        currentRow.push(groupWidgets ?? []);
        currentRowWidth += groupWidth;

        // Remove these widgets from groupedWidgets to mark them as processed
        delete groupedWidgets[widget.groupId];
      } else if (!widget.groupId) {
        // Handle individual widgets
        const widthKey = (widget.settings?.width as WidgetWidth) ?? "L";
        // Get grid span directly from the utility function to ensure consistency
        const widgetWidth = getGridSpan(widthKey);

        // If this widget would exceed row width, start a new row
        if (
          currentRowWidth + widgetWidth > maxRowWidth &&
          currentRow.length > 0
        ) {
          rows.push([...currentRow]);
          currentRow = [];
          currentRowWidth = 0;
        }

        // Add widget to current row
        currentRow.push(widget);
        currentRowWidth += widgetWidth;
      }
    });

    // Add the last row if it has widgets
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows;
  };

  const widgetRows = getWidgetRows();

  if (creator.isLoading) return <Loading />;
  if (!creator.data) return <NotFound />;
  if (creator.data)
    return (
      <div ref={dashboardContainerRef} className="relative flex h-full flex-col">


        <div className="dashboard-content flex-1 overflow-auto p-4">
          <div className="flex flex-col gap-4">
            {widgetRows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="xs:grid-cols-4 grid grid-cols-12 gap-4 sm:grid-cols-6 md:grid-cols-12"
              >
                {row.map((item, itemIndex) => {
                  // Handle grouped widgets
                  if (Array.isArray(item)) {
                    const groupId = item[0]?.groupId;
                    return (
                      <div
                        key={`group-${groupId}`}
                        className="relative col-span-12 rounded-lg bg-muted/20 p-2"
                        ref={(el) => setGroupRef(el, groupId ?? "")}
                        data-group-id={groupId}
                      >
                        <div
                          className={`${shouldUseColumnLayout(windowWidth) ? "flex flex-col" : "flex flex-row"} w-full gap-2 pt-6`}
                        >
                          {item.map((widget, widgetIndex) => {
                            const widgetInfo = AVAILABLE_WIDGETS.find(
                              (w) => w.id === widget.id,
                            );
                            if (!widgetInfo) return null;

                            const widthPercentage = shouldUseColumnLayout(
                              windowWidth,
                            )
                              ? 100
                              : (widget.customWidth ?? 100 / item.length);

                            const heightKey =
                              (widget.settings?.height as WidgetHeight) ?? "M";
                            const height = getResponsiveHeight(
                              heightKey,
                              windowWidth,
                            );

                            return (
                              <div
                                key={widget.id}
                                className={cn(
                                  "relative",
                                  dragOverWidget === widget.id
                                    ? "ring-2 ring-primary"
                                    : "",
                                  selectedWidgets.includes(widget.id)
                                    ? "ring-2 ring-destructive"
                                    : "",
                                  "transition-all duration-200",
                                  shouldUseColumnLayout(windowWidth)
                                    ? "mb-4"
                                    : "",
                                )}
                                style={{
                                  width: `${widthPercentage}%`,
                                }}
                                data-widget-id={widget.id}
                                data-custom-width={widget.customWidth ?? ""}
                              >
                                <Card
                                  className={cn(
                                    "relative flex flex-col",
                                    widget.id === "cover-profile"
                                      ? "h-auto overflow-hidden"
                                      : "overflow-y-auto",
                                  )}
                                  style={
                                    widget.id === "cover-profile"
                                      ? { height: "auto", minHeight: "100%" }
                                      : { height: `${height}px` }
                                  }
                                  ref={(el) => setWidgetRef(el, widget.id)}
                                >
                                  <CardContent
                                    className={`p-0 ${editMode && !widget.pinned ? "pt-8" : ""}`}
                                  >
                                    {renderWidgetContent(widget.id)}
                                  </CardContent>
                                </Card>
                              </div>
                            );
                          })}

                          <FollowAndMembershipButton
                            creatorId={creator.data?.id ?? ""}
                            creatorName={creator.data?.name ?? ""}
                            hasPageAsset={!!(creator.data?.pageAsset) || !!(creator.data?.customPageAssetCodeIssuer)}
                          />
                        </div>
                      </div>
                    );
                  }

                  // Handle individual widgets
                  const widget = item;
                  const widgetInfo = AVAILABLE_WIDGETS.find(
                    (w) => w.id === widget.id,
                  );
                  if (!widgetInfo) return null;

                  // Get widget dimensions from settings
                  const dimensions = getWidgetDimensions(widget);
                  // Apply responsive height adjustment - but keep original height for cover-profile
                  dimensions.height =
                    widget.id === "cover-profile"
                      ? HEIGHT_MAP[
                      (widget.settings?.height as WidgetHeight) || "2XL"
                      ]
                      : getResponsiveHeight(
                        (widget.settings?.height as WidgetHeight) || "M",
                        windowWidth,
                      );
                  const isPinned = widget.pinned;

                  // Always use full width on small/medium devices, and always full width for cover-profile
                  const useFullWidth =
                    widget.id === "cover-profile"
                      ? true
                      : shouldUseColumnLayout(windowWidth);

                  return (
                    <div
                      key={widget.id}
                      className={cn(
                        (isPinned ?? useFullWidth)
                          ? "col-span-12"
                          : `col-span-${dimensions.gridSpan}`,
                        dragOverWidget === widget.id ? "ring-2 ring-primary" : "",
                        selectedWidgets.includes(widget.id)
                          ? "ring-2 ring-destructive"
                          : "",
                        "relative transition-all duration-200",
                      )}
                      style={{
                        gridColumn:
                          (isPinned ?? useFullWidth)
                            ? "span 12"
                            : `span ${dimensions.gridSpan}`,
                      }}
                    >
                      <Card
                        className={cn(
                          "relative flex flex-col",
                          widget.id === "cover-profile"
                            ? "h-auto overflow-hidden"
                            : "overflow-y-auto",
                        )}
                        style={
                          widget.id === "cover-profile"
                            ? { height: "auto", minHeight: "100%" }
                            : { height: `${dimensions.height}px` }
                        }
                        ref={(el) => setWidgetRef(el, widget.id)}
                      >
                        <CardContent
                          className={`p-0 ${editMode && !isPinned ? "pt-8" : ""}`}
                        >
                          {renderWidgetContent(widget.id)}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {editMode && (
          <div className="bg-muted/80 p-4 text-center">
            {selectionMode ? (
              <p className="text-sm">
                <strong>Selection Mode:</strong> Click on widgets to select them,
                then click <strong>Group Selected</strong> to group them together.
                Selected widgets: {selectedWidgets.length}
              </p>
            ) : (
              <p className="text-sm">
                Edit mode active. Drag to rearrange, use the size selector to
                resize, or remove widgets with the X button. Click{" "}
                <strong>Select Widgets</strong> to select and group widgets.
              </p>
            )}
          </div>
        )}
      </div>
    );
}

"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import type { IconWeight } from "@phosphor-icons/react";
import {
  BookmarkSimpleIcon,
  CaretDownIcon,
  CaretUpIcon,
  FastForwardIcon,
  GiftIcon,
  HouseIcon,
  LinkIcon,
  MapPinIcon,
  MusicNotesIcon,
  PauseIcon,
  PlayIcon,
  RewindIcon,
  StorefrontIcon,
  UserCircleIcon,
  VinylRecordIcon,
} from "@phosphor-icons/react/dist/ssr";

import { Glass } from "~/components/glass/glass";
import { useBottomPlayer } from "~/components/player/context/bottom-player-context";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/shadcn/ui/popover";
import { cn } from "~/lib/utils";
import type { StemTypeWithoutAssetId } from "~/types/song/song-item-types";

// Hook to detect if any dialog is open 
// This is used to hide the floating nav when a dialog is open, to prevent UI conflicts
function useIsDialogOpen() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const checkDialogOpen = () => {
      const openDialogs = document.querySelectorAll('[data-state="open"]');
      const dialogPortals = document.querySelectorAll('[role="dialog"]');

      const hasOpenDialog = openDialogs.length > 0 || dialogPortals.length > 0;
      setIsDialogOpen(hasOpenDialog);
    };

    checkDialogOpen();

    const observer = new MutationObserver(() => {
      setTimeout(checkDialogOpen, 0);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      subtree: true,
      childList: true,
    });

    const pollInterval = setInterval(checkDialogOpen, 100);

    return () => {
      observer.disconnect();
      clearInterval(pollInterval);
    };
  }, []);

  return isDialogOpen;
}

type NavItem = {
  key: string;
  path: string;
  text: string;
  icon: ComponentType<{ className?: string; weight?: IconWeight }>;
  isButton?: boolean;
  dashed?: boolean;
};

type StemEntry = Pick<StemTypeWithoutAssetId, "name" | "startTime" | "endTime" | "steamUrl">;

type StemPlaybackState = {
  isPlaying: boolean;
  volume: number;
};

const navItems: NavItem[] = [
  { key: "Home", path: "/home", text: "Home", icon: HouseIcon },
  { key: "Profile", path: "/profile", text: "Profile", icon: UserCircleIcon },
  { key: "Store", path: "/store", text: "Store", icon: StorefrontIcon },
  { key: "Gift", path: "/gift", text: "Gift", icon: GiftIcon },
  { key: "Bounty", path: "/bounty", text: "Bounty", icon: BookmarkSimpleIcon },
  { key: "Map", path: "/", text: "Map", icon: MapPinIcon },
  { key: "Lastfm", path: "/lastfm", text: "Lastfm", icon: MusicNotesIcon },
  { key: "Domain", path: "/domain", text: "Domain", icon: LinkIcon },
];

function FloatingNavItem({
  item,
  isActive,
  isExpanded,
}: {
  item: NavItem;
  isActive: boolean;
  isExpanded: boolean;
}) {
  const Icon = item.icon;
  const canExpand = isExpanded && !item.isButton;

  const itemBody = (
    <motion.div
      layout
      className={cn(
        "relative flex h-10 items-center overflow-hidden rounded-xl px-2.5 transition-colors md:h-12 md:px-3",
        canExpand ? "gap-0 md:gap-2" : "gap-0",
        "border border-black/20 text-black/85",
        isActive && !item.isButton && "text-black",
        item.dashed ? "border border-dashed border-black/35" : "border-solid",
      )}
      transition={{ type: "spring", damping: 28, stiffness: 220 }}
    >
      <Glass
        className={{
          root: "pointer-events-none absolute inset-0 z-0 rounded-xl *:rounded-xl",
          tint: isActive && !item.isButton ? "bg-yellow-400/70" : "bg-white/75",
          effect: "backdrop-blur-[2px]",
          shine:
            "shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.8),_inset_-1px_-1px_1px_1px_rgba(255,255,255,0.5)]",
        }}
      />
      <div className="relative z-30 grid size-5 place-items-center md:size-6">
        <Icon className="size-5 md:size-6" />
      </div>

      <motion.div
        className="relative z-30 hidden overflow-hidden md:block"
        initial={false}
        animate={{ maxWidth: canExpand ? 160 : 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.span
          initial={false}
          animate={{ opacity: canExpand ? 1 : 0, x: canExpand ? 0 : -6 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 hidden whitespace-nowrap pr-1 text-sm font-medium capitalize md:inline"
        >
          {item.text}
        </motion.span>
      </motion.div>
    </motion.div>
  );

  return (
    <motion.div layout>
      {item.isButton ? (
        <button type="button" className="block">
          {itemBody}
        </button>
      ) : (
        <Link href={item.path} aria-current={isActive ? "page" : undefined} className="block">
          {itemBody}
        </Link>
      )}
    </motion.div>
  );
}

function FloatingPlayer({
  isPlaying,
  onPlayToggle,
  onSeekTo,
  onPrevTrack,
  onNextTrack,
  stemEntries,
  activeStemUrl,
  currentTime,
  duration,
  trackTitle,
  trackArtist,
  isDetached,
  onToggleDock,
  onSetActiveStem,
  onToggleStemPlay,
  onSetStemVolume,
  getStemPlaying,
  getStemVolume,
  variant = "compact",
}: {
  isPlaying: boolean;
  onPlayToggle: () => void;
  onSeekTo: (seconds: number) => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  stemEntries: StemEntry[];
  activeStemUrl: string | null;
  currentTime: number;
  duration: number;
  trackTitle: string;
  trackArtist: string;
  isDetached: boolean;
  onToggleDock: () => void;
  onSetActiveStem: (stem: StemEntry) => void;
  onToggleStemPlay: (stemUrl: string) => void;
  onSetStemVolume: (stemUrl: string, volume: number) => void;
  getStemPlaying: (stemUrl: string) => boolean;
  getStemVolume: (stemUrl: string) => number;
  variant?: "compact" | "expanded";
}) {
  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";
    const wholeSeconds = Math.floor(seconds);
    const mins = Math.floor(wholeSeconds / 60);
    const secs = wholeSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safeCurrentTime = Math.min(Math.max(currentTime, 0), safeDuration || currentTime);

  const formatSpan = (start: number, end: number) => {
    const span = Math.max(0, end - start);
    return `${formatTime(start)}-${formatTime(end)} (${span.toFixed(1)}s)`;
  };

  const stemList = (
    <div className="space-y-1">
      {stemEntries.length === 0 ? (
        <div className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs text-black/60">
          No stem entries
        </div>
      ) : null}

      {stemEntries.map((stem, index) => {
        const isActiveStem = activeStemUrl === stem.steamUrl;
        const stemPlaying = getStemPlaying(stem.steamUrl);
        const stemVolume = getStemVolume(stem.steamUrl);

        return (
          <div
            key={`${stem.steamUrl}-${index}`}
            className={cn(
              "rounded-md border px-2 py-1",
              isActiveStem ? "border-yellow-400/70 bg-yellow-100/70" : "border-black/10 bg-white",
            )}
          >
            <button
              type="button"
              onClick={() => onSetActiveStem(stem)}
              className="flex w-full items-center gap-2 text-left"
            >
              <MusicNotesIcon className="size-3 shrink-0 text-black/60" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{stem.name ?? "Stem"}</p>
                <p className="truncate text-[10px] text-black/55">{formatSpan(stem.startTime, stem.endTime)}</p>
              </div>
            </button>

            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleStemPlay(stem.steamUrl)}
                className="grid size-6 shrink-0 place-items-center rounded border border-black/20 bg-white/80 hover:bg-white"
                aria-label={stemPlaying ? "Pause stem" : "Play stem"}
              >
                {stemPlaying ? <PauseIcon className="size-3" /> : <PlayIcon className="size-3" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={stemVolume}
                onChange={(event) => onSetStemVolume(stem.steamUrl, Number(event.currentTarget.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-black/20 accent-black"
                aria-label="Stem volume"
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  if (variant === "expanded") {
    return (
      <div className="relative w-full overflow-hidden rounded-xl border border-black/20 px-3 py-2 text-black">
        <Glass
          className={{
            root: "pointer-events-none absolute inset-0 z-0 rounded-xl *:rounded-xl",
            tint: "bg-white/78",
            effect:
              "backdrop-blur-[4px] bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.5),transparent_45%)]",
            shine:
              "shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.92),_inset_-1px_-1px_1px_1px_rgba(255,255,255,0.75)]",
          }}
        />
        <div className="relative z-20">
          <div className="flex items-center gap-2">
            <div className="grid size-10 shrink-0 place-items-center rounded-md border border-black/15 bg-white/60 md:size-11">
              <VinylRecordIcon className="size-5 md:size-6" />
            </div>
            <div className="min-w-0 flex-1 md:w-[220px] md:flex-none">
              <p className="truncate text-sm font-semibold leading-tight md:text-base">{trackTitle}</p>
              <p className="truncate text-[11px] text-black/70 md:text-xs">{trackArtist}</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleDock}
                className="grid size-8 shrink-0 place-items-center rounded-md border border-black/15 bg-white/65 hover:bg-white/80 md:size-9"
                aria-label="Dock player back into bottom navigation"
              >
                <CaretDownIcon className="size-4" weight="bold" />
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="grid size-8 shrink-0 place-items-center rounded-md border border-black/15 bg-white/65 hover:bg-white/80 md:size-9"
                    aria-label="Open stem controls"
                  >
                    <MusicNotesIcon className="size-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="end"
                  className="w-[300px] border border-black/10 bg-white/95 p-2 backdrop-blur md:w-[320px]"
                >
                  {stemList}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="flex shrink-0 items-center gap-1 md:gap-2">
              <button
                type="button"
                onClick={onPrevTrack}
                className="grid size-7 place-items-center rounded-full border border-black/15 bg-white/65 hover:bg-white/80 md:size-8"
                aria-label="Previous track"
              >
                <RewindIcon className="size-3 md:size-4" />
              </button>
              <button
                type="button"
                onClick={onPlayToggle}
                className="grid size-9 place-items-center rounded-full border border-black/15 bg-yellow-400/55 text-black hover:bg-yellow-400/70 md:size-10"
                aria-label={isPlaying ? "Pause track" : "Play track"}
              >
                {isPlaying ? (
                  <PauseIcon className="size-4 md:size-5" weight="fill" />
                ) : (
                  <PlayIcon className="size-4 md:size-5" weight="fill" />
                )}
              </button>
              <button
                type="button"
                onClick={onNextTrack}
                className="grid size-7 place-items-center rounded-full border border-black/15 bg-white/65 hover:bg-white/80 md:size-8"
                aria-label="Next track"
              >
                <FastForwardIcon className="size-3 md:size-4" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] text-black/65 md:gap-2 md:text-[11px]">
                <span className="w-8 text-right">{formatTime(safeCurrentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={safeDuration || 0}
                  step={0.1}
                  value={safeCurrentTime}
                  onChange={(event) => onSeekTo(Number(event.currentTarget.value))}
                  disabled={safeDuration <= 0}
                  aria-label="Seek audio position"
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-black/20 accent-black disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className="w-8">{formatTime(safeDuration)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-11 min-w-[170px] items-center gap-1.5 overflow-hidden rounded-xl border border-black/20 px-2 text-black md:h-12 md:min-w-[220px] md:gap-2">
      <Glass
        className={{
          root: "pointer-events-none absolute inset-0 z-0 rounded-xl *:rounded-xl",
          tint: "bg-yellow-300/30",
          effect: "backdrop-blur-[2px]",
          shine:
            "shadow-[inset_1px_1px_1px_0_rgba(250,204,21,0.35),_inset_-1px_-1px_1px_1px_rgba(255,255,255,0.45)]",
        }}
      />

      <div className="relative z-20 grid size-8 place-items-center rounded-lg border border-black/20 bg-white/50 md:size-9">
        <VinylRecordIcon className="size-4 md:size-5" />
      </div>

      <div className="relative z-20 min-w-0 flex-1">
        <p className="truncate text-[10px] leading-none text-black/75 md:text-[11px]">Now Playing</p>
        <p className="truncate text-xs font-semibold leading-tight md:text-sm">{trackTitle}</p>
        <p className="max-w-[6rem] truncate text-[10px] leading-none text-black/70 md:max-w-[8rem]">{trackArtist}</p>
      </div>

      <div className="relative z-20 flex items-center gap-1">
        <button
          type="button"
          onClick={onPrevTrack}
          className="grid size-6 place-items-center rounded-md border border-black/20 bg-white/55 hover:bg-white/75 md:size-7"
          aria-label="Previous track"
        >
          <RewindIcon className="size-3 md:size-4" />
        </button>
        <button
          type="button"
          onClick={onPlayToggle}
          className="grid size-7 place-items-center rounded-md border border-black/20 bg-yellow-400/60 hover:bg-yellow-400/75 md:size-8"
          aria-label={isPlaying ? "Pause track" : "Play track"}
        >
          {isPlaying ? <PauseIcon className="size-3 md:size-4" /> : <PlayIcon className="size-3 md:size-4" />}
        </button>
        <button
          type="button"
          onClick={onNextTrack}
          className="grid size-6 place-items-center rounded-md border border-black/20 bg-white/55 hover:bg-white/75 md:size-7"
          aria-label="Next track"
        >
          <FastForwardIcon className="size-3 md:size-4" />
        </button>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="grid size-6 place-items-center rounded-md border border-black/20 bg-white/55 hover:bg-white/75 md:size-7"
              aria-label="Open stem controls"
            >
              <MusicNotesIcon className="size-3 md:size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-[300px] border border-black/10 bg-white/95 p-2 backdrop-blur md:w-[320px]"
          >
            {stemList}
          </PopoverContent>
        </Popover>
        <button
          type="button"
          onClick={onToggleDock}
          className="ml-0.5 grid size-7 place-items-center rounded-md border border-black/20 bg-yellow-300/50 hover:bg-yellow-300/65 md:ml-1 md:size-8"
          aria-label={isDetached ? "Dock player back into bottom navigation" : "Move player to top bar"}
        >
          {isDetached ? (
            <CaretDownIcon className="size-4" weight="bold" />
          ) : (
            <CaretUpIcon className="size-4" weight="bold" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function GlobalFloatingNav() {
  const router = useRouter();
  const { isPlayerVisible, currentTracks, currentSong, hidePlayer } = useBottomPlayer();

  const singleAudioRef = useRef<HTMLAudioElement>(null);
  const stemAudioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerDetached, setIsPlayerDetached] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeStemUrl, setActiveStemUrl] = useState<string | null>(null);
  const [stemPlayback, setStemPlayback] = useState<Record<string, StemPlaybackState>>({});

  const isDialogOpen = useIsDialogOpen();

  const stemEntries = useMemo<StemEntry[]>(() => {
    return (currentTracks ?? [])
      .filter((stem) => typeof stem.steamUrl === "string" && stem.steamUrl.length > 0)
      .map((stem) => ({
        name: stem.name,
        startTime: stem.startTime,
        endTime: stem.endTime,
        steamUrl: stem.steamUrl,
      }));
  }, [currentTracks]);

  const hasStemMode = stemEntries.length > 0;
  const singleTrackUrl = currentSong?.url?.trim() ?? "";
  const shouldShowPlayer = Boolean(isPlayerVisible && currentSong && (hasStemMode || singleTrackUrl));
  const activeKey =
    navItems.find((item) =>
      item.path === "/" ? router.pathname === "/" : router.pathname?.startsWith(item.path),
    )?.key ?? "";

  const displayTrackTitle = useMemo(() => {
    if (activeStemUrl) {
      const stem = stemEntries.find((entry) => entry.steamUrl === activeStemUrl);
      if (stem) return `${currentSong?.title ?? "Untitled Track"} - ${stem.name ?? "Stem"}`;
    }
    return currentSong?.title ?? "";
  }, [activeStemUrl, currentSong?.title, stemEntries]);

  const displayTrackArtist = currentSong?.artist ?? "";

  const togglePlayerDock = () => setIsPlayerDetached((current) => !current);

  const getStemPlaying = (stemUrl: string) => stemPlayback[stemUrl]?.isPlaying ?? false;
  const getStemVolume = (stemUrl: string) => stemPlayback[stemUrl]?.volume ?? 1;

  useEffect(() => {
    const nextState: Record<string, StemPlaybackState> = {};
    stemEntries.forEach((stem) => {
      nextState[stem.steamUrl] = {
        isPlaying: stemPlayback[stem.steamUrl]?.isPlaying ?? true,
        volume: stemPlayback[stem.steamUrl]?.volume ?? 1,
      };
    });

    setStemPlayback(nextState);
    setActiveStemUrl((current) => {
      if (current && nextState[current]) return current;
      return stemEntries[0]?.steamUrl ?? null;
    });
  }, [stemEntries]);

  useEffect(() => {
    if (!hasStemMode) {
      Object.values(stemAudioRefs.current).forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      stemAudioRefs.current = {};
      return;
    }

    const activeUrls = new Set(stemEntries.map((stem) => stem.steamUrl));

    Object.entries(stemAudioRefs.current).forEach(([url, audio]) => {
      if (activeUrls.has(url)) return;
      audio.pause();
      audio.src = "";
      delete stemAudioRefs.current[url];
    });

    stemEntries.forEach((stem) => {
      const url = stem.steamUrl;
      const existing = stemAudioRefs.current[url];
      if (existing) return;

      const audio = new Audio(url);
      audio.crossOrigin = "anonymous";
      audio.preload = "metadata";
      audio.currentTime = 0;
      audio.volume = getStemVolume(url);
      stemAudioRefs.current[url] = audio;
    });
  }, [hasStemMode, stemEntries]);

  useEffect(() => {
    if (!shouldShowPlayer) {
      const singleAudio = singleAudioRef.current;
      if (singleAudio) {
        singleAudio.pause();
      }
      Object.values(stemAudioRefs.current).forEach((audio) => audio.pause());
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setIsPlayerDetached(false);
      return;
    }

    setCurrentTime(0);
    setDuration(hasStemMode ? Math.max(...stemEntries.map((stem) => stem.endTime), 0) : 0);
    setIsPlaying(true);
  }, [shouldShowPlayer, hasStemMode, stemEntries, currentSong?.title, currentSong?.artist, currentSong?.url]);

  useEffect(() => {
    if (!shouldShowPlayer || !hasStemMode) return;

    const nextDuration = Math.max(...stemEntries.map((stem) => stem.endTime), 0);
    if (Number.isFinite(nextDuration) && nextDuration > 0) {
      setDuration(nextDuration);
    }
  }, [shouldShowPlayer, hasStemMode, stemEntries]);

  useEffect(() => {
    const singleAudio = singleAudioRef.current;
    if (!singleAudio || !shouldShowPlayer || hasStemMode || !singleTrackUrl) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(singleAudio.currentTime);
    const handleLoadedMetadata = () => {
      if (Number.isFinite(singleAudio.duration) && singleAudio.duration > 0) {
        setDuration(singleAudio.duration);
      }
      setCurrentTime(singleAudio.currentTime);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      hidePlayer();
    };

    singleAudio.addEventListener("play", handlePlay);
    singleAudio.addEventListener("pause", handlePause);
    singleAudio.addEventListener("timeupdate", handleTimeUpdate);
    singleAudio.addEventListener("loadedmetadata", handleLoadedMetadata);
    singleAudio.addEventListener("ended", handleEnded);

    return () => {
      singleAudio.removeEventListener("play", handlePlay);
      singleAudio.removeEventListener("pause", handlePause);
      singleAudio.removeEventListener("timeupdate", handleTimeUpdate);
      singleAudio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      singleAudio.removeEventListener("ended", handleEnded);
    };
  }, [shouldShowPlayer, hasStemMode, singleTrackUrl, hidePlayer]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!shouldShowPlayer || !hasStemMode) return;

    timerRef.current = setInterval(() => {
      const clockUrl = activeStemUrl ?? stemEntries[0]?.steamUrl;
      if (!clockUrl) return;
      const clockAudio = stemAudioRefs.current[clockUrl];
      if (!clockAudio) return;
      setCurrentTime(clockAudio.currentTime);

      const maxDuration = Math.max(...stemEntries.map((stem) => stem.endTime), 0);
      if (maxDuration > 0) {
        setDuration(maxDuration);
      }

      if (isPlaying && maxDuration > 0 && clockAudio.currentTime >= maxDuration - 0.1) {
        setIsPlaying(false);
        hidePlayer();
      }
    }, 150);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [shouldShowPlayer, hasStemMode, stemEntries, activeStemUrl, isPlaying, hidePlayer]);

  useEffect(() => {
    if (!shouldShowPlayer) return;

    if (!hasStemMode) {
      const singleAudio = singleAudioRef.current;
      if (!singleAudio || !singleTrackUrl) return;

      singleAudio.src = singleTrackUrl;
      singleAudio.currentTime = 0;
      singleAudio.load();

      if (isPlaying) {
        singleAudio.play().catch(() => setIsPlaying(false));
      }
      return;
    }

    const targetTime = Math.max(currentTime, 0);
    stemEntries.forEach((stem) => {
      const audio = stemAudioRefs.current[stem.steamUrl];
      if (!audio) return;
      audio.currentTime = targetTime;
      audio.volume = getStemVolume(stem.steamUrl);
      if (isPlaying && getStemPlaying(stem.steamUrl)) {
        audio.play().catch(() => undefined);
      } else {
        audio.pause();
      }
    });
  }, [shouldShowPlayer, hasStemMode, singleTrackUrl, stemEntries, isPlaying]);

  const handleSeekTo = (seconds: number) => {
    const next = Math.max(0, Math.min(duration || Number.POSITIVE_INFINITY, seconds));
    setCurrentTime(next);

    if (hasStemMode) {
      Object.values(stemAudioRefs.current).forEach((audio) => {
        audio.currentTime = next;
      });
      return;
    }

    const singleAudio = singleAudioRef.current;
    if (!singleAudio) return;
    singleAudio.currentTime = next;
  };

  const handlePlayToggle = () => {
    if (!shouldShowPlayer) return;

    if (hasStemMode) {
      if (isPlaying) {
        Object.values(stemAudioRefs.current).forEach((audio) => audio.pause());
        setIsPlaying(false);
        return;
      }

      stemEntries.forEach((stem) => {
        const audio = stemAudioRefs.current[stem.steamUrl];
        if (!audio) return;
        audio.currentTime = currentTime;
        audio.volume = getStemVolume(stem.steamUrl);
        if (getStemPlaying(stem.steamUrl)) {
          audio.play().catch(() => undefined);
        }
      });
      setIsPlaying(true);
      return;
    }

    const singleAudio = singleAudioRef.current;
    if (!singleAudio) return;

    if (singleAudio.paused) {
      singleAudio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      return;
    }

    singleAudio.pause();
    setIsPlaying(false);
  };

  const handleToggleStemPlay = (stemUrl: string) => {
    const nextPlaying = !getStemPlaying(stemUrl);

    setStemPlayback((prev) => ({
      ...prev,
      [stemUrl]: {
        isPlaying: nextPlaying,
        volume: prev[stemUrl]?.volume ?? 1,
      },
    }));

    const audio = stemAudioRefs.current[stemUrl];
    if (!audio) return;
    audio.volume = getStemVolume(stemUrl);

    if (hasStemMode && isPlaying && nextPlaying) {
      audio.currentTime = currentTime;
      audio.play().catch(() => undefined);
      return;
    }

    audio.pause();
  };

  const handleSetStemVolume = (stemUrl: string, volume: number) => {
    const safeVolume = Math.min(Math.max(volume, 0), 1);

    setStemPlayback((prev) => ({
      ...prev,
      [stemUrl]: {
        isPlaying: prev[stemUrl]?.isPlaying ?? true,
        volume: safeVolume,
      },
    }));

    const audio = stemAudioRefs.current[stemUrl];
    if (audio) {
      audio.volume = safeVolume;
    }
  };

  const handleSetActiveStem = (stem: StemEntry) => {
    setActiveStemUrl(stem.steamUrl);
  };

  const handlePrevTrack = () => {
    if (!hasStemMode || stemEntries.length === 0) return;

    const currentIndex = stemEntries.findIndex((stem) => stem.steamUrl === activeStemUrl);
    const nextIndex = currentIndex <= 0 ? stemEntries.length - 1 : currentIndex - 1;
    const targetStem = stemEntries[nextIndex];
    if (!targetStem) return;

    setActiveStemUrl(targetStem.steamUrl);

    setStemPlayback((prev) => {
      const next: Record<string, StemPlaybackState> = {};
      stemEntries.forEach((stem) => {
        next[stem.steamUrl] = {
          isPlaying: stem.steamUrl === targetStem.steamUrl,
          volume: prev[stem.steamUrl]?.volume ?? 1,
        };
      });
      return next;
    });

    if (isPlaying) {
      stemEntries.forEach((stem) => {
        const audio = stemAudioRefs.current[stem.steamUrl];
        if (!audio) return;
        if (stem.steamUrl === targetStem.steamUrl) {
          audio.currentTime = currentTime;
          audio.play().catch(() => undefined);
        } else {
          audio.pause();
        }
      });
    }
  };

  const handleNextTrack = () => {
    if (!hasStemMode || stemEntries.length === 0) return;

    const currentIndex = stemEntries.findIndex((stem) => stem.steamUrl === activeStemUrl);
    const nextIndex = currentIndex < 0 || currentIndex >= stemEntries.length - 1 ? 0 : currentIndex + 1;
    const targetStem = stemEntries[nextIndex];
    if (!targetStem) return;

    setActiveStemUrl(targetStem.steamUrl);

    setStemPlayback((prev) => {
      const next: Record<string, StemPlaybackState> = {};
      stemEntries.forEach((stem) => {
        next[stem.steamUrl] = {
          isPlaying: stem.steamUrl === targetStem.steamUrl,
          volume: prev[stem.steamUrl]?.volume ?? 1,
        };
      });
      return next;
    });

    if (isPlaying) {
      stemEntries.forEach((stem) => {
        const audio = stemAudioRefs.current[stem.steamUrl];
        if (!audio) return;
        if (stem.steamUrl === targetStem.steamUrl) {
          audio.currentTime = currentTime;
          audio.play().catch(() => undefined);
        } else {
          audio.pause();
        }
      });
    }
  };

  return (
    <>
      <audio ref={singleAudioRef} preload="metadata" />

      {shouldShowPlayer && isPlayerDetached ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center px-2 pb-24 md:px-4 md:pb-28">
          <motion.div
            layout
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={isDialogOpen ? { y: 200, opacity: 0 } : { y: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className={cn("pointer-events-auto w-full max-w-[920px]", isDialogOpen && "pointer-events-none")}
          >
            <FloatingPlayer
              isPlaying={isPlaying}
              onPlayToggle={handlePlayToggle}
              onSeekTo={handleSeekTo}
              onPrevTrack={handlePrevTrack}
              onNextTrack={handleNextTrack}
              stemEntries={stemEntries}
              activeStemUrl={activeStemUrl}
              currentTime={currentTime}
              duration={duration}
              trackTitle={displayTrackTitle}
              trackArtist={displayTrackArtist}
              isDetached={isPlayerDetached}
              onToggleDock={togglePlayerDock}
              onSetActiveStem={handleSetActiveStem}
              onToggleStemPlay={handleToggleStemPlay}
              onSetStemVolume={handleSetStemVolume}
              getStemPlaying={getStemPlaying}
              getStemVolume={getStemVolume}
              variant="expanded"
            />
          </motion.div>
        </div>
      ) : null}

      <div className="pointer-events-none fixed inset-0 z-[60] flex items-end justify-center px-2 pb-4 md:px-4 md:pb-6">
        <motion.div
          layout
          initial={{ y: 42, opacity: 0, scale: 0.97 }}
          animate={isDialogOpen ? { y: 200, opacity: 0 } : { y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 22, stiffness: 280 }}
          className={cn(
            "relative z-20 overflow-hidden rounded-2xl border border-black/20 p-1.5 md:max-w-[calc(100vw-2rem)] md:p-2",
            shouldShowPlayer && !isPlayerDetached
              ? "w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] md:w-fit"
              : "w-fit max-w-[calc(100vw-1rem)]",
            isDialogOpen ? "pointer-events-none" : "pointer-events-auto"
          )}
        >
          <Glass
            className={{
              root: "pointer-events-none absolute inset-0 z-0 rounded-2xl *:rounded-2xl",
              tint: "bg-[#f3f1ea]/60 transition-colors",
              effect:
                "backdrop-blur-[8px] bg-[radial-gradient(circle_at_20%_20%,rgba(255,251,242,0.24),rgba(248,243,232,0.08)_55%,rgba(245,240,230,0.03)_100%)] transition-all",
              shine:
                "shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.85),_inset_-1px_-1px_1px_1px_rgba(255,255,255,0.5)]",
            }}
          />
          <motion.nav
            layout
            className="relative z-10 flex items-center gap-1.5 overflow-x-auto pb-0.5 md:gap-2 md:overflow-x-hidden"
          >
            {navItems.map((item) => {
              const isActive = activeKey === item.key;
              return (
                <FloatingNavItem
                  key={item.key}
                  item={item}
                  isActive={isActive}
                  isExpanded={isActive}
                />
              );
            })}

            {shouldShowPlayer && !isPlayerDetached ? <div className="mx-1 h-8 w-px bg-black/20" /> : null}

            {shouldShowPlayer && !isPlayerDetached ? (
              <FloatingPlayer
                isPlaying={isPlaying}
                onPlayToggle={handlePlayToggle}
                onSeekTo={handleSeekTo}
                onPrevTrack={handlePrevTrack}
                onNextTrack={handleNextTrack}
                stemEntries={stemEntries}
                activeStemUrl={activeStemUrl}
                currentTime={currentTime}
                duration={duration}
                trackTitle={displayTrackTitle}
                trackArtist={displayTrackArtist}
                isDetached={isPlayerDetached}
                onToggleDock={togglePlayerDock}
                onSetActiveStem={handleSetActiveStem}
                onToggleStemPlay={handleToggleStemPlay}
                onSetStemVolume={handleSetStemVolume}
                getStemPlaying={getStemPlaying}
                getStemVolume={getStemVolume}
              />
            ) : null}
          </motion.nav>
        </motion.div>
      </div>
    </>
  );
}

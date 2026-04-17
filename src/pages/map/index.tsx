"use client";

import {
  memo,
  useEffect,
  useRef,
  useState,
  useCallback,
  type MouseEvent,
} from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useSession } from "next-auth/react";
import { useCreatorStorageAcc } from "~/lib/state/wallete/stellar-balances";
import { api } from "~/utils/api";
import { ClipboardList, MapPin, Settings } from "lucide-react";
import Image from "next/image";
import mapboxgl, { Marker } from "mapbox-gl";
import MapboxMap from "~/components/mapbox/mapbox";

import { NearbyLocationsPanel } from "~/components/map/nearby-locations-panel";
import { getPinIcon } from "~/utils/map-helpers";

import { useGeolocation } from "~/hooks/use-geolocation";
import { useMapState } from "~/hooks/use-map-state";
import { useMapInteractions } from "~/hooks/use-map-interactions";
import { usePinsData } from "~/hooks/use-pins-data";
import { PinType, type Location, type LocationGroup } from "@prisma/client";
import { MapControls } from "~/components/map/map-controls";
import AgentChat from "~/components/agent/AgentChat";
import { MapHeader } from "~/components/map/map-header";
import CreatePinModal from "~/components/modal/creator-create-pin-modal";
import PinDetailAndActionsModal from "~/components/modal/pin-detail-modal";
import {
  useMapInteractionStore,
  useNearbyPinsStore,
} from "~/components/store/map-stores";
import Link from "next/link";
import { Button } from "~/components/shadcn/ui/button";
import { useTheme } from "next-themes";
import { useSelectedAutoSuggestion } from "~/lib/state/map/useSelectedAutoSuggestion";
import CreateHotspotModal from "~/components/modal/create-hotspot-modal";
import HotspotDetailModal from "~/components/modal/hotspot-details-modal";
import { MapboxDrawing } from "~/components/mapbox/mapbox-drawing";
import disc from "./disc.png";
import fire from "./fire.png";
import like from "./like.png";

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??
  process.env.NEXT_PUBLIC_MAPBOX_API ??
  "";
mapboxgl.accessToken = MAPBOX_TOKEN;

type Pin = Location & {
  locationGroup:
  | (LocationGroup & {
    creator: { profileUrl: string | null };
  })
  | null;
  _count: {
    consumers: number;
  };
};

type DrawingMode = "polygon" | "rectangle" | "circle";

function GuestJoinOverlay() {
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [8, -8]), {
    stiffness: 140,
    damping: 22,
    mass: 0.6,
  });
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-8, 8]), {
    stiffness: 140,
    damping: 22,
    mass: 0.6,
  });
  const fireOffsetX = useSpring(
    useTransform(pointerX, [-0.5, 0.5], [-14, 14]),
    {
      stiffness: 120,
      damping: 24,
    },
  );
  const fireOffsetY = useSpring(
    useTransform(pointerY, [-0.5, 0.5], [-10, 10]),
    {
      stiffness: 120,
      damping: 24,
    },
  );
  const likeOffsetX = useSpring(
    useTransform(pointerX, [-0.5, 0.5], [12, -12]),
    {
      stiffness: 120,
      damping: 24,
    },
  );
  const likeOffsetY = useSpring(useTransform(pointerY, [-0.5, 0.5], [8, -8]), {
    stiffness: 120,
    damping: 24,
  });

  const handleParallaxMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    pointerX.set(x);
    pointerY.set(y);
  };

  const handleParallaxLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-transparent via-black/40 via-40% to-transparent">
      <motion.header
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute inset-0 mx-auto flex h-full w-full max-w-4xl items-center justify-center px-4 pb-36 md:pb-20"
      >
        <div
          className="pointer-events-auto relative"
          onMouseMove={handleParallaxMove}
          onMouseLeave={handleParallaxLeave}
        >
          <motion.article
            initial={{ opacity: 0, y: 20, scale: 0 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{ rotateX, rotateY, transformPerspective: 1200 }}
            className="relative w-[min(92vw,760px)]"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: 0.52,
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mx-auto aspect-square w-[min(62vw,320px)] overflow-hidden rounded-full border-[8px] border-white/95 shadow-[0_36px_90px_-34px_rgba(11,48,132,0.95)]"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 16, ease: "linear", repeat: Infinity }}
                className="relative size-full"
              >
                <Image
                  src={disc}
                  alt=""
                  fill
                  className="object-cover"
                  priority
                />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.86,
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute left-2 top-2 w-[10.75rem] overflow-hidden rounded-2xl border border-black/20 bg-white p-3 text-black shadow-[0_14px_34px_-22px_rgba(0,0,0,0.8)] md:left-10 md:top-14 md:w-[14rem] md:p-4"
            >
              <div className="flex h-full flex-col">
                <h3 className="text-lg font-semibold leading-tight md:text-xl">
                  Join As User
                </h3>
                <p className="mt-1 text-xs text-black/65 md:text-sm">
                  Discover the map and start collecting instantly.
                </p>
                <Link href="/home" className="mt-4">
                  <Button className="w-full">Join as User</Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.94,
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute bottom-2 right-2 w-[10.75rem] overflow-hidden rounded-2xl border border-black/20 bg-white p-3 text-black shadow-[0_14px_34px_-22px_rgba(0,0,0,0.8)] md:-right-8 md:bottom-10 md:w-[14rem] md:p-4"
            >
              <div className="flex h-full flex-col">
                <h3 className="text-lg font-semibold leading-tight md:text-xl">
                  Join As Artist
                </h3>
                <p className="mt-1 text-xs text-black/65 md:text-sm">
                  Create your page, publish music, and place hotspots.
                </p>
                <Link href="/home" className="mt-4">
                  <Button className="w-full">Join as Artist</Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.88, rotate: -6 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              transition={{
                delay: 0.96,
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute right-[24%] top-[18%] md:right-[23%] md:top-[16%]"
            >
              <motion.div style={{ x: fireOffsetX, y: fireOffsetY }}>
                <Image src={fire} alt="" className="w-20 md:w-28" />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.88, rotate: -18 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: -10 }}
              transition={{
                delay: 1.02,
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute bottom-[19%] left-[25%] md:bottom-[17%] md:left-[23%]"
            >
              <motion.div style={{ x: likeOffsetX, y: likeOffsetY }}>
                <Image src={like} alt="" className="w-[4.5rem] md:w-24" />
              </motion.div>
            </motion.div>
          </motion.article>
        </div>
      </motion.header>
    </div>
  );
}

function CreatorMapDashboardContent() {
  const session = useSession();
  const isAuthenticated = session.status === "authenticated";
  const isGuest = session.status === "unauthenticated";
  const {
    duplicate,
    manual,
    setManual,
    position,
    setPosition,
    openCreatePinModal,
    openPinDetailModal,
    selectedPinForDetail,
    closePinDetailModal,
    setPrevData,
    isPinCopied,
    isPinCut,
    copiedPinData,
    setIsAutoCollect,
  } = useMapInteractionStore();

  const { setBalance } = useCreatorStorageAcc();
  const {
    mapZoom,
    setMapZoom,
    mapCenter,
    setMapCenter,
    centerChanged,
    setCenterChanged,
    isCordsSearch,
    setIsCordsSearch,
    searchCoordinates,
    setSearchCoordinates,
    cordSearchCords,
    setCordSearchCords,
  } = useMapState();

  const [showExpired, setShowExpired] = useState<boolean>(false);
  const [openHostpotModal, setOpenHotspotModal] = useState(false);
  const [hotspotData, setHotspotData] = useState<GeoJSON.Feature | null>(null);
  const [selectedShape, setSelectedShape] = useState<DrawingMode>("polygon");
  const [isCreatingHotspot, setIsCreatingHotspot] = useState(false);
  const [mapContainerRef, setMapContainerRef] = useState<HTMLDivElement | null>(
    null,
  );

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const { theme } = useTheme();
  const { filterNearbyPins } = useNearbyPinsStore();
  const { selectedPlace: alreadySelectedPlace } = useSelectedAutoSuggestion();

  const userLocationMarkerRef = useRef<Marker | null>(null);
  const searchMarkerRef = useRef<Marker | null>(null);
  const cordSearchMarkerRef = useRef<Marker | null>(null);
  const pinMarkersRef = useRef<Marker[]>([]);
  const hotspotLayersRef = useRef<string[]>([]);

  const handleCreateHotspot = () => setIsCreatingHotspot(true);

  const handleHotspotSelection = (
    feature: GeoJSON.Feature | null,
    activeMode: DrawingMode,
  ) => {
    setOpenHotspotModal(true);
    setHotspotData(feature);
    setSelectedShape(activeMode);
    setIsCreatingHotspot(false);
  };

  useGeolocation(setMapCenter, setMapZoom);
  usePinsData(showExpired, isAuthenticated);

  const { handleMapClick, handleZoomIn, handleZoomOut, handleDragEnd } =
    useMapInteractions({
      setManual,
      setPosition,
      openCreatePinModal,
      openPinDetailModal,
      isPinCopied,
      isPinCut,
      duplicate,
      copiedPinData,
      setMapZoom,
      mapZoom,
      filterNearbyPins: (bounds) => filterNearbyPins(bounds, "my"),
      centerChanged,
    });

  api.wallate.acc.getCreatorStorageBallances.useQuery(undefined, {
    onSuccess: (data) => {
      setBalance(data);
    },
    onError: (error) => {
      console.error("Failed to fetch creator storage balances:", error);
    },
    refetchOnWindowFocus: false,
    enabled: isAuthenticated,
  });

  const myPinsQuery = api.maps.pin.getMyPins.useQuery(
    { showExpired: false },
    { enabled: isAuthenticated },
  );

  useEffect(() => {
    if (!myPinsQuery.data || myPinsQuery.data.length === 0) return;
    if (mapCenter.lng !== 0) return;

    const firstPin = myPinsQuery.data[0];
    if (firstPin) {
      setMapCenter({ lat: firstPin.latitude, lng: firstPin.longitude });
    }
  }, [myPinsQuery.data, mapCenter.lng, setMapCenter]);

  useEffect(() => {
    if (alreadySelectedPlace) {
      const lngLat = [alreadySelectedPlace.lng, alreadySelectedPlace.lat] as [
        number,
        number,
      ];
      setMapCenter({
        lat: alreadySelectedPlace.lat,
        lng: alreadySelectedPlace.lng,
      });
      setMapZoom(13);
      setPosition({
        lat: alreadySelectedPlace.lat,
        lng: alreadySelectedPlace.lng,
      });
    }
  }, [alreadySelectedPlace, setMapCenter, setMapZoom, setPosition]);

  useEffect(() => {
    if (position) {
      setMapCenter(position);
      setMapZoom(14);
    }
  }, [position, setMapCenter, setMapZoom]);

  const handleManualPinClick = () => {
    setManual(true);
    setPosition(undefined);
    setPrevData(undefined);
    openCreatePinModal();
  };

  const handleMapLoad = useCallback((map: mapboxgl.Map) => {
    mapRef.current = map;
    setIsMapReady(true);
  }, []);

  const handleMapClickInternal = useCallback(
    (e: mapboxgl.MapMouseEvent & mapboxgl.EventData) => {
      if (!mapRef.current) return;

      const center = mapRef.current.getCenter();
      const bounds = mapRef.current.getBounds();

      setMapCenter({ lat: center.lat, lng: center.lng });
      setCenterChanged(bounds);

      handleMapClick(e as unknown as MouseEvent);
    },
    [handleMapClick, setMapCenter, setCenterChanged],
  );

  const handleDragEndInternal = useCallback(() => {
    if (!mapRef.current) return;

    const center = mapRef.current.getCenter();
    const bounds = mapRef.current.getBounds();

    setMapCenter({ lat: center.lat, lng: center.lng });
    setCenterChanged(bounds);
    handleDragEnd();
  }, [handleDragEnd, setMapCenter, setCenterChanged]);

  // Update user location marker
  useEffect(() => {
    if (!mapRef.current || !position || isCordsSearch) return;

    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.remove();
    }

    try {
      const el = document.createElement("div");
      el.className =
        "w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg";

      userLocationMarkerRef.current = new Marker({ element: el })
        .setLngLat([position.lng, position.lat])
        .addTo(mapRef.current);
    } catch (error) {
      console.error("Error adding user location marker:", error);
    }
  }, [position, isCordsSearch]);

  // Update search coordinates marker
  useEffect(() => {
    if (!mapRef.current || !searchCoordinates || !isCordsSearch) return;

    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
    }

    try {
      const el = document.createElement("div");
      el.className = "animate-bounce";
      el.innerHTML = `<svg class="w-8 h-8 text-red-500 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg>`;

      searchMarkerRef.current = new Marker({ element: el })
        .setLngLat([searchCoordinates.lng, searchCoordinates.lat])
        .addTo(mapRef.current);
    } catch (error) {
      console.error("Error adding search marker:", error);
    }
  }, [searchCoordinates, isCordsSearch]);

  // Update cord search marker
  useEffect(() => {
    if (!mapRef.current || !cordSearchCords || !isCordsSearch) return;

    if (cordSearchMarkerRef.current) {
      cordSearchMarkerRef.current.remove();
    }

    try {
      const el = document.createElement("div");
      el.className = "animate-bounce";
      el.innerHTML = `<svg class="w-8 h-8 text-red-500 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg>`;

      cordSearchMarkerRef.current = new Marker({ element: el })
        .setLngLat([cordSearchCords.lng, cordSearchCords.lat])
        .addTo(mapRef.current);
    } catch (error) {
      console.error("Error adding cord search marker:", error);
    }
  }, [cordSearchCords, isCordsSearch]);

  // Clean up markers on unmount
  useEffect(() => {
    return () => {
      try {
        userLocationMarkerRef.current?.remove();
      } catch (error) {
        console.error("Error removing user location marker:", error);
      }
      try {
        searchMarkerRef.current?.remove();
      } catch (error) {
        console.error("Error removing search marker:", error);
      }
      try {
        cordSearchMarkerRef.current?.remove();
      } catch (error) {
        console.error("Error removing cord search marker:", error);
      }
      try {
        pinMarkersRef.current.forEach((m) => m.remove());
      } catch (error) {
        console.error("Error removing pin markers:", error);
      }
    };
  }, []);

  return (
    <>
      <div className="relative h-screen w-full overflow-hidden">
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-slate-900/5 via-transparent to-transparent" />
        {isAuthenticated ? (
          <MapHeader
            showExpired={showExpired}
            setShowExpired={setShowExpired}
            onManualPinClick={handleManualPinClick}
            onCreateHotspot={handleCreateHotspot}
            onPlaceSelect={(place) => {
              setMapCenter({ lat: place.lat, lng: place.lng });
              setMapZoom(13);
              setPosition({ lat: place.lat, lng: place.lng });
              setIsCordsSearch(false);
            }}
            onCenterChange={setMapCenter}
            setIsCordsSearch={setIsCordsSearch}
            setSearchCoordinates={setSearchCoordinates}
            setCordSearchLocation={setCordSearchCords}
            setZoom={setMapZoom}
            mapInstance={mapRef.current}
          />
        ) : null}

        <MapboxMap
          initialCenter={[mapCenter.lng, mapCenter.lat]}
          initialZoom={15.3}
          initialBearing={-18}
          initialPitch={42}
          height="100vh"
          onMapLoad={handleMapLoad}
          onMapClick={handleMapClickInternal}
          onDragEnd={handleDragEndInternal}
          onContainerRef={setMapContainerRef}
        >
          {isAuthenticated ? (
            <>
              {!isCreatingHotspot && (
                <MapControls
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  mapInstance={mapRef.current}
                />
              )}
              <MyPins
                onPinClick={(pin) => {
                  openPinDetailModal(pin);
                  setIsAutoCollect(pin.autoCollect);
                }}
                showExpired={showExpired}
                mapInstance={mapRef.current}
                isMapReady={isMapReady}
              />
              <MyHotspots mapInstance={mapRef.current} />
            </>
          ) : null}
        </MapboxMap>

        {isCreatingHotspot && mapContainerRef && (
          <MapboxDrawing
            map={mapRef.current ?? undefined}
            mapElement={mapContainerRef}
            onSelectionChange={handleHotspotSelection}
            onClose={() => setIsCreatingHotspot(false)}
          />
        )}

        {isGuest ? <GuestJoinOverlay /> : null}
      </div>

      {isAuthenticated ? (
        <>
          <Link href="/map/collection-report">
            <button className="absolute bottom-44 right-6 z-20 inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 lg:bottom-8">
              <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
              <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
                <ClipboardList className="mr-2 h-4 w-4" /> Collection Reports
              </span>
            </button>
          </Link>
          <Link href="/map/pin-manage">
            <button className="absolute bottom-60 right-6 z-20 inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 lg:bottom-24">
              <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
              <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
                <Settings className="mr-2 h-4 w-4" />  Manage Pins
              </span>
            </button>
          </Link>
          {!isCreatingHotspot && (
            <NearbyLocationsPanel
              onSelectPlace={(coords) => {
                setMapCenter(coords);
                setMapZoom(13);
                setPosition(coords);
              }}
            />
          )}

          <CreatePinModal />
          <PinDetailAndActionsModal />
          <AgentChat />

          {openHostpotModal && (
            <CreateHotspotModal
              isOpen={openHostpotModal}
              setIsOpen={setOpenHotspotModal}
              hotspotData={hotspotData}
              shape={selectedShape}
            />
          )}
        </>
      ) : null}
    </>
  );
}

export default CreatorMapDashboardContent;

const MyPins = memo(function MyPins({
  onPinClick,
  showExpired,
  mapInstance,
  isMapReady,
}: {
  onPinClick: (pin: Pin) => void;
  showExpired: boolean;
  mapInstance: mapboxgl.Map | null;
  isMapReady: boolean;
}) {
  const { myPins, setMyPins } = useNearbyPinsStore();
  const { setMapCenter } = useMapState();
  const pinsQuery = api.maps.pin.getMyPins.useQuery({ showExpired });
  const markersRef = useRef<Marker[]>([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (
      pinsQuery.data &&
      pinsQuery.data.length > 0 &&
      !initializedRef.current
    ) {
      initializedRef.current = true;
      setMyPins(pinsQuery.data);
      const firstPin = pinsQuery.data[0];
      if (firstPin) {
        setMapCenter({ lat: firstPin.latitude, lng: firstPin.longitude });
      }
    } else if (pinsQuery.data) {
      setMyPins(pinsQuery.data);
    }
  }, [pinsQuery.data, setMyPins, setMapCenter]);

  useEffect(() => {
    if (!mapInstance || !myPins.length || !isMapReady) return;

    // Clean up existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    myPins.forEach((pin) => {
      const PinIcon = getPinIcon(pin.locationGroup?.type ?? PinType.OTHER);

      const isExpired =
        (pin.locationGroup?.endDate &&
          new Date(pin.locationGroup.endDate) < new Date()) ??
        false;
      const isApproved = pin.locationGroup?.approved === true;
      const isRemainingZero =
        pin.locationGroup?.remaining !== undefined &&
        pin.locationGroup?.remaining <= 0;
      const isHidden = pin.hidden === true;
      const isAutoCollect = pin.autoCollect === true;

      const isInactive = isExpired || isRemainingZero || !isApproved;
      const showAnimation =
        !isExpired && !isRemainingZero && isApproved && !isHidden;

      const opacityClasses = isHidden
        ? "opacity-40"
        : isInactive
          ? "opacity-50"
          : "opacity-100";

      const shapeClasses = isAutoCollect ? "rounded-none" : "rounded-full";

      const borderClasses = isHidden
        ? "border-dashed border-red-500 border-2"
        : isApproved
          ? "ring-2 ring-green-400"
          : "";

      const filterClasses = isInactive && !isHidden ? "grayscale" : "";

      const bgClasses =
        !isApproved && !isHidden ? "bg-gray-500" : "bg-white/80";

      // Create marker element
      const el = document.createElement("div");
      el.className = `relative flex items-center justify-center w-10 h-10 ${opacityClasses} ${shapeClasses} ${borderClasses} ${filterClasses} ${bgClasses}`;

      if (showAnimation) {
        const pingEl = document.createElement("div");
        pingEl.className = `absolute inset-0 bg-blue-400 animate-ping opacity-20 ${shapeClasses}`;
        el.appendChild(pingEl);
      }

      if (pin.locationGroup?.creator.profileUrl) {
        const img = document.createElement("img");
        img.src = pin.locationGroup.creator.profileUrl ?? "/placeholder.svg";
        img.className = `h-10 w-10 ${shapeClasses} object-cover`;
        img.width = 32;
        img.height = 32;
        el.appendChild(img);
      } else {
        const div = document.createElement("div");
        div.className = `h-10 w-10 ${shapeClasses} bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center`;
        const iconDiv = document.createElement("div");
        iconDiv.innerHTML = `<svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`;
        div.appendChild(iconDiv);
        el.appendChild(div);
      }

      if (pin._count.consumers > 0) {
        const countEl = document.createElement("div");
        countEl.className =
          "absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-medium";
        countEl.textContent =
          pin._count.consumers > 99 ? "99+" : `${pin._count.consumers}`;
        el.appendChild(countEl);
      }

      el.addEventListener("click", () => onPinClick(pin));

      try {
        const marker = new Marker({ element: el })
          .setLngLat([pin.longitude, pin.latitude])
          .addTo(mapInstance);

        markersRef.current.push(marker);
      } catch (error) {
        console.error("Error adding marker to map:", error);
      }
    });

    return () => {
      markersRef.current.forEach((marker) => {
        try {
          marker.remove();
        } catch (error) {
          console.error("Error removing marker from map:", error);
        }
      });
      markersRef.current = [];
    };
  }, [mapInstance, myPins, onPinClick]);

  if (pinsQuery.isLoading) return null;

  return null;
});

type HotspotGeoJson = {
  type: "Feature";
  geometry: {
    type: "Polygon" | "Circle" | "Rectangle";
    coordinates: [number, number][][];
  };
  properties: {
    center?: [number, number];
    radiusMetres?: number;
  } | null;
};

const MyHotspots = memo(function MyHotspots({
  mapInstance,
}: {
  mapInstance: mapboxgl.Map | null;
}) {
  const hotspotQuery = api.maps.pin.myHotspots.useQuery();
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [showHotspotModal, setShowHotspotModal] = useState(false);
  const layersRef = useRef<string[]>([]);

  useEffect(() => {
    if (!mapInstance || !hotspotQuery.data) return;

    const sourcesToRemove: string[] = [];
    layersRef.current.forEach((layerId) => {
      try {
        if (
          layerId.startsWith("hotspot-fill-") ||
          layerId.startsWith("hotspot-outline-")
        ) {
          if (mapInstance.getLayer(layerId)) {
            mapInstance.removeLayer(layerId);
          }
        } else if (layerId.startsWith("hotspot-")) {
          sourcesToRemove.push(layerId);
        }
      } catch (error) {
        console.error("Error removing existing hotspot layer:", error);
      }
    });
    sourcesToRemove.forEach((sourceId) => {
      try {
        if (mapInstance.getSource(sourceId)) {
          mapInstance.removeSource(sourceId);
        }
      } catch (error) {
        console.error("Error removing existing hotspot source:", error);
      }
    });
    layersRef.current = [];

    hotspotQuery.data.forEach((hs, index) => {
      const geoJson = hs.geoJson as HotspotGeoJson;
      if (!geoJson?.geometry) return;

      const isActive = hs.isActive;
      const isAutoCollect = hs.autoCollect;

      const sourceId = `hotspot-${hs.id}`;
      const fillLayerId = `hotspot-fill-${hs.id}`;
      const outlineLayerId = `hotspot-outline-${hs.id}`;

      const feature = {
        type: "Feature" as const,
        geometry: geoJson.geometry,
        properties: {
          id: hs.id,
          strokeColor: isAutoCollect ? "#22c55e" : "#3b82f6",
          strokeOpacity: isActive ? 0.9 : 0.4,
          fillColor: "#22c55e",
          fillOpacity: isActive ? 0.2 : 0.05,
        },
      };

      try {
        mapInstance.addSource(sourceId, {
          type: "geojson",
          data: feature,
        });

        mapInstance.addLayer({
          id: fillLayerId,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": feature.properties.fillColor,
            "fill-opacity": feature.properties.fillOpacity,
          },
        });

        mapInstance.addLayer({
          id: outlineLayerId,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": feature.properties.strokeColor,
            "line-width": 2,
            "line-opacity": feature.properties.strokeOpacity,
          },
        });

        mapInstance.on("click", fillLayerId, () => {
          setSelectedHotspot(hs.id);
          setShowHotspotModal(true);
        });

        mapInstance.on("click", outlineLayerId, () => {
          setSelectedHotspot(hs.id);
          setShowHotspotModal(true);
        });

        layersRef.current.push(sourceId, fillLayerId, outlineLayerId);
      } catch (error) {
        console.error("Error adding hotspot layer:", error);
      }
    });

    return () => {
      if (!mapInstance) return;

      const sourcesToRemove = new Set<string>();
      layersRef.current.forEach((layerId) => {
        if (
          layerId.startsWith("hotspot-fill-") ||
          layerId.startsWith("hotspot-outline-")
        ) {
          try {
            if (mapInstance.getLayer(layerId)) {
              mapInstance.removeLayer(layerId);
            }
          } catch (error) {
            console.error("Error removing hotspot layer:", error);
          }
        } else if (layerId.startsWith("hotspot-")) {
          sourcesToRemove.add(layerId);
        }
      });

      sourcesToRemove.forEach((sourceId) => {
        try {
          if (mapInstance.getSource(sourceId)) {
            mapInstance.removeSource(sourceId);
          }
        } catch (error) {
          console.error("Error removing hotspot source:", error);
        }
      });

      layersRef.current = [];
    };
  }, [mapInstance, hotspotQuery.data]);

  return (
    <HotspotDetailModal
      isOpen={showHotspotModal}
      setIsOpen={setShowHotspotModal}
      hotspotId={selectedHotspot}
    />
  );
});

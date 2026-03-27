"use client"

import { memo, useEffect, useRef, useState, type MouseEvent } from "react"
import { APIProvider, AdvancedMarker, ColorScheme, Map, Marker, useMap } from "@vis.gl/react-google-maps"
import { motion, useMotionValue, useSpring, useTransform } from "motion/react"
import { useSession } from "next-auth/react"
import { useCreatorStorageAcc } from "~/lib/state/wallete/stellar-balances"
import { api } from "~/utils/api"
import { ClipboardList, MapPin } from "lucide-react"
import Image from "next/image"

import { NearbyLocationsPanel } from "~/components/map/nearby-locations-panel"
import { getPinIcon } from "~/utils/map-helpers"

import { useGeolocation } from "~/hooks/use-geolocation"
import { useMapState } from "~/hooks/use-map-state"
import { useMapInteractions } from "~/hooks/use-map-interactions"
import { usePinsData } from "~/hooks/use-pins-data"
import { PinType, type Location, type LocationGroup } from "@prisma/client"
import { MapControls } from "~/components/map/map-controls"
import AgentChat from "~/components/agent/AgentChat"
import { MapHeader } from "~/components/map/map-header"
import CreatePinModal from "~/components/modal/creator-create-pin-modal"
import PinDetailAndActionsModal from "~/components/modal/pin-detail-modal"
import { useMapInteractionStore, useNearbyPinsStore } from "~/components/store/map-stores"
import Link from "next/link"
import { Button } from "~/components/shadcn/ui/button"
import { useTheme } from "next-themes"
import { useSelectedAutoSuggestion } from "~/lib/state/map/useSelectedAutoSuggestion"
import { GoogleMapDrawing } from "~/components/map/google-map-drawing"
import CreateHotspotModal from "~/components/modal/create-hotspot-modal"
import HotspotDetailModal from "~/components/modal/hotspot-details-modal"
import disc from "./disc.png"
import fire from "./fire.png"
import like from "./like.png"

type Pin = Location & {
  locationGroup:
  | (LocationGroup & {
    creator: { profileUrl: string | null }
  })
  | null
  _count: {
    consumers: number
  }
}

type DrawingMode = "polygon" | "rectangle" | "circle"

function MapDrawingLayer({
  isCreatingHotspot,
  onSelectionChange,
  onClose,
  mapContainerRef,
}: {
  isCreatingHotspot: boolean
  onSelectionChange: (feature: GeoJSON.Feature | null, activeMode: DrawingMode) => void
  onClose: () => void
  mapContainerRef: React.RefObject<HTMLDivElement>
}) {
  const map = useMap()

  if (!isCreatingHotspot || !mapContainerRef.current || !map) return null

  return (
    <GoogleMapDrawing
      map={map}
      onSelectionChange={onSelectionChange}
      onClose={onClose}
      mapElement={mapContainerRef.current}
    />
  )
}

function GuestJoinOverlay() {
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [8, -8]), {
    stiffness: 140,
    damping: 22,
    mass: 0.6,
  })
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-8, 8]), {
    stiffness: 140,
    damping: 22,
    mass: 0.6,
  })
  const fireOffsetX = useSpring(useTransform(pointerX, [-0.5, 0.5], [-14, 14]), {
    stiffness: 120,
    damping: 24,
  })
  const fireOffsetY = useSpring(useTransform(pointerY, [-0.5, 0.5], [-10, 10]), {
    stiffness: 120,
    damping: 24,
  })
  const likeOffsetX = useSpring(useTransform(pointerX, [-0.5, 0.5], [12, -12]), {
    stiffness: 120,
    damping: 24,
  })
  const likeOffsetY = useSpring(useTransform(pointerY, [-0.5, 0.5], [8, -8]), {
    stiffness: 120,
    damping: 24,
  })

  const handleParallaxMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    pointerX.set(x)
    pointerY.set(y)
  }

  const handleParallaxLeave = () => {
    pointerX.set(0)
    pointerY.set(0)
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-transparent via-40% via-black/40 to-transparent">
      <motion.header
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute inset-0 mx-auto flex h-full w-full max-w-4xl items-center justify-center px-4 pb-36 md:pb-20"
      >
        <div
          className="relative pointer-events-auto"
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
              transition={{ delay: 0.52, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto aspect-square w-[min(62vw,320px)] overflow-hidden rounded-full border-[8px] border-white/95 shadow-[0_36px_90px_-34px_rgba(11,48,132,0.95)]"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 16, ease: "linear", repeat: Infinity }}
                className="relative size-full"
              >
                <Image src={disc} alt="" fill className="object-cover" priority />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.86, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-2 top-2 w-[10.75rem] overflow-hidden rounded-2xl border border-black/20 bg-white p-3 text-black shadow-[0_14px_34px_-22px_rgba(0,0,0,0.8)] md:left-10 md:top-14 md:w-[14rem] md:p-4"
            >
              <div className="flex h-full flex-col">
                <h3 className="text-lg font-semibold leading-tight md:text-xl">Join As User</h3>
                <p className="mt-1 text-xs text-black/65 md:text-sm">Discover the map and start collecting instantly.</p>
                <Link href="/home" className="mt-4">
                  <Button className="w-full">Join as User</Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.94, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-2 right-2 w-[10.75rem] overflow-hidden rounded-2xl border border-black/20 bg-white p-3 text-black shadow-[0_14px_34px_-22px_rgba(0,0,0,0.8)] md:-right-8 md:bottom-10 md:w-[14rem] md:p-4"
            >
              <div className="flex h-full flex-col">
                <h3 className="text-lg font-semibold leading-tight md:text-xl">Join As Artist</h3>
                <p className="mt-1 text-xs text-black/65 md:text-sm">Create your page, publish music, and place hotspots.</p>
                <Link href="/home" className="mt-4">
                  <Button className="w-full">Join as Artist</Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.88, rotate: -6 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              transition={{ delay: 0.96, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-[24%] top-[18%] md:right-[23%] md:top-[16%]"
            >
              <motion.div style={{ x: fireOffsetX, y: fireOffsetY }}>
                <Image src={fire} alt="" className="w-20 md:w-28" />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.88, rotate: -18 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: -10 }}
              transition={{ delay: 1.02, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-[25%] bottom-[19%] md:left-[23%] md:bottom-[17%]"
            >
              <motion.div style={{ x: likeOffsetX, y: likeOffsetY }}>
                <Image src={like} alt="" className="w-[4.5rem] md:w-24" />
              </motion.div>
            </motion.div>
          </motion.article>
        </div>
      </motion.header>
    </div>
  )
}

function CreatorMapDashboardContent() {
  const session = useSession()
  const isAuthenticated = session.status === "authenticated"
  const isGuest = session.status === "unauthenticated"
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
  } = useMapInteractionStore()

  const { setBalance } = useCreatorStorageAcc()
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
  } = useMapState()

  const [showExpired, setShowExpired] = useState<boolean>(false)
  const [openHostpotModal, setOpenHotspotModal] = useState(false)
  const [hotspotData, setHotspotData] = useState<GeoJSON.Feature | null>(null)
  const [selectedShape, setSelectedShape] = useState<DrawingMode>("polygon")
  const [isCreatingHotspot, setIsCreatingHotspot] = useState(false)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()
  const { filterNearbyPins } = useNearbyPinsStore()
  const { selectedPlace: alreadySelectedPlace } = useSelectedAutoSuggestion()

  const handleCreateHotspot = () => setIsCreatingHotspot(true)

  const handleHotspotSelection = (feature: GeoJSON.Feature | null, activeMode: DrawingMode) => {
    setOpenHotspotModal(true)
    setHotspotData(feature)
    setSelectedShape(activeMode)
    setIsCreatingHotspot(false)
  }

  useGeolocation(setMapCenter, setMapZoom)
  usePinsData(showExpired, isAuthenticated)

  const { handleMapClick, handleZoomIn, handleZoomOut, handleDragEnd } = useMapInteractions({
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
  })

  api.wallate.acc.getCreatorStorageBallances.useQuery(undefined, {
    onSuccess: (data) => {
      setBalance(data)
    },
    onError: (error) => {
      console.error("Failed to fetch creator storage balances:", error)
    },
    refetchOnWindowFocus: false,
    enabled: isAuthenticated,
  })

  useEffect(() => {
    if (alreadySelectedPlace) {
      const latLng = {
        lat: alreadySelectedPlace.lat,
        lng: alreadySelectedPlace.lng,
      }
      setMapCenter(latLng)
      setMapZoom(13)
      setPosition(latLng)
    }
  }, [alreadySelectedPlace, setMapCenter, setMapZoom, setPosition])

  useEffect(() => {
    if (position) {
      setMapCenter(position)
      setMapZoom(14)
    }
  }, [position, setMapCenter, setMapZoom])

  const handleManualPinClick = () => {
    setManual(true)
    setPosition(undefined)
    setPrevData(undefined)
    openCreatePinModal()
  }

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY!}>
      <div className="relative h-screen w-full overflow-hidden" ref={mapContainerRef}>
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-slate-900/5 via-transparent to-transparent" />
        {isAuthenticated ? (
          <MapHeader
            showExpired={showExpired}
            setShowExpired={setShowExpired}
            onManualPinClick={handleManualPinClick}
            onCreateHotspot={handleCreateHotspot}
            onPlaceSelect={(place) => {
              setMapCenter({ lat: place.lat, lng: place.lng })
              setMapZoom(13)
              setPosition({ lat: place.lat, lng: place.lng })
              setIsCordsSearch(false)
            }}
            onCenterChange={setMapCenter}
            setIsCordsSearch={setIsCordsSearch}
            setSearchCoordinates={setSearchCoordinates}
            setCordSearchLocation={setCordSearchCords}
            setZoom={setMapZoom}
          />
        ) : null}

        <Map
          onCenterChanged={(center) => {
            setMapCenter(center.detail.center)
            setCenterChanged(center.detail.bounds)
          }}
          onZoomChanged={(zoom) => {
            setMapZoom(zoom.detail.zoom)
          }}
          colorScheme={theme === "dark" ? ColorScheme.DARK : ColorScheme.LIGHT}
          onClick={handleMapClick}
          mapId={"bf51eea910020fa25a"}
          className="h-full w-full transition-all duration-500 ease-out"
          defaultCenter={{ lat: 22.54992, lng: 0 }}
          defaultZoom={3}
          minZoom={3}
          zoom={mapZoom}
          center={mapCenter}
          gestureHandling={"greedy"}
          disableDefaultUI={true}
          onDragend={handleDragEnd}
        >
          {position && !isCordsSearch && <Marker position={{ lat: position.lat, lng: position.lng }} />}
          {isCordsSearch && searchCoordinates && (
            <AdvancedMarker position={searchCoordinates}>
              <div className="animate-bounce">
                <MapPin className="size-8 text-red-500 drop-shadow-lg" />
              </div>
            </AdvancedMarker>
          )}

          {isCordsSearch && cordSearchCords && (
            <AdvancedMarker position={cordSearchCords}>
              <div className="animate-bounce">
                <MapPin className="size-8 text-red-500 drop-shadow-lg" />
              </div>
            </AdvancedMarker>
          )}

          {isAuthenticated ? (
            <>
              {!isCreatingHotspot && <MapControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />}
              <MyPins
                onPinClick={(pin) => {
                  openPinDetailModal(pin)
                  setIsAutoCollect(pin.autoCollect)
                }}
                showExpired={showExpired}
              />
              <MyHotspots />

              <MapDrawingLayer
                isCreatingHotspot={isCreatingHotspot}
                onSelectionChange={handleHotspotSelection}
                onClose={() => setIsCreatingHotspot(false)}
                mapContainerRef={mapContainerRef}
              />
            </>
          ) : null}
        </Map>

        {isGuest ? <GuestJoinOverlay /> : null}
      </div>

      {isAuthenticated ? (
        <>
          <Link href="/map/collection-report">
            <button className="absolute bottom-40 md:bottom-32 right-6 z-20 inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50">
              <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
              <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
                <ClipboardList className="mr-2 h-4 w-4" /> Collection Reports
              </span>
            </button>

          </Link>

          {!isCreatingHotspot && (
            <NearbyLocationsPanel
              onSelectPlace={(coords) => {
                setMapCenter(coords)
                setMapZoom(13)
                setPosition(coords)
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
    </APIProvider>
  )
}

export default CreatorMapDashboardContent

const MyPins = memo(function MyPins({
  onPinClick,
  showExpired,
}: {
  onPinClick: (pin: Pin) => void
  showExpired: boolean
}) {
  const { myPins, setMyPins } = useNearbyPinsStore()
  const pinsQuery = api.maps.pin.getMyPins.useQuery({ showExpired })

  useEffect(() => {
    if (pinsQuery.data) {
      setMyPins(pinsQuery.data)
    }
  }, [pinsQuery.data, setMyPins])

  if (pinsQuery.isLoading) return null

  return (
    <>
      {myPins.map((pin) => {
        const PinIcon = getPinIcon(pin.locationGroup?.type ?? PinType.OTHER)

        const isExpired = (pin.locationGroup?.endDate && new Date(pin.locationGroup.endDate) < new Date()) ?? false
        const isApproved = pin.locationGroup?.approved === true
        const isRemainingZero = pin.locationGroup?.remaining !== undefined && pin.locationGroup?.remaining <= 0
        const isHidden = pin.hidden === true
        const isAutoCollect = pin.autoCollect === true

        const isInactive = isExpired || isRemainingZero || !isApproved
        const showAnimation = !isExpired && !isRemainingZero && isApproved && !isHidden

        const baseClasses = "relative flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-125 hover:shadow-2xl cursor-pointer group transform hover:-translate-y-1"

        const opacityClasses = isHidden
          ? "opacity-40"
          : isInactive
            ? "opacity-50"
            : "opacity-100"

        const shapeClasses = isAutoCollect ? "rounded-none" : "rounded-full"

        const borderClasses = isHidden
          ? "border-dashed border-red-500 border-2"
          : isApproved
            ? "ring-2 ring-green-400"
            : ""

        const filterClasses = isInactive && !isHidden ? "grayscale" : ""

        const bgClasses = !isApproved && !isHidden ? "bg-gray-500" : "bg-white/80 hover:bg-white/100"

        return (
          <AdvancedMarker
            key={pin.id}
            position={{ lat: pin.latitude, lng: pin.longitude }}
            onClick={() => onPinClick(pin)}
          >
            <div
              className={`${baseClasses} ${opacityClasses} ${shapeClasses} ${borderClasses} ${filterClasses} ${bgClasses}`}
            >
              {showAnimation && (
                <div
                  className={`absolute inset-0 bg-blue-400 animate-ping opacity-20 ${shapeClasses}`}
                />
              )}

              {pin.locationGroup?.creator.profileUrl ? (
                <Image
                  src={pin.locationGroup.creator.profileUrl ?? "/placeholder.svg"}
                  width={32}
                  height={32}
                  alt="Creator"
                  className={`h-12 w-12 ${shapeClasses} object-cover ring-2  transition-all duration-300`}
                />
              ) : (
                <div className={`h-12 w-12 ${shapeClasses} bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ring-2  transition-all duration-300`}>
                  <PinIcon className="h-6 w-6 text-gray-600  transition-colors duration-300" />
                </div>
              )}

              {pin._count.consumers > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium shadow-lg">
                  {pin._count.consumers > 99 ? "99+" : pin._count.consumers}
                </div>
              )}
            </div>
          </AdvancedMarker>
        )
      })}
    </>
  )
})

type HotspotGeoJson = {
  type: "Feature"
  geometry: {
    type: "Polygon" | "Circle" | "Rectangle"
    coordinates: [number, number][][]
  }
  properties: {
    center?: [number, number]
    radiusMetres?: number
  } | null
}

const MyHotspots = memo(function MyHotspots() {
  const map = useMap()
  const hotspotQuery = api.maps.pin.myHotspots.useQuery()
  const overlaysRef = useRef<(google.maps.Polygon | google.maps.Circle | google.maps.Rectangle)[]>([])

  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null)
  const [showHotspotModal, setShowHotspotModal] = useState(false)

  useEffect(() => {
    if (!map || !hotspotQuery.data) return

    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []

    hotspotQuery.data.forEach((hs) => {
      const geoJson = hs.geoJson as HotspotGeoJson
      if (!geoJson?.geometry) return

      const isActive = hs.isActive
      const isAutoCollect = hs.autoCollect

      const shapeOptions = {
        map,
        strokeColor: isAutoCollect ? "#22c55e" : "#3b82f6",
        strokeOpacity: isActive ? 0.9 : 0.4,
        strokeWeight: 2,
        fillColor: "#22c55e",
        fillOpacity: isActive ? 0.2 : 0.05,
      }

      let overlay: google.maps.Polygon | google.maps.Circle | google.maps.Rectangle

      if (hs.shape === "circle") {
        const props = geoJson.properties
        if (!props?.center || !props?.radiusMetres) return
        overlay = new window.google.maps.Circle({
          ...shapeOptions,
          center: { lat: props.center[0], lng: props.center[1] },
          radius: props.radiusMetres,
        })
      } else if (hs.shape === "rectangle") {
        const coords = geoJson.geometry.coordinates[0]
        if (!coords?.length) return
        const lats = coords.map(([lat]) => lat)
        const lngs = coords.map(([, lng]) => lng)
        const bounds = new window.google.maps.LatLngBounds(
          { lat: Math.min(...lats), lng: Math.min(...lngs) },
          { lat: Math.max(...lats), lng: Math.max(...lngs) },
        )
        overlay = new window.google.maps.Rectangle({ ...shapeOptions, bounds })
      } else {
        const coords = geoJson.geometry.coordinates[0]
        if (!coords?.length) return
        const paths = coords.map(([lat, lng]) => ({ lat, lng }))
        overlay = new window.google.maps.Polygon({ ...shapeOptions, paths })
      }

      overlay.addListener("click", () => {
        setSelectedHotspot(hs.id)
        setShowHotspotModal(true)
      })

      overlaysRef.current.push(overlay)
    })

    return () => {
      overlaysRef.current.forEach((o) => o.setMap(null))
      overlaysRef.current = []
    }
  }, [map, hotspotQuery.data])

  return (
    <HotspotDetailModal
      isOpen={showHotspotModal}
      setIsOpen={setShowHotspotModal}
      hotspotId={selectedHotspot}
    />
  )
})

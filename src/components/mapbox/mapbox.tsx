"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??
  process.env.NEXT_PUBLIC_MAPBOX_API ??
  "";
mapboxgl.accessToken = MAPBOX_TOKEN;

interface MapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  initialBearing?: number;
  initialPitch?: number;
  height?: string;
  onMapLoad?: (map: mapboxgl.Map) => void;
  onMapClick?: (e: mapboxgl.MapMouseEvent & mapboxgl.EventData) => void;
  onDragEnd?: () => void;
  onContainerRef?: (container: HTMLDivElement | null) => void;
  children?: React.ReactNode;
}

const DEFAULT_CENTER: [number, number] = [0, 22.54992];
const DEFAULT_ZOOM = 15.3;
const DEFAULT_BEARING = -18;
const DEFAULT_PITCH = 42;

function applyReferenceStyle(mapInstance: mapboxgl.Map) {
  const style = mapInstance.getStyle();
  const layers = style.layers ?? [];

  for (const layer of layers) {
    const id = layer.id.toLowerCase();
    const isParkLike =
      id.includes("park") ||
      id.includes("green") ||
      id.includes("wood") ||
      id.includes("natural") ||
      id.includes("grass") ||
      id.includes("golf") ||
      id.includes("cemetery");
    const isWaterLike =
      id.includes("water") || id.includes("river") || id.includes("canal");
    const isRoadLike = id.includes("road");
    const isRoadStructure = id.includes("bridge") || id.includes("tunnel");
    const isBuildingLike = id.includes("building");
    const isLandLike =
      id.includes("land") ||
      id.includes("residential") ||
      id.includes("settlement");
    const isLandUseLayer = id.includes("landuse") || id.includes("landcover");

    if (layer.type === "background") {
      mapInstance.setPaintProperty(layer.id, "background-color", "#e5e7e8");
    }

    if (layer.type === "fill") {
      if (isWaterLike) {
        mapInstance.setPaintProperty(layer.id, "fill-color", "#bad8de");
        mapInstance.setPaintProperty(layer.id, "fill-opacity", 0.94);
      } else if (isLandUseLayer) {
        mapInstance.setPaintProperty(layer.id, "fill-color", [
          "match",
          ["coalesce", ["get", "class"], ""],
          [
            "park",
            "national_park",
            "garden",
            "grass",
            "wood",
            "cemetery",
            "golf_course",
            "pitch",
          ],
          "#bedfae",
          ["residential", "industrial", "commercial"],
          "#dde1e3",
          "#e2e5e7",
        ]);
        mapInstance.setPaintProperty(layer.id, "fill-opacity", 0.9);
      } else if (isParkLike) {
        mapInstance.setPaintProperty(layer.id, "fill-color", "#bedfae");
        mapInstance.setPaintProperty(layer.id, "fill-opacity", 0.88);
      } else if (isBuildingLike) {
        mapInstance.setPaintProperty(layer.id, "fill-color", "#c9ccce");
        mapInstance.setPaintProperty(layer.id, "fill-opacity", 0.92);
      } else if (isLandLike) {
        mapInstance.setPaintProperty(layer.id, "fill-color", "#dee2e4");
        mapInstance.setPaintProperty(layer.id, "fill-opacity", 0.9);
      }
    }

    if (layer.type === "line") {
      if (isWaterLike) {
        mapInstance.setPaintProperty(layer.id, "line-color", "#9ebec6");
        mapInstance.setPaintProperty(layer.id, "line-opacity", 0.95);
      } else if (isRoadLike) {
        mapInstance.setPaintProperty(layer.id, "line-color", "#ffffff");
        mapInstance.setPaintProperty(layer.id, "line-opacity", 0.94);
      } else if (isRoadStructure) {
        mapInstance.setPaintProperty(layer.id, "line-color", "#eef1f2");
        mapInstance.setPaintProperty(layer.id, "line-opacity", 0.88);
      } else if (id.includes("boundary")) {
        mapInstance.setPaintProperty(layer.id, "line-color", "#c1c8cd");
        mapInstance.setPaintProperty(layer.id, "line-opacity", 0.72);
      }
    }

    if (layer.type === "fill-extrusion" && isBuildingLike) {
      mapInstance.setPaintProperty(layer.id, "fill-extrusion-color", "#c6c9cc");
      mapInstance.setPaintProperty(layer.id, "fill-extrusion-opacity", 0.68);
    }

    if (layer.type === "symbol") {
      if (id.includes("road-label") || id.includes("place-label")) {
        mapInstance.setPaintProperty(layer.id, "text-color", "#757e87");
        mapInstance.setPaintProperty(layer.id, "text-halo-color", "#f7f8f8");
        mapInstance.setPaintProperty(layer.id, "text-opacity", 0.96);
      } else if (id.includes("poi")) {
        mapInstance.setPaintProperty(layer.id, "text-opacity", 0.48);
      }
    }

    if (layer.type === "sky") {
      mapInstance.setPaintProperty(layer.id, "sky-type", "atmosphere");
      mapInstance.setPaintProperty(layer.id, "sky-atmosphere-color", "#f9fafa");
      mapInstance.setPaintProperty(
        layer.id,
        "sky-atmosphere-halo-color",
        "#ffffff",
      );
    }
  }

  mapInstance.setFog({
    range: [-1, 6],
    color: "#e3e7e9",
    "high-color": "#edf0f1",
    "horizon-blend": 0.012,
  });
}

export default function MapboxMap({
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  initialBearing = DEFAULT_BEARING,
  initialPitch = DEFAULT_PITCH,
  height = "500px",
  onMapLoad,
  onMapClick,
  onDragEnd,
  onContainerRef,
  children,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const centerLng = initialCenter[0];
  const centerLat = initialCenter[1];

  // Expose container ref
  useEffect(() => {
    onContainerRef?.(mapContainer.current);
    return () => onContainerRef?.(null);
  }, [onContainerRef]);

  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;
    if (!mapboxgl.supported()) {
      setMapLoadError("Mapbox is not supported in this browser/environment.");
      return;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [centerLng, centerLat],
      zoom: initialZoom,
      bearing: initialBearing,
      pitch: initialPitch,
      antialias: true,
    });

    const handleMapError = (event: mapboxgl.ErrorEvent) => {
      const message = event.error?.message ?? "Failed to load map data.";
      setMapLoadError(message);
    };

    map.current.on("error", handleMapError);

    if (onMapClick) {
      map.current.on("click", onMapClick);
    }

    if (onDragEnd) {
      map.current.on("dragend", onDragEnd);
    }

    map.current.on("load", () => {
      if (!map.current) return;
      setMapLoadError(null);
      setIsMapLoaded(true);
      applyReferenceStyle(map.current);
      map.current.resize();
      onMapLoad?.(map.current);
    });

    return () => {
      map.current?.off("error", handleMapError);
      if (onMapClick) {
        map.current?.off("click", onMapClick);
      }
      if (onDragEnd) {
        map.current?.off("dragend", onDragEnd);
      }
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Update map center when initialCenter changes (after initial load)
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;
    map.current.panTo([centerLng, centerLat]);
  }, [centerLat, centerLng, isMapLoaded]);

  // Update map zoom when initialZoom changes (after initial load)
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;
    map.current.setZoom(initialZoom);
  }, [initialZoom, isMapLoaded]);

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-gray-100 p-6"
        style={{ height }}
      >
        <p className="text-center text-red-600">
          Please add your Mapbox access token to .env.local as
          NEXT_PUBLIC_MAPBOX_TOKEN (or NEXT_PUBLIC_MAPBOX_API)
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <div
        ref={mapContainer}
        className="mapbox-reference-theme h-full w-full overflow-hidden rounded-2xl shadow-[0_24px_90px_-48px_rgba(34,45,59,0.5)]"
      />
      {mapLoadError ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-white/70 p-4">
          <p className="max-w-md text-center text-sm font-medium text-red-700">
            {mapLoadError}
          </p>
        </div>
      ) : null}
      {children}
      <div className="mapbox-map-fade pointer-events-none absolute inset-0 rounded-2xl" />
    </div>
  );
}

export { mapboxgl };

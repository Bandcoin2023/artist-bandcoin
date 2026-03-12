interface Location {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_M = 6_371_000;
const EarthRadius = 6371; // Earth's radius in kilometers
const OneDegree = ((EarthRadius * 2 * Math.PI) / 360) * 1000; // One degree in meters

function randomPointInDisk(radius: number): [number, number] {
  const r = radius * Math.sqrt(Math.random());
  const theta = Math.random() * 2 * Math.PI;
  return [r * Math.cos(theta), r * Math.sin(theta)];
}

export function randomLocation(
  lat: number,
  lng: number,
  radius: number,
): Location {
  if (radius <= 0) return { latitude: lat, longitude: lng };
  const [dx, dy] = randomPointInDisk(radius);

  const randomLat = lat + dy / OneDegree;
  const randomLng = lng + dx / (OneDegree * Math.cos((lat * Math.PI) / 180));

  return {
    latitude: randomLat,
    longitude: randomLng,
  };
}

export function generateRandomLocations(
  shape: "polygon" | "rectangle" | "circle",
  geoJson: GeoJSON.Feature | null | undefined,
  count: number,
): { latitude: number; longitude: number }[] {
  if (!geoJson || count <= 0) return [];

  if (shape === "circle") {
    return generateInCircle(geoJson, count);
  }

  return generateInPolygon(geoJson, count);
}

function generateInCircle(
  feature: GeoJSON.Feature,
  count: number,
): { latitude: number; longitude: number }[] {
  const { center, radiusMetres } = feature.properties as {
    center: [number, number];
    radiusMetres: number;
  };

  const [centerLat, centerLng] = center;
  const results: { latitude: number; longitude: number }[] = [];

  while (results.length < count) {
    const r = radiusMetres * Math.sqrt(Math.random());
    const angle = Math.random() * 2 * Math.PI;

    const dLat = (r * Math.cos(angle)) / EARTH_RADIUS_M;
    const dLng =
      (r * Math.sin(angle)) /
      (EARTH_RADIUS_M * Math.cos((centerLat * Math.PI) / 180));

    results.push({
      latitude: centerLat + (dLat * 180) / Math.PI,
      longitude: centerLng + (dLng * 180) / Math.PI,
    });
  }

  return results;
}

function generateInPolygon(
  feature: GeoJSON.Feature,
  count: number,
): { latitude: number; longitude: number }[] {
  const geometry = feature.geometry as GeoJSON.Polygon;
  const ring = geometry.coordinates[0] as [number, number][];

  const lats = ring.map((c) => c[0]);
  const lngs = ring.map((c) => c[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const results: { latitude: number; longitude: number }[] = [];
  let attempts = 0;
  const maxAttempts = count * 100;

  while (results.length < count && attempts < maxAttempts) {
    attempts++;
    const lat = minLat + Math.random() * (maxLat - minLat);
    const lng = minLng + Math.random() * (maxLng - minLng);

    if (pointInPolygon([lat, lng], ring)) {
      results.push({ latitude: lat, longitude: lng });
    }
  }

  return results;
}

function pointInPolygon(
  point: [number, number],
  ring: [number, number][],
): boolean {
  const [px, py] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;

    const intersects =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

export function dropIntervalToCron(days: number): string {
  const map: Record<number, string> = {
    1: "0 9 * * *",
    2: "0 9 */2 * *",
    3: "0 9 */3 * *",
    5: "0 9 */5 * *",
    7: "0 9 * * 1",
    14: "0 9 1,15 * *",
    30: "0 9 1 * *",
  };
  return map[days] ?? "0 9 * * *";
}

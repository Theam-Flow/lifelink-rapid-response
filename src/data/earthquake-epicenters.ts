// Official USGS epicenters for the 2026-06-24 Venezuela doublet.
// Source: USGS FDSN event API (earthquake.usgs.gov). Public, authoritative,
// non-personal data — safe to plot. We show WHERE the energy was released,
// not scraped individual building reports.

export interface Epicenter {
  magnitude: number;
  place: string;
  lng: number;
  lat: number;
  depthKm: number;
  timeUtc: string;
}

function ringPolygon(lng: number, lat: number, radiusKm: number, points = 72): number[][] {
  const ring: number[][] = [];
  const latR = (radiusKm / 6371) * (180 / Math.PI);
  const lngR = latR / Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * 2 * Math.PI;
    ring.push([lng + lngR * Math.cos(a), lat + latR * Math.sin(a)]);
  }
  return ring;
}

// Approximate strong-shaking rings (km) around each epicenter, as USGS-derived
// context for the affected area — NOT building-level damage points.
export function affectedZoneGeoJSON() {
  const radii = [40, 90];
  const features = EARTHQUAKE_EPICENTERS.flatMap((eq) =>
    radii.map((r) => ({
      type: 'Feature' as const,
      properties: { radiusKm: r, magnitude: eq.magnitude },
      geometry: { type: 'Polygon' as const, coordinates: [ringPolygon(eq.lng, eq.lat, r)] },
    }))
  );
  return { type: 'FeatureCollection' as const, features };
}

export const EARTHQUAKE_EPICENTERS: Epicenter[] = [
  {
    magnitude: 7.5,
    place: '28 km SE of Yumare, Venezuela',
    lng: -68.4716,
    lat: 10.4351,
    depthKm: 10,
    timeUtc: '2026-06-24T14:45:11Z',
  },
  {
    magnitude: 7.2,
    place: '23 km SE of Yumare, Venezuela',
    lng: -68.5277,
    lat: 10.436,
    depthKm: 20.3,
    timeUtc: '2026-06-24T14:44:33Z',
  },
];

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

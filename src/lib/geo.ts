// Geo helpers — Haversine distance & fuzzy radius display

const EARTH_RADIUS_MILES = 3958.7613;

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

/**
 * Returns a fuzzy distance string. We never reveal exact addresses —
 * only a coarse "0.4 miles away" reading, rounded to the nearest 0.1
 * for short distances and to whole miles beyond 5mi.
 */
export function fuzzyDistance(miles: number): string {
  if (miles < 0.1) return "around the corner";
  if (miles < 5) return `${miles.toFixed(1)} miles away`;
  return `${Math.round(miles)} miles away`;
}

/**
 * Compute a fuzzy offset so map pins for a user never sit on their
 * real coordinates. Returns jittered lat/lon within ~radius of truth.
 */
export function jitterCoords(
  lat: number,
  lon: number,
  jitterMiles = 0.15
): { lat: number; lon: number } {
  // ~69 miles per degree of latitude
  const latOffset = (jitterMiles / 69) * (Math.random() * 2 - 1);
  const lonOffset =
    (jitterMiles / (69 * Math.cos(toRad(lat)))) * (Math.random() * 2 - 1);
  return { lat: lat + latOffset, lon: lon + lonOffset };
}

// A handful of preset "safe meetup spots" used by the meetup picker.
export const SAFE_MEETUP_SPOTS = [
  {
    name: "Central Library — Main Branch",
    address: "100 Library Plaza",
    lat: 40.7282,
    lon: -73.9942,
  },
  {
    name: "Maple & Vine Coffee House",
    address: "442 Maple Avenue",
    lat: 40.7352,
    lon: -73.9872,
  },
  {
    name: "Riverside Park Pavilion",
    address: "78 Riverwalk West",
    lat: 40.7212,
    lon: -74.0022,
  },
  {
    name: "Cedar Street Co-op Café",
    address: "19 Cedar Street",
    lat: 40.7301,
    lon: -73.9788,
  },
  {
    name: "Greenfield Community Center",
    address: "305 Greenfield Blvd",
    lat: 40.7188,
    lon: -73.9901,
  },
  {
    name: "Old Town Bookshop & Tea",
    address: "12 Old Town Lane",
    lat: 40.7245,
    lon: -73.9845,
  },
];

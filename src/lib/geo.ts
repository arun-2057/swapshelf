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

/**
 * Generic safe meetup spot templates. These are location-agnostic
 * names/addresses — no hardcoded lat/lon. Coordinates are generated
 * dynamically relative to the user's actual home base when a spot
 * is selected, so the suggestions always feel local.
 */
export interface MeetupSpotTemplate {
  name: string;
  address: string;
  /** Deterministic small offset (in miles) from the user's home base */
  offsetMilesLat: number;
  offsetMilesLon: number;
}

export const SAFE_MEETUP_SPOTS: readonly MeetupSpotTemplate[] = [
  {
    name: "Central Library — Main Branch",
    address: "100 Library Plaza",
    offsetMilesLat: 0.12,
    offsetMilesLon: -0.08,
  },
  {
    name: "Maple & Vine Coffee House",
    address: "442 Maple Avenue",
    offsetMilesLat: -0.18,
    offsetMilesLon: 0.14,
  },
  {
    name: "Riverside Park Pavilion",
    address: "78 Riverwalk West",
    offsetMilesLat: 0.22,
    offsetMilesLon: 0.09,
  },
  {
    name: "Cedar Street Co-op Café",
    address: "19 Cedar Street",
    offsetMilesLat: -0.06,
    offsetMilesLon: -0.21,
  },
  {
    name: "Greenfield Community Center",
    address: "305 Greenfield Blvd",
    offsetMilesLat: -0.30,
    offsetMilesLon: 0.05,
  },
  {
    name: "Old Town Bookshop & Tea",
    address: "12 Old Town Lane",
    offsetMilesLat: 0.15,
    offsetMilesLon: 0.25,
  },
];

/**
 * Convert mile offsets to lat/lon deltas near a center point.
 * ~69 miles per degree of latitude; longitude varies by latitude.
 */
export function offsetToCoords(
  centerLat: number,
  centerLon: number,
  offsetMilesLat: number,
  offsetMilesLon: number
): { lat: number; lon: number } {
  const latDelta = offsetMilesLat / 69;
  const lonDelta = offsetMilesLon / (69 * Math.cos(toRad(centerLat)));
  return { lat: centerLat + latDelta, lon: centerLon + lonDelta };
}

// Global neighborhood presets — spanning six continents so users
// anywhere can find a plausible home base.
export interface Preset {
  name: string;
  city: string;
  region: string;
  lat: number;
  lon: number;
  zip: string;
}

export const CUSTOM_COORDS_NAME = "__custom_coords__";

export const presetNeighborhoods: readonly Preset[] = [
  // North America
  { name: "Maple Heights", city: "New York", region: "North America", lat: 40.735, lon: -73.99, zip: "10010" },
  { name: "Williamsburg", city: "New York", region: "North America", lat: 40.7142, lon: -73.9614, zip: "11211" },
  { name: "Mission District", city: "San Francisco", region: "North America", lat: 37.7599, lon: -122.4148, zip: "94110" },
  { name: "Capitol Hill", city: "Seattle", region: "North America", lat: 47.6251, lon: -122.3217, zip: "98102" },
  { name: "Wicker Park", city: "Chicago", region: "North America", lat: 41.9088, lon: -87.6796, zip: "60622" },
  { name: "Plateau", city: "Montréal", region: "North America", lat: 45.5247, lon: -73.575, zip: "H2T" },
  { name: "Roma Norte", city: "Mexico City", region: "North America", lat: 19.4174, lon: -99.1634, zip: "06700" },
  { name: "East Village", city: "New York", region: "North America", lat: 40.7265, lon: -73.9835, zip: "10003" },
  { name: "Park Slope", city: "New York", region: "North America", lat: 40.671, lon: -73.9797, zip: "11215" },
  { name: "Silver Lake", city: "Los Angeles", region: "North America", lat: 34.0868, lon: -118.2703, zip: "90026" },
  { name: "Austin Downtown", city: "Austin", region: "North America", lat: 30.2672, lon: -97.7431, zip: "78701" },
  { name: "RiNo", city: "Denver", region: "North America", lat: 39.7684, lon: -104.9804, zip: "80205" },
  { name: "Midtown", city: "Atlanta", region: "North America", lat: 33.7825, lon: -84.3882, zip: "30308" },
  { name: "French Quarter", city: "New Orleans", region: "North America", lat: 29.9584, lon: -90.065, zip: "70116" },
  { name: "Pearl District", city: "Portland", region: "North America", lat: 45.5231, lon: -122.6815, zip: "97209" },
  { name: "Kitsilano", city: "Vancouver", region: "North America", lat: 49.2637, lon: -123.169, zip: "V6K" },
  { name: "Jamaica Plain", city: "Boston", region: "North America", lat: 42.3097, lon: -71.1151, zip: "02130" },
  { name: "Kensington Market", city: "Toronto", region: "North America", lat: 43.6543, lon: -79.4004, zip: "M5T" },
  { name: "Hawthorne", city: "Portland", region: "North America", lat: 45.4986, lon: -122.6118, zip: "97214" },
  { name: "Northside", city: "Cincinnati", region: "North America", lat: 39.158, lon: -84.527, zip: "45223" },

  // South America
  { name: "Vila Madalena", city: "São Paulo", region: "South America", lat: -23.5542, lon: -46.6905, zip: "05435" },
  { name: "Palermo", city: "Buenos Aires", region: "South America", lat: -34.5889, lon: -58.4314, zip: "1414" },
  { name: "Belén", city: "Lima", region: "South America", lat: -12.0464, lon: -77.0428, zip: "15086" },
  { name: "La Candelaria", city: "Bogotá", region: "South America", lat: 4.572, lon: -74.073, zip: "110321" },
  { name: "Barrio Lastarria", city: "Santiago", region: "South America", lat: -33.443, lon: -70.649, zip: "8320000" },
  { name: "Copacabana", city: "Rio de Janeiro", region: "South America", lat: -22.969, lon: -43.186, zip: "22070" },
  { name: "La Mariscal", city: "Quito", region: "South America", lat: -0.18, lon: -78.475, zip: "170150" },

  // Europe
  { name: "Hackney", city: "London", region: "Europe", lat: 51.545, lon: -0.0556, zip: "E8" },
  { name: "Le Marais", city: "Paris", region: "Europe", lat: 48.8566, lon: 2.3614, zip: "75004" },
  { name: "Kreuzberg", city: "Berlin", region: "Europe", lat: 52.4995, lon: 13.425, zip: "10999" },
  { name: "Trastevere", city: "Rome", region: "Europe", lat: 41.8896, lon: 12.4695, zip: "00153" },
  { name: "De Pijp", city: "Amsterdam", region: "Europe", lat: 52.3535, lon: 4.8917, zip: "1073" },
  { name: "Gràcia", city: "Barcelona", region: "Europe", lat: 41.4022, lon: 2.1564, zip: "08012" },
  { name: "Södermalm", city: "Stockholm", region: "Europe", lat: 59.313, lon: 18.073, zip: "11620" },
  { name: "Príncipe Real", city: "Lisbon", region: "Europe", lat: 38.7143, lon: -9.1485, zip: "1250" },
  { name: "Shoreditch", city: "London", region: "Europe", lat: 51.5235, lon: -0.0787, zip: "EC2A" },
  { name: "Canal Saint-Martin", city: "Paris", region: "Europe", lat: 48.881, lon: 2.368, zip: "75010" },
  { name: "Neubau", city: "Vienna", region: "Europe", lat: 48.204, lon: 16.354, zip: "1070" },
  { name: "Vesterbro", city: "Copenhagen", region: "Europe", lat: 55.669, lon: 12.554, zip: "1620" },
  { name: "Gothic Quarter", city: "Barcelona", region: "Europe", lat: 41.383, lon: 2.177, zip: "08002" },
  { name: "Mitte", city: "Berlin", region: "Europe", lat: 52.526, lon: 13.403, zip: "10178" },
  { name: "Oude Centrum", city: "Antwerp", region: "Europe", lat: 51.215, lon: 4.402, zip: "2000" },
  { name: "Óbuda", city: "Budapest", region: "Europe", lat: 47.563, lon: 19.032, zip: "1035" },
  { name: "Old Town", city: "Edinburgh", region: "Europe", lat: 55.949, lon: -3.189, zip: "EH1" },
  { name: "Dublin 8", city: "Dublin", region: "Europe", lat: 53.336, lon: -6.281, zip: "D08" },
  { name: "Umedalen", city: "Umeå", region: "Europe", lat: 63.83, lon: 20.2, zip: "90751" },

  // Asia
  { name: "Shimokitazawa", city: "Tokyo", region: "Asia", lat: 35.661, lon: 139.6692, zip: "155-0031" },
  { name: "Hongdae", city: "Seoul", region: "Asia", lat: 37.556, lon: 126.9236, zip: "04000" },
  { name: "Bandra West", city: "Mumbai", region: "Asia", lat: 19.0596, lon: 72.8295, zip: "400050" },
  { name: "Ximending", city: "Taipei", region: "Asia", lat: 25.0424, lon: 121.5085, zip: "108" },
  { name: "Tiong Bahru", city: "Singapore", region: "Asia", lat: 1.2847, lon: 103.8408, zip: "168981" },
  { name: "Cihangir", city: "Istanbul", region: "Asia", lat: 41.0357, lon: 28.9851, zip: "34421" },
  { name: "Thảo Điền", city: "Ho Chi Minh City", region: "Asia", lat: 10.8058, lon: 106.7341, zip: "700000" },
  { name: "Xintiandi", city: "Shanghai", region: "Asia", lat: 31.2237, lon: 121.4692, zip: "200021" },
  { name: "Hauz Khas", city: "New Delhi", region: "Asia", lat: 28.5494, lon: 77.2001, zip: "110016" },
  { name: "Sai Ying Pun", city: "Hong Kong", region: "Asia", lat: 22.286, lon: 114.142, zip: "" },
  { name: "Pattaya", city: "Bangkok", region: "Asia", lat: 13.756, lon: 100.502, zip: "10250" },
  { name: "Jahra", city: "Kuwait City", region: "Asia", lat: 29.337, lon: 47.682, zip: "" },
  { name: "Yanaka", city: "Tokyo", region: "Asia", lat: 35.733, lon: 139.765, zip: "110-0001" },
  { name: "Bukchon", city: "Seoul", region: "Asia", lat: 37.581, lon: 126.986, zip: "03055" },
  { name: "Fort Kochi", city: "Kochi", region: "Asia", lat: 9.966, lon: 76.242, zip: "682001" },
  { name: "Kampong Glam", city: "Singapore", region: "Asia", lat: 1.302, lon: 103.858, zip: "198996" },
  { name: "Sultanahmet", city: "Istanbul", region: "Asia", lat: 41.005, lon: 28.977, zip: "34122" },
  { name: "Bukit Bintang", city: "Kuala Lumpur", region: "Asia", lat: 3.146, lon: 101.712, zip: "55100" },
  { name: "Samyang", city: "Taipei", region: "Asia", lat: 25.029, lon: 121.527, zip: "106" },
  { name: "Chongno", city: "Seoul", region: "Asia", lat: 37.574, lon: 126.985, zip: "03049" },

  // Africa
  { name: "Bo-Kaap", city: "Cape Town", region: "Africa", lat: -33.9245, lon: 18.4108, zip: "8001" },
  { name: "Maadi", city: "Cairo", region: "Africa", lat: 29.9602, lon: 31.2569, zip: "11728" },
  { name: "Yoff", city: "Dakar", region: "Africa", lat: 14.7472, lon: -17.2422, zip: "9935" },
  { name: "Westlands", city: "Nairobi", region: "Africa", lat: -1.2676, lon: 36.8108, zip: "00100" },
  { name: "Lamu Old Town", city: "Lamu", region: "Africa", lat: -2.269, lon: 40.902, zip: "" },
  { name: "Zanzibar Stone Town", city: "Zanzibar", region: "Africa", lat: -6.163, lon: 39.189, zip: "" },
  { name: "Accra Central", city: "Accra", region: "Africa", lat: 5.556, lon: -0.197, zip: "GP" },
  { name: "Dar es Salaam", city: "Dar es Salaam", region: "Africa", lat: -6.792, lon: 39.208, zip: "" },
  { name: "Cape Town City Bowl", city: "Cape Town", region: "Africa", lat: -33.924, lon: 18.424, zip: "8001" },
  { name: "Nouakchott", city: "Nouakchott", region: "Africa", lat: 18.086, lon: -15.975, zip: "" },

  // Oceania
  { name: "Newtown", city: "Sydney", region: "Oceania", lat: -33.8968, lon: 151.1796, zip: "2042" },
  { name: "Fitzroy", city: "Melbourne", region: "Oceania", lat: -37.7971, lon: 144.9793, zip: "3065" },
  { name: "Ponsonby", city: "Auckland", region: "Oceania", lat: -36.8536, lon: 174.746, zip: "1011" },
  { name: "Teneriffe", city: "Brisbane", region: "Oceania", lat: -27.454, lon: 153.038, zip: "4005" },
  { name: "Aro Valley", city: "Wellington", region: "Oceania", lat: -41.293, lon: 174.762, zip: "6012" },
  { name: "Freemantle", city: "Perth", region: "Oceania", lat: -32.056, lon: 115.746, zip: "6160" },
  { name: "North Adelaide", city: "Adelaide", region: "Oceania", lat: -34.905, lon: 138.599, zip: "5006" },
  { name: "Hamilton East", city: "Hamilton", region: "Oceania", lat: -37.788, lon: 175.284, zip: "3210" },
  { name: "Manly", city: "Sydney", region: "Oceania", lat: -33.797, lon: 151.287, zip: "2095" },
  { name: "St Kilda", city: "Melbourne", region: "Oceania", lat: -37.868, lon: 144.973, zip: "3182" },
];

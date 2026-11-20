export interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METERS = 6_371_000;
const WALKING_SPEED_METERS_PER_MIN = 80;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle Haversine distance in meters between two WGS-84 coordinates.
 */
export function calculateDistanceMeters(a: Coordinates, b: Coordinates): number {
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);

  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);

  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_METERS * c;
}

export interface WalkingEstimate {
  meters: number;
  minutes: number;
}

export function estimateWalking(a: Coordinates, b: Coordinates): WalkingEstimate {
  const rawMeters = calculateDistanceMeters(a, b);
  const roundedMeters =
    rawMeters < 1000
      ? Math.max(10, Math.round(rawMeters / 10) * 10)
      : Math.round(rawMeters);
  const minutes = Math.max(1, Math.round(rawMeters / WALKING_SPEED_METERS_PER_MIN));
  return {
    meters: roundedMeters,
    minutes,
  };
}

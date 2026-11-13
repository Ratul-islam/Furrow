/** Field geometry: area of a hand-drawn polygon and local units. */

export type LatLng = [number, number];

/** Area in m² (equirectangular projection around the polygon; accurate for fields). */
export function polygonArea(points: LatLng[]) {
  if (points.length < 3) return 0;
  const lat0 = (points.reduce((s, p) => s + p[0], 0) / points.length) * (Math.PI / 180);
  const xy = points.map(([lat, lng]) => [lng * 111320 * Math.cos(lat0), lat * 110540]);
  let a = 0;
  for (let i = 0; i < xy.length; i++) {
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[(i + 1) % xy.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

export function centroid(points: LatLng[]): LatLng {
  if (!points.length) return [0, 0];
  return [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length];
}

/** Bangladesh units: 1 decimal (shotangsho) = 40.4686 m²; 1 bigha = 33 decimals. */
export const DECIMAL_M2 = 40.4686;
export const BIGHA_M2 = 33 * DECIMAL_M2;

export function areaText(m2: number) {
  if (m2 <= 0) return '–';
  const dec = m2 / DECIMAL_M2;
  const bigha = m2 / BIGHA_M2;
  return bigha >= 1 ? `${bigha.toFixed(1)} bigha (${Math.round(dec)} decimal)` : `${Math.round(dec)} decimal`;
}

/** Pilot area for which the NASA bundle is built. */
export const PILOT = { name: 'Ashulia, Savar', center: [23.9, 90.3] as LatLng, radiusKm: 15 };

export function kmBetween(a: LatLng, b: LatLng) {
  const r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r;
  const dLng = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function perimeter(points: LatLng[]) {
  if (points.length < 2) return 0;
  let p = 0;
  for (let i = 0; i < points.length; i++) {
    if (i === points.length - 1 && points.length < 3) break;
    p += kmBetween(points[i], points[(i + 1) % points.length]) * 1000;
  }
  return p;
}

/** True if any two non-adjacent edges cross (a "bow-tie" shape). */
export function selfIntersects(points: LatLng[]) {
  const n = points.length;
  if (n < 4) return false;
  const cross = (a: LatLng, b: LatLng, c: LatLng) => (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
  const hit = (p1: LatLng, p2: LatLng, p3: LatLng, p4: LatLng) =>
    cross(p1, p2, p3) * cross(p1, p2, p4) < 0 && cross(p3, p4, p1) * cross(p3, p4, p2) < 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
      if (hit(points[i], points[(i + 1) % n], points[j], points[(j + 1) % n])) return true;
    }
  }
  return false;
}

export type AreaUnit = 'decimal' | 'bigha' | 'acre' | 'hectare';
export const AREA_UNITS: { unit: AreaUnit; label: string; m2: number; digits: number }[] = [
  { unit: 'decimal', label: 'decimal', m2: DECIMAL_M2, digits: 0 },
  { unit: 'bigha', label: 'bigha', m2: BIGHA_M2, digits: 1 },
  { unit: 'acre', label: 'acre', m2: 4046.86, digits: 2 },
  { unit: 'hectare', label: 'hectare', m2: 10000, digits: 2 },
];

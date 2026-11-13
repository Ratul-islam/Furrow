import { Platform } from 'react-native';

import type { LatLng } from './geo';

export type Place = { name: string; detail: string; at: LatLng };

/**
 * Place search with OpenStreetMap Nominatim, limited to Bangladesh.
 * Called only when the farmer presses search (Nominatim does not allow search-as-you-type).
 */
export async function searchPlaces(q: string, signal?: AbortSignal): Promise<Place[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=bd&limit=6&q=${encodeURIComponent(q)}`;
  const headers: Record<string, string> = { 'Accept-Language': 'en' };
  if (Platform.OS !== 'web') headers['User-Agent'] = 'Furrow/0.1 (NASA Space Apps 2026 demo)';
  const r = await fetch(url, { headers, signal });
  if (!r.ok) throw new Error(`Search failed (${r.status})`);
  const rows: { display_name: string; lat: string; lon: string }[] = await r.json();
  return rows.map((x) => {
    const parts = x.display_name.split(', ');
    return { name: parts[0], detail: parts.slice(1, 4).join(', '), at: [Number(x.lat), Number(x.lon)] as LatLng };
  });
}

/** Quick places in and around the pilot area. */
export const QUICK_PLACES: Place[] = [
  { name: 'Ashulia', detail: 'Savar, Dhaka', at: [23.8812, 90.3302] },
  { name: 'Birulia', detail: 'Savar, Dhaka', at: [23.8306, 90.3378] },
  { name: 'Dhamsona', detail: 'Ashulia, Savar', at: [23.9452, 90.3108] },
];

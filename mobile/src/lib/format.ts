export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export const fixed = (x: number | null | undefined, n = 1) => (x == null ? '–' : x.toFixed(n));
export const whole = (x: number | null | undefined) => (x == null ? '–' : Math.round(x).toLocaleString('en-US'));
export const signed = (x: number, n = 1) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(n)}`;
export const pct = (x: number) => `${Math.round(x)}%`;

/** "Taka 1.2 lakh"-style is unfamiliar to judges; use k for thousands. */
export const bdt = (x: number) => `৳${(x / 1000).toFixed(0)}k`;

export function shortDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}${y ? '' : ''}`;
}

export function monthDay(mmdd: string) {
  const [m, d] = mmdd.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

export function longDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function dateRange(a: string, b?: string) {
  if (!b) return shortDate(a);
  const [, am] = a.split('-').map(Number);
  const [, bm, bd] = b.split('-').map(Number);
  const [, , ad] = a.split('-').map(Number);
  return am === bm ? `${ad}–${bd} ${MONTHS[am - 1]}` : `${shortDate(a)} – ${bd} ${MONTHS[bm - 1]}`;
}

export const scenarioLabel = (s: string) => (s === 'ssp245' ? 'SSP2-4.5' : s === 'ssp585' ? 'SSP5-8.5' : 'Observed');

export const signed = (v: number, d = 0) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(d);
export const whole = (v: number) => Math.round(v).toLocaleString("en-US");
export const one = (v: number) => v.toFixed(1);
export const round10 = (v: number) => (Math.round(v / 10) * 10).toLocaleString("en-US");
export const range10 = (r: [number, number]) => `${round10(r[0])}–${round10(r[1])}`;
export const mmRange = (r: [number, number]) => `${range10(r)} mm`;
export const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;

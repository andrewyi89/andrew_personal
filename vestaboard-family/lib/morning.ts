import { COLS, emptyBoard, charToCode } from "@/lib/shared";

// ZIP 10023 (Upper West Side, Manhattan)
const LAT = 40.7769;
const LON = -73.9813;

export function etNow(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", weekday: "short", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "numeric", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const p: Record<string, string> = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return {
    weekday: p.weekday,
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
    date: `${p.year}-${p.month}-${p.day}`,
  };
}

// Open-Meteo: free, no key.
export async function fetchHighLow() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    `&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit` +
    `&timezone=America%2FNew_York&forecast_days=1`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("Weather error");
  const d = await r.json();
  return { hi: Math.round(d.daily.temperature_2m_max[0]), lo: Math.round(d.daily.temperature_2m_min[0]) };
}

export function morningLayout(hi: number, lo: number, hour: number, minute: number): number[][] {
  const left = `H: ${hi} L: ${lo}`;
  const right = `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
  const text = left + " ".repeat(Math.max(1, COLS - left.length - right.length)) + right;
  const b = emptyBoard();
  b[0] = [...text.slice(0, COLS)].map((ch) => charToCode(ch) ?? 0);
  return b;
}

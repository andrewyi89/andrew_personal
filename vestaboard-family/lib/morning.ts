import { COLS, emptyBoard, charToCode } from "@/lib/shared";

// ZIP 10024 (Upper West Side, Manhattan)
const LAT = 40.7869;
const LON = -73.9763;

export type Weather = { now: number; feels: number; hi: number; lo: number; pop: number; snow: boolean };

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
export async function fetchWeather(): Promise<Weather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    `&current=temperature_2m,apparent_temperature` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,snowfall_sum` +
    `&temperature_unit=fahrenheit&timezone=America%2FNew_York&forecast_days=1`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("Weather error");
  const d = await r.json();
  return {
    now: Math.round(d.current.temperature_2m),
    feels: Math.round(d.current.apparent_temperature),
    hi: Math.round(d.daily.temperature_2m_max[0]),
    lo: Math.round(d.daily.temperature_2m_min[0]),
    pop: Math.round(d.daily.precipitation_probability_max[0] ?? 0),
    snow: (d.daily.snowfall_sum[0] ?? 0) > 0,
  };
}

function place(b: number[][], row: number, text: string, start: number) {
  [...text].forEach((ch, i) => {
    if (start + i >= 0 && start + i < COLS) b[row][start + i] = charToCode(ch) ?? 0;
  });
}

export function morningLayout(w: Weather, hour: number, minute: number): number[][] {
  const b = emptyBoard();
  const clock = `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
  const header = "NYC WEATHER";
  place(b, 0, header, Math.floor((COLS - header.length) / 2));
  place(b, 1, `NOW: ${w.now}`, 0);
  place(b, 1, clock, COLS - clock.length);
  place(b, 2, `FEELS: ${w.feels ?? w.now}`, 0);
  place(b, 3, `HIGH: ${w.hi}`, 0);
  place(b, 4, `LOW: ${w.lo}`, 0);
  place(b, 5, `${w.snow ? "SNOW" : "RAIN"}: ${w.pop}%`, 0);
  return b;
}

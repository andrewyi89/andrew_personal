import { COLS, emptyBoard, charToCode } from "@/lib/shared";

export type Snap = { gamePk: number; status: string; away: number; home: number };

const etDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });

// MLB Stats API (free, no key). gameType W = World Series.
export async function fetchGame() {
  const now = new Date();
  const start = etDate(new Date(now.getTime() - 24 * 3600 * 1000));
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&gameType=W&startDate=${start}&endDate=${etDate(now)}&hydrate=linescore,team`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("MLB API error");
  const games: any[] = ((await res.json()).dates ?? []).flatMap((d: any) => d.games);
  // Prefer a live game, then an upcoming one, otherwise the most recent.
  return games.find((g) => g.status.abstractGameState === "Live")
    ?? games.find((g) => g.status.abstractGameState === "Preview")
    ?? games[games.length - 1] ?? null;
}

export const snapOf = (g: any): Snap => ({
  gamePk: g.gamePk,
  status: g.status.abstractGameState,
  away: g.teams.away.score ?? 0,
  home: g.teams.home.score ?? 0,
});

export function reasonFor(prev: Partial<Snap>, cur: Snap): "start" | "score" | "final" | null {
  const same = prev.gamePk === cur.gamePk;
  if (cur.status === "Live" && (!same || prev.status !== "Live")) return "start";
  if (cur.status === "Live" && (prev.away !== cur.away || prev.home !== cur.home)) return "score";
  if (cur.status === "Final" && same && prev.status !== "Final") return "final";
  return null;
}

const row = (text: string) => {
  const r = Array(COLS).fill(0);
  const t = text.slice(0, COLS);
  const left = Math.floor((COLS - t.length) / 2);
  [...t].forEach((ch, i) => (r[left + i] = charToCode(ch) ?? 0));
  return r;
};

export function layoutFor(g: any, reason: string): number[][] {
  const line = (t: any) => (t.team.abbreviation ?? "").padEnd(5) + String(t.score ?? 0).padStart(3);
  const ls = g.linescore ?? {};
  const status =
    reason === "final" ? "FINAL"
    : reason === "start" && !ls.currentInning ? "PLAY BALL"
    : `${ls.inningHalf === "Bottom" ? "BOT" : "TOP"} ${ls.currentInning ?? ""}`.trim();
  const b = emptyBoard();
  b[0] = row(`WORLD SERIES GAME ${g.seriesGameNumber ?? ""}`.trim());
  b[2] = row(line(g.teams.away));
  b[3] = row(line(g.teams.home));
  b[5] = row(status);
  return b;
}

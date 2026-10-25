import { NextResponse } from "next/server";
import { authorized, isValid } from "@/lib/shared";

const URL = "https://rw.vestaboard.com/";
const keyHeader = () => ({ "X-Vestaboard-Read-Write-Key": process.env.VESTABOARD_RW_KEY! });
let lastSend = 0; // best-effort cooldown (resets if the server restarts)

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  const { layout } = await req.json();
  if (!isValid(layout)) return NextResponse.json({ error: "Board is not 6 x 22" }, { status: 400 });
  if (Date.now() - lastSend < 15000)
    return NextResponse.json({ error: "Wait a few seconds, then send again" }, { status: 429 });

  const r = await fetch(URL, {
    method: "POST",
    headers: { ...keyHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(layout),
  });
  if (!r.ok) return NextResponse.json({ error: "Vestaboard rejected the message" }, { status: 502 });
  lastSend = Date.now();
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  const r = await fetch(URL, { headers: keyHeader(), cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: "Could not read the board" }, { status: 502 });
  const d = await r.json();
  return NextResponse.json({ layout: JSON.parse(d.currentMessage.layout) });
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { etNow, fetchHighLow, morningLayout } from "@/lib/morning";

export const dynamic = "force-dynamic";
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Called every minute by Supabase cron. Only acts 7:00-7:59 AM Eastern, Mon-Fri.
// Add ?force=1 (with the secret) to send once right now, for testing.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  const force = new URL(req.url).searchParams.get("force") === "1";
  const now = etNow();
  const weekend = now.weekday === "Sat" || now.weekday === "Sun";
  if (!force && (weekend || now.hour !== 7)) return NextResponse.json({ skipped: "outside window" });

  const { data: row } = await db().from("integrations").select("enabled,state").eq("id", "morning").single();
  if (!force && !row?.enabled) return NextResponse.json({ skipped: "disabled" });

  const state = row?.state ?? {};
  const key = `${now.date} ${now.hour}:${now.minute}`;
  if (!force && state.key === key) return NextResponse.json({ skipped: "already sent" });

  let w = state.day === now.date && state.hi !== undefined ? { hi: state.hi, lo: state.lo } : null;
  if (!w) {
    try { w = await fetchHighLow(); }
    catch { return NextResponse.json({ error: "Weather unavailable" }, { status: 502 }); } // retries next minute
  }

  const r = await fetch("https://rw.vestaboard.com/", {
    method: "POST",
    headers: { "X-Vestaboard-Read-Write-Key": process.env.VESTABOARD_RW_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify(morningLayout(w.hi, w.lo, now.hour, now.minute)),
  });
  if (!r.ok) return NextResponse.json({ error: "Vestaboard rejected it" }, { status: 502 });

  await db().from("integrations").update({ state: { key, day: now.date, hi: w.hi, lo: w.lo } }).eq("id", "morning");
  return NextResponse.json({ sent: true, ...w, time: `${now.hour}:${now.minute}` });
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchGame, snapOf, reasonFor, layoutFor } from "@/lib/ws";

export const dynamic = "force-dynamic";
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Called every minute by Supabase cron.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  const { data: row } = await db().from("integrations").select("enabled,state").eq("id", "worldseries").single();
  if (!row?.enabled) return NextResponse.json({ skipped: "disabled" });

  const game = await fetchGame();
  if (!game) return NextResponse.json({ skipped: "no game" });
  const cur = snapOf(game);
  const reason = reasonFor(row.state ?? {}, cur);

  if (reason) {
    const r = await fetch("https://rw.vestaboard.com/", {
      method: "POST",
      headers: { "X-Vestaboard-Read-Write-Key": process.env.VESTABOARD_RW_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify(layoutFor(game, reason)),
    });
    if (!r.ok) return NextResponse.json({ error: "Vestaboard rejected it" }, { status: 502 }); // retry next minute
  }
  await db().from("integrations").update({ state: cur }).eq("id", "worldseries");
  return NextResponse.json({ sent: reason, ...cur });
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authorized } from "@/lib/shared";

const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  const { data } = await db().from("integrations").select("enabled").eq("id", "worldseries").single();
  return NextResponse.json({ worldSeries: !!data?.enabled });
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  const { worldSeries } = await req.json();
  // Reset saved game state so turning it on mid-game posts the current score right away.
  const { error } = await db().from("integrations")
    .update({ enabled: !!worldSeries, state: {} }).eq("id", "worldseries");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

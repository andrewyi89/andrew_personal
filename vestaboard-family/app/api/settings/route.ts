import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authorized } from "@/lib/shared";

const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const IDS = { worldSeries: "worldseries", morning: "morning" } as const;

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  const { data } = await db().from("integrations").select("id,enabled").in("id", Object.values(IDS));
  const on = (id: string) => !!data?.find((r) => r.id === id)?.enabled;
  return NextResponse.json({ worldSeries: on(IDS.worldSeries), morning: on(IDS.morning) });
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  const body = await req.json();
  for (const [key, id] of Object.entries(IDS)) {
    if (typeof body[key] !== "boolean") continue;
    // Reset saved state so a newly enabled feature starts fresh.
    const { error } = await db().from("integrations").update({ enabled: body[key], state: {} }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

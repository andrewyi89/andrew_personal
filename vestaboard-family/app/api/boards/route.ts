import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authorized, isValid } from "@/lib/shared";

export const dynamic = "force-dynamic";
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  const { data, error } = await db().from("boards")
    .select("id,name,layout,created_by").order("created_at", { ascending: false }).limit(40);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ boards: data });
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  const { name, layout, by } = await req.json();
  if (!name || !isValid(layout)) return NextResponse.json({ error: "Add a name first" }, { status: 400 });
  const { error } = await db().from("boards").insert({ name, layout, created_by: by || null });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

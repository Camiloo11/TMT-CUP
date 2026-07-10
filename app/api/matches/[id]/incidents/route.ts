import { getSupabase } from "@/lib/supabase";

// GET /api/matches/[id]/incidents → reportes disciplinarios del partido
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase();
  const { id } = await params;
  const matchId = Number(id);
  if (Number.isNaN(matchId)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

// POST /api/matches/[id]/incidents → nota rápida del supervisor
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase();
  const { id } = await params;
  const matchId = Number(id);
  if (Number.isNaN(matchId)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }

  const body = await request.json();
  if (!body.note || !String(body.note).trim()) {
    return Response.json({ error: "note es obligatoria" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("incidents")
    .insert({
      match_id: matchId,
      type: body.type ?? "OTRO",
      note: String(body.note).trim(),
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}

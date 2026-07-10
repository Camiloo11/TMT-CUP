import { getSupabase } from "@/lib/supabase";

// GET /api/players?team=3 → jugadores (de un equipo, o todos)
export async function GET(request: Request) {
  const supabase = getSupabase();
  const url = new URL(request.url);
  const team = url.searchParams.get("team");

  let query = supabase.from("players").select("*, team:teams(id, name)").order("name");
  if (team) query = query.eq("team_id", Number(team));

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

// POST /api/players → inscribir un jugador (el registro de la mañana)
export async function POST(request: Request) {
  const supabase = getSupabase();
  const body = await request.json();

  if (!body.name || !String(body.name).trim() || !body.teamId) {
    return Response.json({ error: "name y teamId son obligatorios" }, { status: 400 });
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("id", body.teamId)
    .maybeSingle();
  if (!team) return Response.json({ error: "Equipo no encontrado" }, { status: 404 });

  const { data: player, error } = await supabase
    .from("players")
    .insert({
      name: String(body.name).trim(),
      team_id: body.teamId,
      number: body.number ?? null,
      photo_url: body.photoUrl ?? null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(player, { status: 201 });
}

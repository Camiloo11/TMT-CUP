import { supabase } from "@/lib/supabase";

// GET /api/matches → todos los partidos, ordenados por fecha, con sus equipos
export async function GET() {
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*, teamA:teams!matches_team_a_id_fkey(*), teamB:teams!matches_team_b_id_fkey(*)")
    .order("scheduled_at", { ascending: true }); // 👈 del más próximo al más lejano

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(matches);
}

// POST /api/matches → programar un partido nuevo
export async function POST(request: Request) {
  const body = await request.json();

  if (!body.teamAId || !body.teamBId || !body.scheduledAt || !body.fieldNumber || !body.phase) {
    return Response.json(
      { error: "teamAId, teamBId, scheduledAt, fieldNumber y phase son obligatorios" },
      { status: 400 }
    );
  }

  // Validación de NEGOCIO (no solo de formato):
  if (body.teamAId === body.teamBId) {
    return Response.json(
      { error: "Un equipo no puede jugar contra sí mismo" },
      { status: 400 }
    );
  }

  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      team_a_id: body.teamAId,
      team_b_id: body.teamBId,
      scheduled_at: new Date(body.scheduledAt).toISOString(), // texto → fecha real
      field_number: body.fieldNumber,
      phase: body.phase,
    })
    .select("*, teamA:teams!matches_team_a_id_fkey(*), teamB:teams!matches_team_b_id_fkey(*)")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(match, { status: 201 });
}
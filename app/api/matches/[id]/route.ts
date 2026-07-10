import { getSupabase } from "@/lib/supabase";

// GET /api/matches/[id] → detalle completo del partido: plantillas
// (marcando expulsados), eventos, y supervisor/árbitro de la cancha hoy.
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

  const { data: match, error } = await supabase
    .from("matches")
    .select(
      "*, teamA:teams!matches_team_a_id_fkey(*, players(*)), teamB:teams!matches_team_b_id_fkey(*, players(*))"
    )
    .eq("id", matchId)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!match) return Response.json({ error: "Partido no encontrado" }, { status: 404 });

  const { data: events } = await supabase
    .from("match_events")
    .select("*, player:players(id, name), team:teams(id, name)")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  // Expulsados en CUALQUIER partido del torneo → bloqueados en la plantilla
  type PlayerRow = { id: number; [k: string]: unknown };
  const rosterIds: number[] = [
    ...match.teamA.players.map((p: PlayerRow) => p.id),
    ...match.teamB.players.map((p: PlayerRow) => p.id),
  ];
  let suspended = new Set<number>();
  if (rosterIds.length > 0) {
    const { data: reds } = await supabase
      .from("match_events")
      .select("player_id")
      .eq("type", "ROJA")
      .in("player_id", rosterIds);
    suspended = new Set((reds ?? []).map((r) => r.player_id as number));
  }
  const markRoster = (team: { players: PlayerRow[] }) => ({
    ...team,
    players: team.players.map((p) => ({ ...p, suspended: suspended.has(p.id) })),
  });

  // Supervisor y árbitro asignados a esta cancha hoy
  const { data: assignment } = await supabase
    .from("pitch_assignments")
    .select("*")
    .eq("field_number", match.field_number)
    .eq("day", new Date().toISOString().slice(0, 10))
    .maybeSingle();

  return Response.json({
    ...match,
    teamA: markRoster(match.teamA),
    teamB: markRoster(match.teamB),
    events: events ?? [],
    assignment: assignment ?? null,
  });
}

// PATCH /api/matches/[id] → registrar el resultado de un partido
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase();
  const { id } = await params;      // el número que viene en la URL
  const matchId = Number(id);

  if (Number.isNaN(matchId)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }

  const body = await request.json();

  if (body.scoreA === undefined || body.scoreB === undefined) {
    return Response.json(
      { error: "scoreA y scoreB son obligatorios" },
      { status: 400 }
    );
  }

  // ¿Existe el partido? Nunca actualices a ciegas
  const { data: match } = await supabase
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) {
    return Response.json({ error: "Partido no encontrado" }, { status: 404 });
  }

  const { data: updated, error } = await supabase
    .from("matches")
    .update({
      score_a: body.scoreA,
      score_b: body.scoreB,
      status: "FINALIZADO", // registrar marcador = partido terminado
    })
    .eq("id", matchId)
    .select("*, teamA:teams!matches_team_a_id_fkey(*), teamB:teams!matches_team_b_id_fkey(*)")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(updated);
}
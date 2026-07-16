import { getSupabase } from "@/lib/supabase";
import { requireRole, isAuthError } from "@/lib/auth";

// GET /api/matches/[id] → detalle completo del partido: plantillas
// (marcando expulsados), eventos, y supervisor/árbitro de la cancha hoy.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;
    const matchId = Number(id);
    if (Number.isNaN(matchId)) {
      return Response.json({ error: "id inválido" }, { status: 400 });
    }

    const { data: match, error } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .maybeSingle();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!match) return Response.json({ error: "Partido no encontrado" }, { status: 404 });

    // Equipos con plantilla en una consulta aparte (más simple = más robusto).
    // Los partidos de fase final pueden tener equipos "por definir" (null).
    const teamIds = [match.team_a_id, match.team_b_id].filter((n): n is number => n !== null);
    const { data: teams, error: teamErr } = teamIds.length
      ? await supabase.from("teams").select("*, players(*)").in("id", teamIds)
      : { data: [], error: null };
    if (teamErr) return Response.json({ error: `teams: ${teamErr.message}` }, { status: 500 });

    const teamARaw = (teams ?? []).find((t) => t.id === match.team_a_id) ?? null;
    const teamBRaw = (teams ?? []).find((t) => t.id === match.team_b_id) ?? null;

    const { data: events, error: evErr } = await supabase
      .from("match_events")
      .select("*, player:players(id, name), team:teams(id, name)")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });
    if (evErr) return Response.json({ error: `events: ${evErr.message}` }, { status: 500 });

    // Expulsados en CUALQUIER partido del torneo → bloqueados en la plantilla
    type PlayerRow = { id: number; [k: string]: unknown };
    const teamAPlayers: PlayerRow[] = teamARaw?.players ?? [];
    const teamBPlayers: PlayerRow[] = teamBRaw?.players ?? [];
    const rosterIds = [...teamAPlayers, ...teamBPlayers].map((p) => p.id);

    let suspended = new Set<number>();
    if (rosterIds.length > 0) {
      const { data: reds, error: redErr } = await supabase
        .from("match_events")
        .select("player_id")
        .eq("type", "ROJA")
        .in("player_id", rosterIds);
      if (redErr) return Response.json({ error: `rojas: ${redErr.message}` }, { status: 500 });
      suspended = new Set((reds ?? []).map((r) => r.player_id as number));
    }
    const mark = (players: PlayerRow[]) =>
      players.map((p) => ({ ...p, suspended: suspended.has(p.id) }));

    // Supervisor y árbitro asignados a esta cancha hoy
    const { data: assignment } = await supabase
      .from("pitch_assignments")
      .select("*")
      .eq("field_number", match.field_number)
      .eq("day", new Date().toISOString().slice(0, 10))
      .maybeSingle();

    return Response.json({
      ...match,
      teamA: teamARaw ? { ...teamARaw, players: mark(teamAPlayers) } : null,
      teamB: teamBRaw ? { ...teamBRaw, players: mark(teamBPlayers) } : null,
      events: events ?? [],
      assignment: assignment ?? null,
    });
  } catch (err) {
    // Nunca reventar sin mensaje: el error siempre llega legible al cliente
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `detalle: ${message}` }, { status: 500 });
  }
}

// PATCH /api/matches/[id] → registrar el resultado de un partido
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["ADMIN"]);
  if (isAuthError(auth)) return auth;

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
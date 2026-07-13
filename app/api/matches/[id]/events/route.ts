import { getSupabase } from "@/lib/supabase";
import { requireRole, isAuthError } from "@/lib/auth";

type Db = ReturnType<typeof getSupabase>;

// Eventos del partido: la consola en vivo del supervisor.
// Regla de transparencia: solo se puede agregar/quitar MIENTRAS el partido
// está EN_JUEGO y no ha sido publicado. Después, solo el admin corrige.

async function getMatchState(supabase: Db, matchId: number) {
  const { data } = await supabase
    .from("matches")
    .select("id, status, published_at, team_a_id, team_b_id")
    .eq("id", matchId)
    .maybeSingle();
  return data;
}

async function recomputeScore(supabase: Db, matchId: number, teamAId: number, teamBId: number) {
  const { data: goals } = await supabase
    .from("match_events")
    .select("team_id")
    .eq("match_id", matchId)
    .eq("type", "GOL");

  const scoreA = (goals ?? []).filter((g) => g.team_id === teamAId).length;
  const scoreB = (goals ?? []).filter((g) => g.team_id === teamBId).length;
  await supabase.from("matches").update({ score_a: scoreA, score_b: scoreB }).eq("id", matchId);
}

// GET /api/matches/[id]/events → línea de tiempo del partido
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
    .from("match_events")
    .select("*, player:players(id, name), team:teams(id, name)")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

// POST /api/matches/[id]/events → registrar gol / amarilla / roja
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

  const auth = await requireRole(["SUPERVISOR"]);
  if (isAuthError(auth)) return auth;

  const body = await request.json();
  const validTypes = ["GOL", "AMARILLA", "ROJA"];

  if (!validTypes.includes(body.type) || !body.teamId) {
    return Response.json(
      { error: "type (GOL|AMARILLA|ROJA) y teamId son obligatorios" },
      { status: 400 }
    );
  }
  // Las tarjetas siempre son de un jugador; el gol puede quedar sin autor
  if (body.type !== "GOL" && !body.playerId) {
    return Response.json({ error: "Las tarjetas requieren playerId" }, { status: 400 });
  }

  const match = await getMatchState(supabase, matchId);
  if (!match) return Response.json({ error: "Partido no encontrado" }, { status: 404 });
  if (match.status !== "EN_JUEGO" || match.published_at) {
    return Response.json(
      { error: "Solo se registran eventos con el partido en juego (y sin publicar)" },
      { status: 409 }
    );
  }
  if (body.teamId !== match.team_a_id && body.teamId !== match.team_b_id) {
    return Response.json({ error: "Ese equipo no juega este partido" }, { status: 400 });
  }

  // Jugador expulsado no puede sumar más eventos (roja = bloqueado)
  if (body.playerId) {
    const { data: red } = await supabase
      .from("match_events")
      .select("id")
      .eq("player_id", body.playerId)
      .eq("type", "ROJA")
      .limit(1);
    if (red && red.length > 0) {
      return Response.json(
        { error: "Jugador expulsado: no puede registrar más eventos" },
        { status: 409 }
      );
    }
  }

  const { data: event, error } = await supabase
    .from("match_events")
    .insert({
      match_id: matchId,
      team_id: body.teamId,
      player_id: body.playerId ?? null,
      type: body.type,
      minute: body.minute ?? null,
    })
    .select("*, player:players(id, name), team:teams(id, name)")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (body.type === "GOL") {
    await recomputeScore(supabase, matchId, match.team_a_id, match.team_b_id);
  }

  return Response.json(event, { status: 201 });
}

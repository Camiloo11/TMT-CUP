import { getSupabase } from "@/lib/supabase";

type Db = ReturnType<typeof getSupabase>;

// POST /api/matches/[id]/lifecycle → transiciones de estado del partido
// Acciones: start_waiting | team_present | kickoff | declare_walkover | finish | publish
//
// Flujo (aprobado con Simón):
//   PROGRAMADO --start_waiting--> EN_ESPERA --kickoff--> EN_JUEGO --finish--> FINALIZADO --publish--> (bloqueado)
//                                     └--declare_walkover--> FINALIZADO
//
// Penalizaciones por retraso (desde waiting_started_at):
//   0-2 min  → sin penalización (gracia)
//   2-4 min  → W_2MIN: arranca con 1 jugador menos (efecto en cancha, solo se registra)
//   4-6 min  → W_4MIN: arranca con 2 menos y 0-1 en contra (gol automático al rival en el kickoff)
//   6+  min  → W_6MIN: partido perdido 3-0 (vía declare_walkover)

const GRACE_MIN = 2;
const ONE_LESS_MIN = 4;
const AUTO_GOAL_MIN = 6;

type MatchRow = {
  id: number;
  status: string;
  team_a_id: number;
  team_b_id: number;
  waiting_started_at: string | null;
  team_a_present_at: string | null;
  team_b_present_at: string | null;
  published_at: string | null;
  walkover: string | null;
};

async function getMatch(supabase: Db, matchId: number): Promise<MatchRow | null> {
  const { data } = await supabase
    .from("matches")
    .select("id, status, team_a_id, team_b_id, waiting_started_at, team_a_present_at, team_b_present_at, published_at, walkover")
    .eq("id", matchId)
    .maybeSingle();
  return data;
}

// Minutos transcurridos entre dos fechas ISO
function minutesSince(fromIso: string, to: Date = new Date()): number {
  return (to.getTime() - new Date(fromIso).getTime()) / 60000;
}

// Recalcula el marcador desde los eventos GOL (fuente única de verdad)
async function recomputeScore(supabase: Db, matchId: number) {
  const { data: match } = await supabase
    .from("matches")
    .select("team_a_id, team_b_id")
    .eq("id", matchId)
    .single();
  if (!match) return;

  const { data: goals } = await supabase
    .from("match_events")
    .select("team_id")
    .eq("match_id", matchId)
    .eq("type", "GOL");

  const scoreA = (goals ?? []).filter((g) => g.team_id === match.team_a_id).length;
  const scoreB = (goals ?? []).filter((g) => g.team_id === match.team_b_id).length;

  await supabase.from("matches").update({ score_a: scoreA, score_b: scoreB }).eq("id", matchId);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const matchId = Number(id);
  if (Number.isNaN(matchId)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }

  const body = await request.json();
  const action = body.action as string;
  const supabase = getSupabase();
  const match = await getMatch(supabase, matchId);

  if (!match) {
    return Response.json({ error: "Partido no encontrado" }, { status: 404 });
  }
  if (match.published_at) {
    return Response.json(
      { error: "Partido publicado: solo un administrador puede modificarlo" },
      { status: 403 }
    );
  }

  // ── 1. Iniciar modo de espera ──────────────────────────────
  if (action === "start_waiting") {
    if (match.status !== "PROGRAMADO") {
      return Response.json({ error: `No se puede iniciar espera desde estado ${match.status}` }, { status: 409 });
    }
    const { data, error } = await supabase
      .from("matches")
      .update({ status: "EN_ESPERA", waiting_started_at: new Date().toISOString() })
      .eq("id", matchId)
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  }

  // ── 2. Marcar equipo presente (botón con el nombre del equipo) ──
  if (action === "team_present") {
    if (match.status !== "EN_ESPERA" || !match.waiting_started_at) {
      return Response.json({ error: "El partido no está en modo de espera" }, { status: 409 });
    }
    const side = body.team as "A" | "B";
    if (side !== "A" && side !== "B") {
      return Response.json({ error: "team debe ser 'A' o 'B'" }, { status: 400 });
    }

    const now = new Date();
    const delay = minutesSince(match.waiting_started_at, now);
    const teamId = side === "A" ? match.team_a_id : match.team_b_id;
    const presentField = side === "A" ? "team_a_present_at" : "team_b_present_at";

    // Penalización según el minuto de llegada
    let sanctionType: string | null = null;
    if (delay > GRACE_MIN && delay <= ONE_LESS_MIN) sanctionType = "W_2MIN";
    else if (delay > ONE_LESS_MIN && delay <= AUTO_GOAL_MIN) sanctionType = "W_4MIN";
    else if (delay > AUTO_GOAL_MIN) {
      return Response.json(
        { error: "Tolerancia agotada (6 min): usa declare_walkover" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("matches")
      .update({ [presentField]: now.toISOString() })
      .eq("id", matchId)
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });

    if (sanctionType) {
      await supabase.from("sanctions").insert({
        team_id: teamId,
        match_id: matchId,
        type: sanctionType,
        note: `Llegada al minuto ${delay.toFixed(1)} de la espera`,
      });
    }

    return Response.json({ ...data, applied_sanction: sanctionType });
  }

  // ── 3. Kickoff: empieza el partido ─────────────────────────
  if (action === "kickoff") {
    if (match.status !== "EN_ESPERA") {
      return Response.json({ error: "El partido no está en modo de espera" }, { status: 409 });
    }
    if (!match.team_a_present_at || !match.team_b_present_at) {
      return Response.json({ error: "Ambos equipos deben estar presentes" }, { status: 409 });
    }

    // W_4MIN pendientes → gol automático de oficio para el rival (jugador null, minuto 0)
    const { data: w4 } = await supabase
      .from("sanctions")
      .select("team_id")
      .eq("match_id", matchId)
      .eq("type", "W_4MIN");

    for (const s of w4 ?? []) {
      const rivalId = s.team_id === match.team_a_id ? match.team_b_id : match.team_a_id;
      await supabase.from("match_events").insert({
        match_id: matchId,
        team_id: rivalId,
        player_id: null,
        type: "GOL",
        minute: 0,
      });
    }

    const { data, error } = await supabase
      .from("matches")
      .update({ status: "EN_JUEGO", kickoff_at: new Date().toISOString() })
      .eq("id", matchId)
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });

    await recomputeScore(supabase, matchId);
    return Response.json(data);
  }

  // ── 4. Declarar W (tolerancia agotada) ─────────────────────
  if (action === "declare_walkover") {
    if (match.status !== "EN_ESPERA" || !match.waiting_started_at) {
      return Response.json({ error: "El partido no está en modo de espera" }, { status: 409 });
    }
    if (minutesSince(match.waiting_started_at) < AUTO_GOAL_MIN - 0.5) {
      return Response.json({ error: "Aún no se cumple la tolerancia de 6 minutos" }, { status: 409 });
    }

    const aPresent = !!match.team_a_present_at;
    const bPresent = !!match.team_b_present_at;

    if (aPresent && bPresent) {
      return Response.json({ error: "Ambos equipos presentes: no aplica W" }, { status: 409 });
    }

    const now = new Date().toISOString();

    // Doble W: nadie llegó → sin goles ni puntos para ninguno
    if (!aPresent && !bPresent) {
      const { data, error } = await supabase
        .from("matches")
        .update({ status: "FINALIZADO", walkover: "DOBLE", finished_at: now })
        .eq("id", matchId)
        .select()
        .single();
      if (error) return Response.json({ error: error.message }, { status: 500 });

      await supabase.from("sanctions").insert([
        { team_id: match.team_a_id, match_id: matchId, type: "W_6MIN", note: "Doble W: no se presentó" },
        { team_id: match.team_b_id, match_id: matchId, type: "W_6MIN", note: "Doble W: no se presentó" },
      ]);
      return Response.json(data);
    }

    // W simple: el ausente pierde 3-0
    const absentSide = aPresent ? "B" : "A";
    const absentTeamId = absentSide === "A" ? match.team_a_id : match.team_b_id;

    const { data, error } = await supabase
      .from("matches")
      .update({
        status: "FINALIZADO",
        walkover: absentSide,
        finished_at: now,
        score_a: absentSide === "A" ? 0 : 3,
        score_b: absentSide === "B" ? 0 : 3,
      })
      .eq("id", matchId)
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });

    await supabase.from("sanctions").insert({
      team_id: absentTeamId,
      match_id: matchId,
      type: "W_6MIN",
      note: "No se presentó en los 6 minutos de tolerancia",
    });
    return Response.json(data);
  }

  // ── 5. Finalizar (pitazo final) ─────────────────────────────
  if (action === "finish") {
    if (match.status !== "EN_JUEGO") {
      return Response.json({ error: "El partido no está en juego" }, { status: 409 });
    }
    const extra = Number(body.extraTimeMin ?? 0) || 0;
    await recomputeScore(supabase, matchId);
    const { data, error } = await supabase
      .from("matches")
      .update({ status: "FINALIZADO", finished_at: new Date().toISOString(), extra_time_min: extra })
      .eq("id", matchId)
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  }

  // ── 6. Publicar acta (bloquea la edición del supervisor) ───
  if (action === "publish") {
    if (match.status !== "FINALIZADO") {
      return Response.json({ error: "Solo se publica un partido finalizado" }, { status: 409 });
    }
    const { data, error } = await supabase
      .from("matches")
      .update({ published_at: new Date().toISOString() })
      .eq("id", matchId)
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  }

  return Response.json({ error: `Acción desconocida: ${action}` }, { status: 400 });
}

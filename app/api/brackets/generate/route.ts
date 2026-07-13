import { getSupabase } from "@/lib/supabase";
import { requireRole, isAuthError } from "@/lib/auth";

// POST /api/brackets/generate → crea los cruces de la fase eliminatoria.
// Body: { stage: "CUARTOS" | "SEMIFINAL" | "FINAL", day?, startTime?, utcOffset?, fieldFinal? }
//
// Reglas del torneo (16 equipos, clasifican 2 por grupo):
//   CUARTOS (2 canchas en simultáneo):
//     Cancha 1: Q1 = 1A vs 2B, luego Q2 = 1B vs 2A
//     Cancha 2: Q3 = 1C vs 2D, luego Q4 = 1D vs 2C
//   SEMIFINAL (1 cancha, secuencial):
//     S1 = ganador Q1 vs ganador Q2 · S2 = ganador Q3 vs ganador Q4
//   FINAL (1 cancha, partido de 1 hora):
//     ganador S1 vs ganador S2

type MatchRow = {
  id: number;
  team_a_id: number;
  team_b_id: number;
  score_a: number | null;
  score_b: number | null;
  penalty_a: number | null;
  penalty_b: number | null;
  status: string;
  walkover: string | null;
};

// Ganador de un partido eliminatorio (marcador → penales → walkover)
function winnerOf(m: MatchRow): number | null {
  if (m.walkover === "A") return m.team_b_id; // el ausente pierde
  if (m.walkover === "B") return m.team_a_id;
  if (m.score_a === null || m.score_b === null) return null;
  if (m.score_a > m.score_b) return m.team_a_id;
  if (m.score_b > m.score_a) return m.team_b_id;
  const pa = m.penalty_a ?? -1;
  const pb = m.penalty_b ?? -1;
  if (pa > pb) return m.team_a_id;
  if (pb > pa) return m.team_b_id;
  return null; // empate sin penales registrados
}

export async function POST(request: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (isAuthError(auth)) return auth;

  const supabase = getSupabase();
  const body = await request.json().catch(() => ({}));
  const stage = body.stage as string;

  const day = body.day ?? new Date().toISOString().slice(0, 10);
  const startTime = body.startTime ?? "12:00";
  const utcOffset = body.utcOffset ?? "-05:00";
  const base = new Date(`${day}T${startTime}:00${utcOffset}`);
  const SLOT = 30 * 60000; // 26 min + 4 de rotación

  if (Number.isNaN(base.getTime())) {
    return Response.json({ error: "day/startTime/utcOffset inválidos" }, { status: 400 });
  }

  // Guardia: la etapa no debe existir ya
  const { data: existing } = await supabase
    .from("matches").select("id").eq("phase", stage).limit(1);
  if (existing && existing.length > 0) {
    return Response.json({ error: `Ya existen partidos de ${stage}` }, { status: 409 });
  }

  // ── CUARTOS: desde la tabla de posiciones de grupos ──
  if (stage === "CUARTOS") {
    const { data: pending } = await supabase
      .from("matches").select("id").eq("phase", "GRUPOS").neq("status", "FINALIZADO").limit(1);
    if (pending && pending.length > 0) {
      return Response.json(
        { error: "Aún hay partidos de grupos sin finalizar" }, { status: 409 });
    }

    const { data: groups, error: gErr } = await supabase
      .from("groups").select("id, name, teams(id, name)").order("name");
    if (gErr) return Response.json({ error: gErr.message }, { status: 500 });

    const { data: played, error: mErr } = await supabase
      .from("matches").select("*").eq("phase", "GRUPOS").eq("status", "FINALIZADO");
    if (mErr) return Response.json({ error: mErr.message }, { status: 500 });

    // Top 2 de cada grupo con la regla: puntos → dif. de gol → goles a favor
    const topTwo: Record<string, number[]> = {};
    for (const group of groups ?? []) {
      const rows = (group.teams as Array<{ id: number }>).map((team) => {
        let pj = 0, gf = 0, gc = 0, pts = 0;
        for (const m of played ?? []) {
          if (m.walkover === "DOBLE") continue;
          let f: number | null = null, c: number | null = null;
          if (m.team_a_id === team.id) { f = m.score_a; c = m.score_b; }
          else if (m.team_b_id === team.id) { f = m.score_b; c = m.score_a; }
          if (f === null || c === null) continue;
          pj++; gf += f; gc += c;
          pts += f > c ? 3 : f === c ? 1 : 0;
        }
        return { id: team.id, pj, gf, gc, dg: gf - gc, pts };
      });
      rows.sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);
      topTwo[group.name] = rows.slice(0, 2).map((r) => r.id);
    }

    for (const g of ["A", "B", "C", "D"]) {
      if (!topTwo[g] || topTwo[g].length < 2) {
        return Response.json(
          { error: `El grupo ${g} no tiene 2 clasificados` }, { status: 409 });
      }
    }

    const [A1, A2] = topTwo["A"];
    const [B1, B2] = topTwo["B"];
    const [C1, C2] = topTwo["C"];
    const [D1, D2] = topTwo["D"];

    const rows = [
      { field_number: 1, slot: 0, team_a_id: A1, team_b_id: B2 }, // Q1: 1A vs 2B
      { field_number: 1, slot: 1, team_a_id: B1, team_b_id: A2 }, // Q2: 1B vs 2A
      { field_number: 2, slot: 0, team_a_id: C1, team_b_id: D2 }, // Q3: 1C vs 2D
      { field_number: 2, slot: 1, team_a_id: D1, team_b_id: C2 }, // Q4: 1D vs 2C
    ].map((q) => ({
      phase: "CUARTOS",
      status: "PROGRAMADO",
      field_number: q.field_number,
      scheduled_at: new Date(base.getTime() + q.slot * SLOT).toISOString(),
      team_a_id: q.team_a_id,
      team_b_id: q.team_b_id,
    }));

    const { error } = await supabase.from("matches").insert(rows);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ stage, created: rows.length }, { status: 201 });
  }

  // ── SEMIFINAL y FINAL: desde los ganadores de la etapa anterior ──
  if (stage === "SEMIFINAL" || stage === "FINAL") {
    const prevPhase = stage === "SEMIFINAL" ? "CUARTOS" : "SEMIFINAL";
    const { data: prev, error } = await supabase
      .from("matches").select("*").eq("phase", prevPhase).order("id");
    if (error) return Response.json({ error: error.message }, { status: 500 });

    const needed = stage === "SEMIFINAL" ? 4 : 2;
    if (!prev || prev.length < needed) {
      return Response.json({ error: `Faltan partidos de ${prevPhase}` }, { status: 409 });
    }

    const winners = prev.map((m) => winnerOf(m as MatchRow));
    if (winners.some((w) => w === null)) {
      return Response.json(
        { error: `Hay partidos de ${prevPhase} sin ganador definido (¿faltan penales?)` },
        { status: 409 });
    }

    const fieldFinal = body.fieldFinal ?? 1;
    const rows =
      stage === "SEMIFINAL"
        ? [
            { team_a_id: winners[0]!, team_b_id: winners[1]!, slot: 0 }, // S1
            { team_a_id: winners[2]!, team_b_id: winners[3]!, slot: 1 }, // S2
          ].map((s) => ({
            phase: "SEMIFINAL",
            status: "PROGRAMADO",
            field_number: 1,
            scheduled_at: new Date(base.getTime() + s.slot * SLOT).toISOString(),
            team_a_id: s.team_a_id,
            team_b_id: s.team_b_id,
          }))
        : [
            {
              phase: "FINAL",
              status: "PROGRAMADO",
              field_number: fieldFinal, // posible cancha de fútbol 7
              scheduled_at: base.toISOString(),
              team_a_id: winners[0]!,
              team_b_id: winners[1]!,
            },
          ];

    const { error: insErr } = await supabase.from("matches").insert(rows);
    if (insErr) return Response.json({ error: insErr.message }, { status: 500 });
    return Response.json({ stage, created: rows.length }, { status: 201 });
  }

  return Response.json({ error: "stage debe ser CUARTOS, SEMIFINAL o FINAL" }, { status: 400 });
}

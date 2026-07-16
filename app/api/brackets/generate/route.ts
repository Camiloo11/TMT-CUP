import { getSupabase } from "@/lib/supabase";
import { requireRole, isAuthError } from "@/lib/auth";

// POST /api/brackets/generate → arma la fase final SEGÚN el formato real:
//
//   Body: { stage: "SEMIFINAL" | "FINAL", category: "MASCULINO" | "FEMENINO",
//           day?, startTime?, utcOffset?, field?, fieldFinal? }
//
//   MASCULINO (3 grupos A/B/C de 4):
//     SEMIFINAL: SF1 = 1°A vs mejor 2° (entre 2°A/2°B/2°C) · SF2 = 1°B vs 1°C
//     FINAL:     ganador SF1 vs ganador SF2
//   FEMENINO (1 grupo F de 4):
//     SEMIFINAL: SF1 = 1° vs 4° · SF2 = 2° vs 3°
//     FINAL:     ganador SF1 vs ganador SF2
//
// Los partidos no guardan categoría: se deduce por la categoría de los equipos.

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
  return null; // empate sin penales
}

type GroupMatch = {
  team_a_id: number;
  team_b_id: number;
  score_a: number | null;
  score_b: number | null;
  walkover: string | null;
};

// Tabla de posiciones de un grupo (puntos → dif. de gol → goles a favor)
function standings(teamIds: number[], matches: GroupMatch[]) {
  const rows = teamIds.map((id) => {
    let pts = 0, gf = 0, gc = 0;
    for (const m of matches) {
      if (m.walkover === "DOBLE") continue;
      let f: number | null = null, c: number | null = null;
      if (m.team_a_id === id) { f = m.score_a; c = m.score_b; }
      else if (m.team_b_id === id) { f = m.score_b; c = m.score_a; }
      if (f === null || c === null) continue;
      gf += f; gc += c;
      pts += f > c ? 3 : f === c ? 1 : 0;
    }
    return { id, pts, dg: gf - gc, gf };
  });
  rows.sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);
  return rows;
}

export async function POST(request: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (isAuthError(auth)) return auth;

  const supabase = getSupabase();
  const body = await request.json().catch(() => ({}));
  const stage = body.stage as string;
  const category = body.category as string;

  if (stage !== "SEMIFINAL" && stage !== "FINAL") {
    return Response.json({ error: "stage debe ser SEMIFINAL o FINAL" }, { status: 400 });
  }
  if (category !== "MASCULINO" && category !== "FEMENINO") {
    return Response.json({ error: "category debe ser MASCULINO o FEMENINO" }, { status: 400 });
  }

  const utcOffset = body.utcOffset ?? "-05:00";
  const SLOT = 30 * 60000; // 26 min de juego + 4 de rotación

  // Equipos de la categoría (con su grupo) → mapa id→categoría para filtrar
  const { data: teams, error: tErr } = await supabase
    .from("teams")
    .select("id, group_id, category, group:groups(name)")
    .eq("category", category);
  if (tErr) return Response.json({ error: tErr.message }, { status: 500 });
  if (!teams || teams.length === 0) {
    return Response.json({ error: `No hay equipos ${category}` }, { status: 409 });
  }
  const teamIds = new Set(teams.map((t) => t.id));

  // Día por defecto: el mismo de los partidos ya programados (zona Bogotá)
  const { data: anyMatch } = await supabase
    .from("matches").select("scheduled_at").order("scheduled_at").limit(1).maybeSingle();
  const defaultDay = anyMatch
    ? new Date(anyMatch.scheduled_at).toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
    : new Date().toISOString().slice(0, 10);
  const day = body.day ?? defaultDay;

  // Guardia: no duplicar esta etapa para esta categoría.
  const { data: stageMatches } = await supabase
    .from("matches")
    .select("id, team_a_id")
    .eq("phase", stage);
  const already = (stageMatches ?? []).some((m) => teamIds.has(m.team_a_id));
  if (already) {
    return Response.json({ error: `Ya existe ${stage} de ${category}` }, { status: 409 });
  }

  // ── SEMIFINALES ──────────────────────────────────────────────
  if (stage === "SEMIFINAL") {
    const startTime = body.startTime ?? "17:00";
    const base = new Date(`${day}T${startTime}:00${utcOffset}`);
    if (Number.isNaN(base.getTime())) {
      return Response.json({ error: "day/startTime/utcOffset inválidos" }, { status: 400 });
    }
    const field = Number(body.field ?? (category === "FEMENINO" ? 4 : 1));

    // Todos los partidos de grupos de la categoría deben estar FINALIZADO
    const { data: groupMatches, error: gmErr } = await supabase
      .from("matches")
      .select("team_a_id, team_b_id, score_a, score_b, walkover, status")
      .eq("phase", "GRUPOS");
    if (gmErr) return Response.json({ error: gmErr.message }, { status: 500 });
    const ours = (groupMatches ?? []).filter((m) => teamIds.has(m.team_a_id) || teamIds.has(m.team_b_id));
    if (ours.length === 0) {
      return Response.json({ error: `No hay partidos de grupos de ${category}` }, { status: 409 });
    }
    if (ours.some((m) => m.status !== "FINALIZADO")) {
      return Response.json({ error: `Aún hay partidos de grupos de ${category} sin finalizar` }, { status: 409 });
    }

    // Equipos agrupados por nombre de grupo
    const byGroup = new Map<string, number[]>();
    for (const t of teams) {
      const gname = (t.group as unknown as { name: string } | null)?.name ?? "?";
      byGroup.set(gname, [...(byGroup.get(gname) ?? []), t.id]);
    }

    let pairs: Array<[number, number]>;

    if (category === "FEMENINO") {
      // Un solo grupo de 4 → 1° vs 4°, 2° vs 3°
      const only = [...byGroup.values()][0] ?? [];
      const tbl = standings(only, ours);
      if (tbl.length < 4) {
        return Response.json({ error: "El grupo femenino no tiene 4 equipos" }, { status: 409 });
      }
      pairs = [
        [tbl[0].id, tbl[3].id], // SF1: 1° vs 4°
        [tbl[1].id, tbl[2].id], // SF2: 2° vs 3°
      ];
    } else {
      // 3 grupos A/B/C → ganadores + mejor 2°
      const A = byGroup.get("A") ?? [], B = byGroup.get("B") ?? [], C = byGroup.get("C") ?? [];
      if (A.length < 2 || B.length < 2 || C.length < 2) {
        return Response.json({ error: "Faltan equipos en los grupos A/B/C" }, { status: 409 });
      }
      const tA = standings(A, ours), tB = standings(B, ours), tC = standings(C, ours);
      // Mejor 2° entre los tres segundos (puntos → dif → goles a favor)
      const runnersUp = [tA[1], tB[1], tC[1]].sort(
        (a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf,
      );
      const bestRunnerUp = runnersUp[0];
      pairs = [
        [tA[0].id, bestRunnerUp.id], // SF1: 1°A vs mejor 2°
        [tB[0].id, tC[0].id],        // SF2: 1°B vs 1°C
      ];
    }

    const rows = pairs.map(([a, b], slot) => ({
      phase: "SEMIFINAL",
      status: "PROGRAMADO",
      field_number: field,
      scheduled_at: new Date(base.getTime() + slot * SLOT).toISOString(),
      team_a_id: a,
      team_b_id: b,
    }));
    const { error } = await supabase.from("matches").insert(rows);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ stage, category, created: rows.length }, { status: 201 });
  }

  // ── FINAL ────────────────────────────────────────────────────
  const startTime = body.startTime ?? "18:05";
  const base = new Date(`${day}T${startTime}:00${utcOffset}`);
  if (Number.isNaN(base.getTime())) {
    return Response.json({ error: "day/startTime/utcOffset inválidos" }, { status: 400 });
  }
  const fieldFinal = Number(body.fieldFinal ?? body.field ?? (category === "FEMENINO" ? 4 : 5));

  // Semifinales de esta categoría (se filtran por los equipos de la categoría)
  const { data: semis, error: sErr } = await supabase
    .from("matches").select("*").eq("phase", "SEMIFINAL").order("id");
  if (sErr) return Response.json({ error: sErr.message }, { status: 500 });
  const ourSemis = (semis ?? []).filter((m) => teamIds.has(m.team_a_id));
  if (ourSemis.length < 2) {
    return Response.json({ error: `Faltan semifinales de ${category}` }, { status: 409 });
  }

  const winners = ourSemis.map((m) => winnerOf(m as MatchRow));
  if (winners.some((w) => w === null)) {
    return Response.json(
      { error: `Hay semifinales de ${category} sin ganador definido (¿faltan penales?)` },
      { status: 409 },
    );
  }

  const { error: insErr } = await supabase.from("matches").insert({
    phase: "FINAL",
    status: "PROGRAMADO",
    field_number: fieldFinal,
    scheduled_at: base.toISOString(),
    team_a_id: winners[0]!,
    team_b_id: winners[1]!,
  });
  if (insErr) return Response.json({ error: insErr.message }, { status: 500 });
  return Response.json({ stage, category, created: 1 }, { status: 201 });
}

import { getSupabase } from "@/lib/supabase";

// Lógica de avance del torneo (formato real, aprobado en el Excel):
//   MASCULINO (3 grupos A/B/C): SF1 = 1°A vs mejor 2° · SF2 = 1°B vs 1°C
//   FEMENINO (1 grupo de 4):    SF1 = 1° vs 4°        · SF2 = 2° vs 3°
//   FINAL = ganador SF1 vs ganador SF2 (por categoría)
//
// La fase final existe desde el seed como placeholders (equipos null).
// Cuando el último partido de grupos de una categoría queda FINALIZADO,
// las semifinales se llenan solas; cuando ambas semis terminan, la final.

type Db = ReturnType<typeof getSupabase>;

export type ScoredMatch = {
  team_a_id: number | null;
  team_b_id: number | null;
  score_a: number | null;
  score_b: number | null;
  walkover: string | null;
};

export type KnockoutMatch = ScoredMatch & {
  penalty_a: number | null;
  penalty_b: number | null;
};

// Tabla de posiciones: puntos → diferencia de gol → goles a favor
export function standings(teamIds: number[], matches: ScoredMatch[]) {
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

// Ganador de un partido eliminatorio (marcador → penales → walkover)
export function winnerOf(m: KnockoutMatch): number | null {
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

// Se llama tras cada cierre de partido. Nunca lanza: el avance automático
// jamás debe tumbar la acción del supervisor que lo disparó.
export async function maybeAdvancePhase(supabase: Db, matchId: number): Promise<void> {
  try {
    const { data: match } = await supabase
      .from("matches")
      .select("id, phase, status, team_a_id")
      .eq("id", matchId)
      .maybeSingle();
    if (!match || match.status !== "FINALIZADO") return;
    if (match.phase !== "GRUPOS" && match.phase !== "SEMIFINAL") return;

    // Categoría del partido, vía su equipo A (los placeholders nunca llegan
    // aquí porque para estar FINALIZADO ya tienen equipos asignados)
    if (!match.team_a_id) return;
    const { data: teamA } = await supabase
      .from("teams").select("category").eq("id", match.team_a_id).maybeSingle();
    const category = teamA?.category as "MASCULINO" | "FEMENINO" | undefined;
    if (!category) return;

    // Equipos de la categoría, con su grupo
    const { data: teams } = await supabase
      .from("teams")
      .select("id, category, group:groups(name)")
      .eq("category", category);
    if (!teams || teams.length === 0) return;
    const teamIds = new Set(teams.map((t) => t.id));

    if (match.phase === "GRUPOS") {
      // ¿Terminaron TODOS los grupos de esta categoría?
      const { data: groupMatches } = await supabase
        .from("matches")
        .select("team_a_id, team_b_id, score_a, score_b, walkover, status")
        .eq("phase", "GRUPOS");
      const ours = (groupMatches ?? []).filter(
        (m) => m.team_a_id !== null && teamIds.has(m.team_a_id),
      );
      if (ours.length === 0 || ours.some((m) => m.status !== "FINALIZADO")) return;

      // Placeholders de semifinal pendientes (en orden de horario: SF1, SF2)
      const { data: slots } = await supabase
        .from("matches")
        .select("id")
        .eq("phase", "SEMIFINAL")
        .eq("category", category)
        .is("team_a_id", null)
        .order("scheduled_at");
      if (!slots || slots.length < 2) return; // ya llenas o sin placeholders

      const byGroup = new Map<string, number[]>();
      for (const t of teams) {
        const gname = (t.group as unknown as { name: string } | null)?.name ?? "?";
        byGroup.set(gname, [...(byGroup.get(gname) ?? []), t.id]);
      }

      let pairs: Array<[number, number]>;
      if (category === "FEMENINO") {
        const only = [...byGroup.values()].find((g) => g.length >= 4) ?? [];
        const tbl = standings(only, ours);
        if (tbl.length < 4) return;
        pairs = [
          [tbl[0].id, tbl[3].id], // SF1: 1° vs 4°
          [tbl[1].id, tbl[2].id], // SF2: 2° vs 3°
        ];
      } else {
        const A = byGroup.get("A") ?? [], B = byGroup.get("B") ?? [], C = byGroup.get("C") ?? [];
        if (A.length < 2 || B.length < 2 || C.length < 2) return;
        const tA = standings(A, ours), tB = standings(B, ours), tC = standings(C, ours);
        const runnersUp = [tA[1], tB[1], tC[1]].sort(
          (a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf,
        );
        pairs = [
          [tA[0].id, runnersUp[0].id], // SF1: 1°A vs mejor 2°
          [tB[0].id, tC[0].id],        // SF2: 1°B vs 1°C
        ];
      }

      for (let i = 0; i < 2; i++) {
        await supabase
          .from("matches")
          .update({ team_a_id: pairs[i][0], team_b_id: pairs[i][1] })
          .eq("id", slots[i].id)
          .is("team_a_id", null); // no pisar si otra petición ya la llenó
      }
      return;
    }

    // match.phase === "SEMIFINAL": ¿ya hay ganadores de ambas semis?
    const { data: semis } = await supabase
      .from("matches")
      .select("team_a_id, team_b_id, score_a, score_b, penalty_a, penalty_b, walkover, status")
      .eq("phase", "SEMIFINAL")
      .order("scheduled_at");
    const ourSemis = (semis ?? []).filter(
      (m) => m.team_a_id !== null && teamIds.has(m.team_a_id),
    );
    if (ourSemis.length < 2 || ourSemis.some((m) => m.status !== "FINALIZADO")) return;

    const winners = ourSemis.map((m) => winnerOf(m as KnockoutMatch));
    if (winners.some((w) => w === null)) return; // falta desempate (penales)

    const { data: finalSlot } = await supabase
      .from("matches")
      .select("id")
      .eq("phase", "FINAL")
      .eq("category", category)
      .is("team_a_id", null)
      .maybeSingle();
    if (!finalSlot) return;

    await supabase
      .from("matches")
      .update({ team_a_id: winners[0], team_b_id: winners[1] })
      .eq("id", finalSlot.id)
      .is("team_a_id", null);
  } catch (err) {
    console.error("maybeAdvancePhase: avance automático falló (no bloquea el acta):", err);
  }
}

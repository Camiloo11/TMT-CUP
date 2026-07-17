import { getSupabase } from "@/lib/supabase";

type Db = ReturnType<typeof getSupabase>;

// ── Reglas de sanción (acordadas con Camilo) ─────────────────────────
//  • ROJA  → el jugador se pierde el SIGUIENTE partido de su equipo.
//            Las rojas NO se reinician: valen en cualquier fase (una roja
//            en el último partido de grupos hace perder la primera semifinal).
//  • AMARILLA → se acumulan. Cada 2 amarillas acumuladas = 1 fecha de
//            suspensión (se sirve en el siguiente partido). Ej: amarilla en
//            el partido 1 y otra en el 2 → se pierde el partido 3.
//  • Las AMARILLAS acumuladas se REINICIAN al llegar a la fase final
//            (semifinal): lo de grupos no se arrastra a semis.
//
// La suspensión se "sirve" en el partido inmediatamente siguiente del
// equipo (esté jugado o no); no se arrastra más allá de esa fecha.

export type TeamMatch = { id: number; phase: string; status: string; scheduled_at: string };
type CardRow = { match_id: number; player_id: number | null; type: string };

// ── Núcleo PURO (sin DB, testeable) ──────────────────────────────────
// Dada la agenda ordenada de un equipo y sus tarjetas por partido, calcula
// qué jugadores llegan suspendidos al partido `targetMatchId`.
export function computeBansForTeam(
  matches: TeamMatch[], // ordenados por scheduled_at asc
  cardsByMatch: Map<number, Map<number, { y: number; r: number }>>,
  targetMatchId: number
): Set<number> {
  const yellowCount = new Map<number, number>(); // amarillas acumuladas (fase actual)
  let pendingRed = new Set<number>();    // se pierden el próximo partido por roja
  let pendingYellow = new Set<number>(); // se pierden el próximo partido por 2 amarillas
  let knockoutReset = false;

  for (const m of matches) {
    // Al entrar a fase final (todo lo que no sea grupos), las amarillas se
    // reinician; las rojas pendientes SÍ se arrastran (permanecen).
    if (m.phase !== "GRUPOS" && !knockoutReset) {
      knockoutReset = true;
      yellowCount.clear();
      pendingYellow = new Set();
    }

    // Las suspensiones pendientes aplican a ESTE partido
    if (m.id === targetMatchId) {
      return new Set<number>([...pendingRed, ...pendingYellow]);
    }

    // Este partido "consume" las suspensiones pendientes (se sirven aquí) y
    // genera nuevas para el siguiente, solo si ya se jugó (FINALIZADO).
    const nextRed = new Set<number>();
    const nextYellow = new Set<number>();
    if (m.status === "FINALIZADO") {
      const perPlayer = cardsByMatch.get(m.id);
      if (perPlayer) {
        for (const [pid, { y, r }] of perPlayer) {
          if (r > 0) nextRed.add(pid);
          if (y > 0) {
            let total = (yellowCount.get(pid) ?? 0) + y;
            while (total >= 2) {
              nextYellow.add(pid); // cada par de amarillas = 1 fecha
              total -= 2;
            }
            yellowCount.set(pid, total);
          }
        }
      }
    }
    pendingRed = nextRed;
    pendingYellow = nextYellow;
  }

  // targetMatch no está en la agenda del equipo: sin suspensión aplicable
  return new Set<number>([...pendingRed, ...pendingYellow]);
}

// Suspensiones (player_id) que aplican al partido `targetMatch` para un equipo.
async function suspendedForTeamAt(
  supabase: Db,
  teamId: number,
  targetMatchId: number
): Promise<Set<number>> {
  const { data: teamMatches } = await supabase
    .from("matches")
    .select("id, phase, status, scheduled_at")
    .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
    .order("scheduled_at", { ascending: true });

  const matches = (teamMatches ?? []) as TeamMatch[];
  if (matches.length === 0) return new Set();

  const ids = matches.map((m) => m.id);
  const { data: cardRows } = await supabase
    .from("match_events")
    .select("match_id, player_id, type")
    .eq("team_id", teamId)
    .in("match_id", ids)
    .in("type", ["AMARILLA", "ROJA"]);

  // match_id → player_id → { amarillas, rojas }
  const byMatch = new Map<number, Map<number, { y: number; r: number }>>();
  for (const c of (cardRows ?? []) as CardRow[]) {
    if (c.player_id == null) continue;
    if (!byMatch.has(c.match_id)) byMatch.set(c.match_id, new Map());
    const perPlayer = byMatch.get(c.match_id)!;
    const cur = perPlayer.get(c.player_id) ?? { y: 0, r: 0 };
    if (c.type === "AMARILLA") cur.y += 1;
    else cur.r += 1;
    perPlayer.set(c.player_id, cur);
  }

  return computeBansForTeam(matches, byMatch, targetMatchId);
}

// Conjunto de jugadores suspendidos para un partido (ambos equipos).
export async function computeSuspendedForMatch(
  supabase: Db,
  matchId: number
): Promise<Set<number>> {
  const { data: match } = await supabase
    .from("matches")
    .select("id, team_a_id, team_b_id")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return new Set();

  const suspended = new Set<number>();
  for (const teamId of [match.team_a_id, match.team_b_id]) {
    if (teamId == null) continue;
    const banned = await suspendedForTeamAt(supabase, teamId, matchId);
    banned.forEach((p) => suspended.add(p));
  }
  return suspended;
}

// ¿Un jugador puntual está suspendido para este partido?
export async function isPlayerSuspended(
  supabase: Db,
  matchId: number,
  playerId: number
): Promise<boolean> {
  const suspended = await computeSuspendedForMatch(supabase, matchId);
  return suspended.has(playerId);
}

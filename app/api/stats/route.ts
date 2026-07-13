import { getSupabase } from "@/lib/supabase";

// GET /api/stats → estadísticas generales del torneo:
//   goleadores (Bota de Oro), jugadores con más tarjetas y valla menos vencida.
// Todo se calcula desde los eventos y partidos (fuente única de verdad).
export async function GET() {
  const supabase = getSupabase();

  // ── Eventos con jugador y equipo (goles y tarjetas) ──
  const { data: events, error: evErr } = await supabase
    .from("match_events")
    .select("type, player:players(id, name), team:teams(id, name)")
    .not("player_id", "is", null);
  if (evErr) return Response.json({ error: evErr.message }, { status: 500 });

  type PlayerStat = {
    playerId: number;
    player: string;
    team: string;
    goles: number;
    amarillas: number;
    rojas: number;
  };
  const byPlayer = new Map<number, PlayerStat>();

  for (const e of events ?? []) {
    const player = e.player as unknown as { id: number; name: string } | null;
    const team = e.team as unknown as { id: number; name: string } | null;
    if (!player) continue;

    const stat = byPlayer.get(player.id) ?? {
      playerId: player.id,
      player: player.name,
      team: team?.name ?? "",
      goles: 0,
      amarillas: 0,
      rojas: 0,
    };
    if (e.type === "GOL") stat.goles++;
    else if (e.type === "AMARILLA") stat.amarillas++;
    else if (e.type === "ROJA") stat.rojas++;
    byPlayer.set(player.id, stat);
  }

  const all = [...byPlayer.values()];
  const goleadores = all
    .filter((s) => s.goles > 0)
    .sort((a, b) => b.goles - a.goles)
    .slice(0, 10);
  const tarjetas = all
    .filter((s) => s.amarillas + s.rojas > 0)
    .sort((a, b) => b.rojas - a.rojas || b.amarillas - a.amarillas)
    .slice(0, 10);

  // ── Valla menos vencida: goles en contra en partidos finalizados ──
  const { data: matches, error: mErr } = await supabase
    .from("matches")
    .select("team_a_id, team_b_id, score_a, score_b, walkover")
    .eq("status", "FINALIZADO");
  if (mErr) return Response.json({ error: mErr.message }, { status: 500 });

  const { data: teams, error: tErr } = await supabase.from("teams").select("id, name");
  if (tErr) return Response.json({ error: tErr.message }, { status: 500 });

  const concede = new Map<number, { pj: number; gc: number }>();
  for (const m of matches ?? []) {
    if (m.walkover === "DOBLE" || m.score_a === null || m.score_b === null) continue;
    const a = concede.get(m.team_a_id) ?? { pj: 0, gc: 0 };
    a.pj++; a.gc += m.score_b;
    concede.set(m.team_a_id, a);
    const b = concede.get(m.team_b_id) ?? { pj: 0, gc: 0 };
    b.pj++; b.gc += m.score_a;
    concede.set(m.team_b_id, b);
  }

  const valla = [...concede.entries()]
    .map(([teamId, v]) => ({
      teamId,
      team: (teams ?? []).find((t) => t.id === teamId)?.name ?? "",
      pj: v.pj,
      gc: v.gc,
    }))
    .sort((a, b) => a.gc - b.gc || b.pj - a.pj)
    .slice(0, 10);

  return Response.json({ goleadores, tarjetas, valla });
}

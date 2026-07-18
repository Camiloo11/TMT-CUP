import { getSupabase } from "@/lib/supabase";

// GET /api/brackets → la fase eliminatoria lista para pintar:
// semifinales y final de CADA categoría, con marcadores, penales, banderas
// y estado. Los equipos "por definir" llegan con nombre null: el frontend
// los rotula como "Semifinalista N" / "Finalista N".
export async function GET() {
  const supabase = getSupabase();

  const { data: matches, error } = await supabase
    .from("matches")
    // (*) en los equipos: incluye flag si la columna ya existe, pero NO rompe
    // el endpoint si todavía no se ha corrido el SQL que agrega teams.flag.
    .select(
      "*, teamA:teams!matches_team_a_id_fkey(*), teamB:teams!matches_team_b_id_fkey(*)"
    )
    .in("phase", ["CUARTOS", "SEMIFINAL", "FINAL"])
    .order("scheduled_at")
    .order("id");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  type Row = (typeof matches extends Array<infer T> ? T : never) & {
    category: string | null;
    teamA: { name: string; flag: string | null } | null;
    teamB: { name: string; flag: string | null } | null;
  };

  const toCard = (m: Row) => ({
    id: m.id,
    category: m.category ?? null,
    phase: m.phase as "CUARTOS" | "SEMIFINAL" | "FINAL",
    fecha: new Date(m.scheduled_at).toLocaleString("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    estado:
      m.status === "FINALIZADO" ? ("FIN" as const)
      : m.status === "PROGRAMADO" ? ("PROXIMO" as const)
      : ("VIVO" as const),
    // nombre null = equipo por definir → el frontend pone "Semifinalista N"
    equipoLocal: m.teamA?.name ?? null,
    flagLocal: m.teamA?.flag ?? null,
    golesLocal: m.score_a ?? undefined,
    penalesLocal: m.penalty_a ?? undefined,
    equipoVisita: m.teamB?.name ?? null,
    flagVisita: m.teamB?.flag ?? null,
    golesVisita: m.score_b ?? undefined,
    penalesVisita: m.penalty_b ?? undefined,
    cancha: `Cancha ${m.field_number}`,
  });

  const cards = (matches ?? []).map((m) => toCard(m as Row));
  const byPhase = (phase: string) => cards.filter((c) => c.phase === phase);

  return Response.json({
    cuartos: byPhase("CUARTOS"),
    semifinales: byPhase("SEMIFINAL"),
    finales: byPhase("FINAL"),
  });
}

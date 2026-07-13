import { getSupabase } from "@/lib/supabase";

// GET /api/brackets → la fase eliminatoria lista para pintar:
// cuartos, semifinales y final con marcadores, penales y estado.
// El formato calza con el componente FaseEliminatoria del frontend.
export async function GET() {
  const supabase = getSupabase();

  const { data: matches, error } = await supabase
    .from("matches")
    .select(
      "*, teamA:teams!matches_team_a_id_fkey(id, name), teamB:teams!matches_team_b_id_fkey(id, name)"
    )
    .in("phase", ["CUARTOS", "SEMIFINAL", "FINAL"])
    .order("id");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  type Row = (typeof matches extends Array<infer T> ? T : never) & {
    teamA: { name: string } | null;
    teamB: { name: string } | null;
  };

  const toCard = (m: Row) => ({
    id: m.id,
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
    equipoLocal: m.teamA?.name ?? "Por definir",
    golesLocal: m.score_a ?? undefined,
    penalesLocal: m.penalty_a ?? undefined,
    equipoVisita: m.teamB?.name ?? "Por definir",
    golesVisita: m.score_b ?? undefined,
    penalesVisita: m.penalty_b ?? undefined,
    cancha: `Cancha ${m.field_number}`,
  });

  const byPhase = (phase: string) =>
    (matches ?? []).filter((m) => m.phase === phase).map((m) => toCard(m as Row));

  return Response.json({
    cuartos: byPhase("CUARTOS"),
    semifinales: byPhase("SEMIFINAL"),
    final: byPhase("FINAL")[0] ?? null,
  });
}

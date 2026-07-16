import { getSupabase } from "@/lib/supabase";

// GET /api/agenda            → asignaciones del día (para "selecciona tu perfil")
// GET /api/agenda?field=1    → asignación + partidos del día de esa cancha
export async function GET(request: Request) {
  const supabase = getSupabase();
  const url = new URL(request.url);
  const field = url.searchParams.get("field");
  // "Hoy" en hora de Bogotá (con UTC, después de las 7 PM la agenda
  // saltaba al día siguiente y se vaciaba en plena premiación)
  const day =
    url.searchParams.get("day") ??
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

  // Sin cancha: lista de asignaciones (los nombres del dropdown del supervisor)
  if (!field) {
    const { data, error } = await supabase
      .from("pitch_assignments")
      .select("*")
      .eq("day", day)
      .order("field_number", { ascending: true });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  }

  const fieldNumber = Number(field);
  if (Number.isNaN(fieldNumber)) {
    return Response.json({ error: "field inválido" }, { status: 400 });
  }

  const { data: assignment, error: aErr } = await supabase
    .from("pitch_assignments")
    .select("*")
    .eq("day", day)
    .eq("field_number", fieldNumber)
    .maybeSingle();
  if (aErr) return Response.json({ error: aErr.message }, { status: 500 });

  // Partidos del día en esa cancha (agenda del supervisor)
  const { data: matches, error: mErr } = await supabase
    .from("matches")
    .select("*, teamA:teams!matches_team_a_id_fkey(id, name), teamB:teams!matches_team_b_id_fkey(id, name)")
    .eq("field_number", fieldNumber)
    .gte("scheduled_at", `${day}T00:00:00Z`)
    .lte("scheduled_at", `${day}T23:59:59Z`)
    .order("scheduled_at", { ascending: true });
  if (mErr) return Response.json({ error: mErr.message }, { status: 500 });

  const played = (matches ?? []).filter((m) => m.status === "FINALIZADO").length;

  return Response.json({
    assignment: assignment ?? null,
    summary: { total: matches?.length ?? 0, played },
    matches: matches ?? [],
  });
}

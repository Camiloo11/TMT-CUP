import { getSupabase } from "@/lib/supabase";

// DELETE /api/matches/[id]/events/[eventId] → "quitar en caliente"
// El supervisor solo puede deshacer un evento MIENTRAS el partido sigue
// en juego y sin publicar. Después de publicar, corrige solo el admin.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const supabase = getSupabase();
  const { id, eventId } = await params;
  const matchId = Number(id);
  const evId = Number(eventId);
  if (Number.isNaN(matchId) || Number.isNaN(evId)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }

  const { data: match } = await supabase
    .from("matches")
    .select("id, status, published_at, team_a_id, team_b_id")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) return Response.json({ error: "Partido no encontrado" }, { status: 404 });
  if (match.status !== "EN_JUEGO" || match.published_at) {
    return Response.json(
      { error: "Solo se pueden quitar eventos con el partido en juego (y sin publicar)" },
      { status: 409 }
    );
  }

  const { data: event } = await supabase
    .from("match_events")
    .select("id, type")
    .eq("id", evId)
    .eq("match_id", matchId)
    .maybeSingle();

  if (!event) return Response.json({ error: "Evento no encontrado en este partido" }, { status: 404 });

  const { error } = await supabase.from("match_events").delete().eq("id", evId);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Si era gol, el marcador se recalcula desde los eventos restantes
  if (event.type === "GOL") {
    const { data: goals } = await supabase
      .from("match_events")
      .select("team_id")
      .eq("match_id", matchId)
      .eq("type", "GOL");
    const scoreA = (goals ?? []).filter((g) => g.team_id === match.team_a_id).length;
    const scoreB = (goals ?? []).filter((g) => g.team_id === match.team_b_id).length;
    await supabase.from("matches").update({ score_a: scoreA, score_b: scoreB }).eq("id", matchId);
  }

  return Response.json({ ok: true, removed: evId });
}

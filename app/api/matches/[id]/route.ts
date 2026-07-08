import { getSupabase } from "@/lib/supabase";

// PATCH /api/matches/[id] → registrar el resultado de un partido
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase();
  const { id } = await params;      // el número que viene en la URL
  const matchId = Number(id);

  if (Number.isNaN(matchId)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }

  const body = await request.json();

  if (body.scoreA === undefined || body.scoreB === undefined) {
    return Response.json(
      { error: "scoreA y scoreB son obligatorios" },
      { status: 400 }
    );
  }

  // ¿Existe el partido? Nunca actualices a ciegas
  const { data: match } = await supabase
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) {
    return Response.json({ error: "Partido no encontrado" }, { status: 404 });
  }

  const { data: updated, error } = await supabase
    .from("matches")
    .update({
      score_a: body.scoreA,
      score_b: body.scoreB,
      status: "FINALIZADO", // registrar marcador = partido terminado
    })
    .eq("id", matchId)
    .select("*, teamA:teams!matches_team_a_id_fkey(*), teamB:teams!matches_team_b_id_fkey(*)")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(updated);
}
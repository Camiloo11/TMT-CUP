import { getSupabase } from "@/lib/supabase";
import { requireRole, isAuthError } from "@/lib/auth";

// PATCH /api/teams/[id] → edita un equipo (nombre y/o categoría).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["ADMIN"]);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const teamId = Number(id);
  if (Number.isNaN(teamId)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const patch: { name?: string; category?: string; debt_paid?: boolean } = {};

  // Deuda de inscripción marcada como saldada (checkbox del registro admin)
  if (body.debtPaid !== undefined) {
    patch.debt_paid = Boolean(body.debtPaid);
  }

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return Response.json({ error: "El nombre no puede ir vacío" }, { status: 400 });
    patch.name = name;
  }
  if (body.category !== undefined) {
    if (body.category !== "MASCULINO" && body.category !== "FEMENINO") {
      return Response.json({ error: "category debe ser MASCULINO o FEMENINO" }, { status: 400 });
    }
    patch.category = body.category;
  }
  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: team, error } = await supabase
    .from("teams")
    .update(patch)
    .eq("id", teamId)
    .select()
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!team) return Response.json({ error: "Equipo no encontrado" }, { status: 404 });
  return Response.json(team);
}

// DELETE /api/teams/[id] → elimina un equipo y sus jugadores.
// Se niega si el equipo ya aparece en algún partido (protege la integridad
// del torneo: no se puede borrar un equipo con historia de juego).
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["ADMIN"]);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const teamId = Number(id);
  if (Number.isNaN(teamId)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: usedInMatch } = await supabase
    .from("matches")
    .select("id")
    .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
    .limit(1);
  if (usedInMatch && usedInMatch.length > 0) {
    return Response.json(
      { error: "No se puede borrar: el equipo ya tiene partidos. Elimina el fixture primero." },
      { status: 409 }
    );
  }

  // Sin partidos: borramos primero sus jugadores y luego el equipo.
  const { error: pErr } = await supabase.from("players").delete().eq("team_id", teamId);
  if (pErr) return Response.json({ error: pErr.message }, { status: 500 });

  const { data: deleted, error } = await supabase
    .from("teams")
    .delete()
    .eq("id", teamId)
    .select()
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!deleted) return Response.json({ error: "Equipo no encontrado" }, { status: 404 });
  return Response.json({ ok: true, deleted });
}

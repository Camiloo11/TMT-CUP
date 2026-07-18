import { getSupabase } from "@/lib/supabase";
import { requireRole, isAuthError, getSessionUser } from "@/lib/auth";

// PATCH /api/matches/[id]/acta → guardado del acta desde la mesa admin.
// Persiste TODO en una pasada: marcador, eventos (reemplazo completo con
// jugadores resueltos por nombre), nota de incidentes y fila de auditoría.
//
// Body: {
//   scoreA, scoreB: number,
//   events: [{ type: "GOL"|"AMARILLA"|"ROJA", minute: number, side: "A"|"B", player: string }],
//   incidentNote?: string,
// }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["ADMIN"]);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const matchId = Number(id);
  if (Number.isNaN(matchId)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const events = Array.isArray(body.events) ? body.events : null;
  if (events === null || body.scoreA === undefined || body.scoreB === undefined) {
    return Response.json({ error: "scoreA, scoreB y events son obligatorios" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: match } = await supabase
    .from("matches")
    .select("id, team_a_id, team_b_id, category")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return Response.json({ error: "Partido no encontrado" }, { status: 404 });

  // Jugadores de ambos equipos para resolver player_id por nombre
  const { data: roster } = await supabase
    .from("players")
    .select("id, name, team_id")
    .in("team_id", [match.team_a_id, match.team_b_id].filter(Boolean));
  const byName = new Map(
    (roster ?? []).map((p) => [`${p.team_id}·${p.name.trim().toLowerCase()}`, p.id])
  );

  // Estado ANTES (para la auditoría)
  const { data: before } = await supabase
    .from("match_events")
    .select("type, minute, team_id, player:players(name)")
    .eq("match_id", matchId)
    .order("id");

  // Reemplazo completo de los eventos del partido
  const { error: delErr } = await supabase.from("match_events").delete().eq("match_id", matchId);
  if (delErr) return Response.json({ error: delErr.message }, { status: 500 });

  type ActaEvent = { type: string; minute?: number; side: "A" | "B"; player?: string };
  const rows: Array<{ match_id: number; team_id: number; player_id: number | null; type: string; minute: number }> = (events as ActaEvent[])
    .filter((e) =>
      ["GOL", "AMARILLA", "ROJA"].includes(String(e.type)) && (e.side === "A" || e.side === "B"))
    .map((e) => {
      const teamId = e.side === "A" ? match.team_a_id : match.team_b_id;
      const playerId = byName.get(`${teamId}·${String(e.player ?? "").trim().toLowerCase()}`) ?? null;
      return {
        match_id: matchId,
        team_id: teamId,
        player_id: playerId,
        type: e.type,
        minute: Number(e.minute ?? 0) || 0,
      };
    });
  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("match_events").insert(rows);
    if (insErr) return Response.json({ error: insErr.message }, { status: 500 });
  }

  // Marcador (el frontend ya lo cuadra con los goles del roster)
  const { error: upErr } = await supabase
    .from("matches")
    .update({ score_a: Number(body.scoreA) || 0, score_b: Number(body.scoreB) || 0 })
    .eq("id", matchId)
    .select()
    .single();
  if (upErr) return Response.json({ error: upErr.message }, { status: 500 });

  // Nota de incidentes del admin: una sola nota viva por partido
  if (body.incidentNote !== undefined) {
    await supabase.from("incidents").delete().eq("match_id", matchId).eq("type", "NOTA_ADMIN");
    const note = String(body.incidentNote ?? "").trim();
    if (note) {
      await supabase.from("incidents").insert({ match_id: matchId, type: "NOTA_ADMIN", note });
    }
  }

  // Auditoría (quién, qué, antes/después) — best effort: si la tabla aún no
  // existe (falta correr el SQL), el guardado del acta no se cae por esto.
  const me = await getSessionUser();
  const after = rows.map((r) => ({
    type: r.type,
    minute: r.minute,
    team: r.team_id === match.team_a_id ? "A" : "B",
    player: (roster ?? []).find((p) => p.id === r.player_id)?.name ?? "De oficio",
  }));
  const antes = (before ?? []).map((e) => ({
    type: e.type,
    minute: e.minute,
    team: e.team_id === match.team_a_id ? "A" : "B",
    player: (e.player as unknown as { name: string } | null)?.name ?? "De oficio",
  }));
  const cambioGoles =
    antes.filter((e) => e.type === "GOL").length !== after.filter((e) => e.type === "GOL").length;
  await supabase.from("audit_logs").insert({
    admin_name: me?.name ?? "Admin",
    action: cambioGoles ? "Ajuste de goles" : "Ajuste de tarjetas",
    details: JSON.stringify({ antes, despues: after }),
    match_id: matchId,
    gender: match.category === "FEMENINO" ? "femenino" : "masculino",
  });

  return Response.json({ ok: true });
}

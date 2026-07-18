import { getSupabase } from "@/lib/supabase";
import { requireRole, isAuthError } from "@/lib/auth";

// PATCH /api/players/[id] → edita un jugador (nombre, número y/o foto).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["ADMIN"]);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const playerId = Number(id);
  if (Number.isNaN(playerId)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const patch: {
    name?: string;
    number?: number | null;
    photo_url?: string | null;
    attended?: boolean;
    amount_paid?: number;
    tmt_status?: string | null;
  } = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return Response.json({ error: "El nombre no puede ir vacío" }, { status: 400 });
    patch.name = name;
  }
  if (body.number !== undefined) {
    patch.number = body.number === null || body.number === "" ? null : Number(body.number);
  }
  if (body.photoUrl !== undefined) {
    patch.photo_url = body.photoUrl || null;
  }
  if (body.attended !== undefined) {
    patch.attended = Boolean(body.attended);
  }
  // ¿Hace parte de tMt? (registro del día)
  if (body.tmtStatus !== undefined) {
    const valid = ["SI", "NO_QUIERE", "NO_INTERESADO", "NO_ASISTIO"];
    if (body.tmtStatus !== null && !valid.includes(body.tmtStatus)) {
      return Response.json({ error: `tmtStatus debe ser uno de: ${valid.join(", ")}` }, { status: 400 });
    }
    patch.tmt_status = body.tmtStatus;
  }
  if (body.amountPaid !== undefined) {
    const n = Number(body.amountPaid);
    if (Number.isNaN(n) || n < 0) {
      return Response.json({ error: "amountPaid inválido" }, { status: 400 });
    }
    patch.amount_paid = Math.round(n);
  }
  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: player, error } = await supabase
    .from("players")
    .update(patch)
    .eq("id", playerId)
    .select()
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!player) return Response.json({ error: "Jugador no encontrado" }, { status: 404 });
  return Response.json(player);
}

// DELETE /api/players/[id] → elimina un jugador.
// Se niega si ya tiene eventos registrados (goles/tarjetas): esos datos
// son parte del acta de un partido y no deben perderse en silencio.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["ADMIN"]);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const playerId = Number(id);
  if (Number.isNaN(playerId)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: events } = await supabase
    .from("match_events")
    .select("id")
    .eq("player_id", playerId)
    .limit(1);
  if (events && events.length > 0) {
    return Response.json(
      { error: "No se puede borrar: el jugador ya tiene eventos en un partido." },
      { status: 409 }
    );
  }

  const { data: deleted, error } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId)
    .select()
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!deleted) return Response.json({ error: "Jugador no encontrado" }, { status: 404 });
  return Response.json({ ok: true, deleted });
}

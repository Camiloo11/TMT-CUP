import { supabase } from "@/lib/supabase";

// GET /api/sanctions → historial de sanciones
export async function GET() {
  const { data: sanctions, error } = await supabase
    .from("sanctions")
    .select("*, team:teams(*), match:matches(*)")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(sanctions);
}

// POST /api/sanctions → aplicar una sanción Y sus efectos automáticos
export async function POST(request: Request) {
  const body = await request.json();

  const validTypes = ["W_2MIN", "W_4MIN", "W_6MIN", "INASISTENCIA"];
  if (!body.teamId || !validTypes.includes(body.type)) {
    return Response.json(
      { error: "teamId y un type válido son obligatorios" },
      { status: 400 }
    );
  }

  // Las W de retraso aplican a un partido específico
  if (body.type !== "INASISTENCIA" && !body.matchId) {
    return Response.json(
      { error: "matchId es obligatorio para sanciones de retraso (W)" },
      { status: 400 }
    );
  }

  // ── W_2MIN: solo se registra (el efecto es en cancha) ──
  if (body.type === "W_2MIN") {
    const { data: sanction, error } = await supabase
      .from("sanctions")
      .insert({ team_id: body.teamId, match_id: body.matchId, type: body.type, note: body.note })
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(sanction, { status: 201 });
  }

  // ── W_4MIN y W_6MIN: afectan el marcador (transacción atómica vía RPC) ──
  if (body.type === "W_4MIN" || body.type === "W_6MIN") {
    const { data: sanction, error } = await supabase.rpc("apply_w_sanction", {
      p_team_id: body.teamId,
      p_match_id: body.matchId,
      p_type: body.type,
      p_note: body.note ?? null,
    });

    if (error) {
      const status = error.message.includes("no encontrado") ? 404 : 400;
      return Response.json({ error: error.message }, { status });
    }

    return Response.json(sanction, { status: 201 });
  }

  // ── INASISTENCIA: cada rival del grupo gana 3-0 "de oficio" (RPC atómica) ──
  const { data: sanction, error } = await supabase.rpc("apply_inasistencia_sanction", {
    p_team_id: body.teamId,
    p_note: body.note ?? null,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json(sanction, { status: 201 });
}
import { getSupabase } from "@/lib/supabase";
import { requireRole, isAuthError } from "@/lib/auth";

// POST /api/draw → sorteo: baraja los equipos masculinos y los reparte en A-D
export async function POST() {
  const auth = await requireRole(["ADMIN"]);
  if (isAuthError(auth)) return auth;

  const supabase = getSupabase();
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id")
    .eq("category", "MASCULINO"); // el femenino no usa grupos

  if (teamsError) {
    return Response.json({ error: teamsError.message }, { status: 500 });
  }

  if (teams.length < 2) {
    return Response.json(
      { error: "Se necesitan al menos 2 equipos masculinos para sortear" },
      { status: 400 }
    );
  }

  // Barajar con Fisher-Yates (azar sin sesgo)
  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Garantiza los 4 grupos (cancha 1=A ... cancha 4=D) y reparte en ronda
  // 0→A, 1→B, 2→C, 3→D, 4→A, ... de forma atómica vía función RPC.
  const { error: rpcError } = await supabase.rpc("perform_draw", {
    team_ids: shuffled.map((t) => t.id),
  });

  if (rpcError) {
    return Response.json({ error: rpcError.message }, { status: 500 });
  }

  const { data: result, error } = await supabase
    .from("groups")
    .select("*, teams(*)");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(result);
}
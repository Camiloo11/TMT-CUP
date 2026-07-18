import { getSupabase } from "@/lib/supabase";
import { requireRole, isAuthError } from "@/lib/auth";

// GET /api/audit → historial real de ediciones de actas (solo admin).
// Las filas las escribe el servidor en PATCH /api/matches/[id]/acta.
export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (isAuthError(auth)) return auth;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

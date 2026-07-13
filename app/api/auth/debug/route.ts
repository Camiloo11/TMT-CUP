import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET /api/auth/debug → TEMPORAL: diagnostica el estado de autenticación.
// Reporta si la tabla profiles existe, cuántos perfiles hay, y cuántos
// usuarios de auth existen. Borrar cuando el login quede confirmado.
export async function GET() {
  const supabase = getSupabase();
  const out: Record<string, unknown> = {};

  const { count, error: pErr } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });
  out.profilesTableOk = !pErr;
  out.profilesError = pErr?.message ?? null;
  out.profilesCount = count ?? null;

  const { data: profiles } = await supabase.from("profiles").select("id, name, role");
  out.profiles = (profiles ?? []).map((p) => ({ name: p.name, role: p.role }));

  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    out.authUsersOk = !error;
    out.authUsersError = error?.message ?? null;
    out.authUsers = (data?.users ?? []).map((u) => ({ email: u.email, confirmed: !!u.email_confirmed_at }));
  } catch (e) {
    out.authUsersOk = false;
    out.authUsersError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(out);
}

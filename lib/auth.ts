import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";

export type Role = "ADMIN" | "SUPERVISOR";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export const ACCESS_COOKIE = "sb-access-token";
export const REFRESH_COOKIE = "sb-refresh-token";

// Lee el usuario autenticado desde la cookie de sesión (o null si no hay).
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? "",
    name: profile.name,
    role: profile.role as Role,
  };
}

// "Modo abierto": todavía no hay usuarios del staff, así que la app no exige
// login (para no bloquear el desarrollo). Al crear el primer usuario, se cierra.
export async function isOpenMode(): Promise<boolean> {
  const supabase = getSupabase();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });
  return (count ?? 0) === 0;
}

// Exige un rol para una acción de escritura.
// - ADMIN siempre pasa (control total).
// - En modo abierto, se permite como "invitado" para no romper la demo.
// Devuelve el usuario, {guest:true}, o una Response de error lista para retornar.
export async function requireRole(
  roles: Role[]
): Promise<SessionUser | { guest: true } | Response> {
  const user = await getSessionUser();
  if (user) {
    if (user.role === "ADMIN" || roles.includes(user.role)) return user;
    return Response.json({ error: "No tienes permiso para esta acción" }, { status: 403 });
  }
  if (await isOpenMode()) return { guest: true };
  return Response.json({ error: "Debes iniciar sesión" }, { status: 401 });
}

// Ayuda para distinguir el caso de error en los handlers.
export function isAuthError(x: unknown): x is Response {
  return x instanceof Response;
}

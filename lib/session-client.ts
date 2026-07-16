"use client";

// Utilidades de sesión del lado del cliente (staff: supervisor/admin).
// La sesión vive en cookies httpOnly que maneja el servidor; aquí solo
// se orquestan las llamadas y el respaldo local de la mesa de control.

export type SessionRole = "ADMIN" | "SUPERVISOR";
export type SessionUser = { id: string; email: string; name: string; role: SessionRole };

// Correo recordado para pre-llenar el login cuando "Recordarme" está activo
export const REMEMBERED_EMAIL_KEY = "tmt.login.email";
// Respaldo local de la mesa de control del supervisor (partido en curso)
export const SUPERVISOR_CACHE_KEY = "tmt.supervisor.control";

async function getMe(): Promise<SessionUser | null> {
  try {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    return (data?.user as SessionUser | null) ?? null;
  } catch {
    return null;
  }
}

// Usuario actual. Si el access token ya expiró (dura ~1 hora), intenta
// renovarlo con el refresh token antes de rendirse: así "Recordarme"
// mantiene viva la sesión durante todo el torneo.
export async function fetchSessionUser(): Promise<SessionUser | null> {
  const me = await getMe();
  if (me) return me;

  const refreshed = await fetch("/api/auth/refresh", { method: "POST" })
    .then((r) => r.ok)
    .catch(() => false);
  if (!refreshed) return null;

  return getMe();
}

// Cierre de sesión EXPLÍCITO: borra las cookies y también el respaldo
// local del supervisor. Es la ÚNICA acción que borra ese respaldo;
// salir por accidente o cerrar la app lo conserva.
export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    clearSupervisorCache();
  }
}

export function clearSupervisorCache() {
  try {
    localStorage.removeItem(SUPERVISOR_CACHE_KEY);
  } catch {
    // almacenamiento no disponible (modo privado): no pasa nada
  }
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth";

// POST /api/auth/refresh → renueva la sesión con el refresh token
// (llamada directa al endpoint de auth, mismo criterio que el login)
export async function POST() {
  const store = await cookies();
  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (!refresh) {
    return NextResponse.json({ error: "sin sesión" }, { status: 401 });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Faltan variables de entorno" }, { status: 500 });
  }

  const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  const session = await tokenRes.json().catch(() => null);

  if (!tokenRes.ok || !session?.access_token) {
    return NextResponse.json({ error: "sesión expirada" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(ACCESS_COOKIE, session.access_token, {
    httpOnly: true, sameSite: "lax", secure, path: "/",
    maxAge: session.expires_in ?? 3600,
  });
  res.cookies.set(REFRESH_COOKIE, session.refresh_token, {
    httpOnly: true, sameSite: "lax", secure, path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

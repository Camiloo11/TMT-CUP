import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth";

// POST /api/auth/refresh → renueva la sesión con el refresh token
// (el frontend lo llama cuando una petición devuelve 401 por token vencido)
export async function POST() {
  const store = await cookies();
  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (!refresh) {
    return NextResponse.json({ error: "sin sesión" }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refresh });
  if (error || !data.session) {
    return NextResponse.json({ error: "sesión expirada" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(ACCESS_COOKIE, data.session.access_token, {
    httpOnly: true, sameSite: "lax", secure, path: "/",
    maxAge: data.session.expires_in ?? 3600,
  });
  res.cookies.set(REFRESH_COOKIE, data.session.refresh_token, {
    httpOnly: true, sameSite: "lax", secure, path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

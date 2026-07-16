import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { ACCESS_COOKIE, REFRESH_COOKIE, REMEMBER_COOKIE } from "@/lib/auth";

// POST /api/auth/login → inicia sesión del staff (supervisor/admin)
// Verifica la contraseña llamando DIRECTO al endpoint de auth de Supabase
// (con la llave como 'apikey', sin Authorization de servicio) para evitar
// el conflicto que tiene el cliente inicializado con la service_role key.
//
// body.remember ("Recordarme"): con true las cookies son persistentes y la
// sesión sobrevive al cierre del navegador; con false son cookies de sesión.
export async function POST(request: Request) {
  const { email, password, remember } = await request.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "email y password son obligatorios" }, { status: 400 });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Faltan variables de entorno de Supabase" }, { status: 500 });
  }

  const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const session = await tokenRes.json().catch(() => null);

  if (!tokenRes.ok || !session?.access_token || !session?.user?.id) {
    return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", session.user.id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "Este usuario no es parte del staff" }, { status: 403 });
  }

  const res = NextResponse.json({ name: profile.name, role: profile.role });
  const secure = process.env.NODE_ENV === "production";
  const persist = remember !== false; // por defecto se recuerda la sesión
  const base = { httpOnly: true as const, sameSite: "lax" as const, secure, path: "/" };

  // Sin maxAge la cookie es "de sesión" y muere al cerrar el navegador
  res.cookies.set(ACCESS_COOKIE, session.access_token, {
    ...base, ...(persist ? { maxAge: session.expires_in ?? 3600 } : {}),
  });
  res.cookies.set(REFRESH_COOKIE, session.refresh_token, {
    ...base, ...(persist ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });
  res.cookies.set(REMEMBER_COOKIE, persist ? "1" : "0", {
    ...base, ...(persist ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });
  return res;
}

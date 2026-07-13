import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth";

// POST /api/auth/login → inicia sesión del staff (supervisor/admin)
export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "email y password son obligatorios" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "Este usuario no es parte del staff" }, { status: 403 });
  }

  const res = NextResponse.json({ name: profile.name, role: profile.role });
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

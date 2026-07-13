import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getSessionUser, isOpenMode } from "@/lib/auth";

// GET /api/auth/users → lista del staff (solo admin)
export async function GET() {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador" }, { status: 403 });
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, role, created_at")
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/auth/users → crea una cuenta del staff.
// Bootstrap: si aún no hay usuarios, el primero debe ser ADMIN (sin login).
// Después, solo un ADMIN puede crear más cuentas.
export async function POST(request: Request) {
  const supabase = getSupabase();
  const body = await request.json().catch(() => ({}));
  const { email, password, name } = body;
  const role = body.role as string;

  if (!email || !password || !name || !["ADMIN", "SUPERVISOR"].includes(role)) {
    return NextResponse.json(
      { error: "email, password, name y role (ADMIN|SUPERVISOR) son obligatorios" },
      { status: 400 }
    );
  }
  if (String(password).length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }

  const open = await isOpenMode();
  if (open) {
    if (role !== "ADMIN") {
      return NextResponse.json(
        { error: "El primer usuario del sistema debe ser un ADMIN" },
        { status: 400 }
      );
    }
  } else {
    const me = await getSessionUser();
    if (!me || me.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo un administrador puede crear cuentas" }, { status: 403 });
    }
  }

  // Crea el usuario en Supabase Auth (email confirmado, sin correo de verificación)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "No se pudo crear el usuario" }, { status: 500 });
  }

  const { error: pErr } = await supabase
    .from("profiles")
    .insert({ id: data.user.id, name, role });
  if (pErr) {
    // Rollback: si falla el perfil, borra el usuario auth para no dejar basura
    await supabase.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.user.id, email, name, role }, { status: 201 });
}

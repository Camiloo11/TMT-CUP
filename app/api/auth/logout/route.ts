import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, REMEMBER_COOKIE } from "@/lib/auth";

// POST /api/auth/logout → cierra la sesión borrando las cookies
export async function POST() {
  const res = NextResponse.json({ ok: true });

  const secure = process.env.NODE_ENV === "production";
  const baseOptions = { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" as const, secure };

  res.cookies.set(ACCESS_COOKIE, "", baseOptions);
  res.cookies.set(REFRESH_COOKIE, "", baseOptions);
  res.cookies.set(REMEMBER_COOKIE, "", baseOptions);

  return res;
}
import { NextResponse } from "next/server";
import { getSessionUser, isOpenMode } from "@/lib/auth";

// GET /api/auth/me → usuario actual + si la app está en "modo abierto"
export async function GET() {
  const user = await getSessionUser();
  const openMode = user ? false : await isOpenMode();
  return NextResponse.json({ user, openMode });
}

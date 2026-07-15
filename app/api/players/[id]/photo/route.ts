import { getSupabase } from "@/lib/supabase";
import { requireRole, isAuthError } from "@/lib/auth";

// POST /api/players/[id]/photo → sube la foto de un jugador al bucket
// "player-photos" de Supabase Storage y guarda su URL pública en photo_url.
//
// Recibe multipart/form-data con un campo "file" (la imagen).
// Requisito previo: crear el bucket PÚBLICO "player-photos" en Supabase.
const BUCKET = "player-photos";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["ADMIN"]);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const playerId = Number(id);
  if (Number.isNaN(playerId)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Falta el archivo (campo 'file')" }, { status: 400 });
  }
  const ext = EXT[file.type];
  if (!ext) {
    return Response.json({ error: "Formato no soportado. Usa JPG, PNG o WEBP." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "La imagen supera los 5 MB" }, { status: 400 });
  }

  const supabase = getSupabase();

  // El jugador debe existir antes de subir nada
  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("id", playerId)
    .maybeSingle();
  if (!player) return Response.json({ error: "Jugador no encontrado" }, { status: 404 });

  // Nombre estable por jugador (upsert reemplaza la foto anterior)
  const path = `${playerId}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (upErr) {
    return Response.json(
      { error: `No se pudo subir la foto: ${upErr.message}. ¿Creaste el bucket "${BUCKET}"?` },
      { status: 500 }
    );
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // Cache-buster: fuerza a recargar la imagen cuando se reemplaza
  const photoUrl = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: updErr } = await supabase
    .from("players")
    .update({ photo_url: photoUrl })
    .eq("id", playerId);
  if (updErr) return Response.json({ error: updErr.message }, { status: 500 });

  return Response.json({ ok: true, photoUrl });
}

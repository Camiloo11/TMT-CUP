import { getSupabase } from "@/lib/supabase";
import { requireRole, isAuthError } from "@/lib/auth";

// POST /api/assignments → asignar supervisor + árbitro a una cancha para un día
// (upsert: si ya existe la dupla día+cancha, se actualiza)
export async function POST(request: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (isAuthError(auth)) return auth;

  const supabase = getSupabase();
  const body = await request.json();

  if (!body.fieldNumber || !body.supervisorName || !body.refereeName) {
    return Response.json(
      { error: "fieldNumber, supervisorName y refereeName son obligatorios" },
      { status: 400 }
    );
  }

  const day = body.day ?? new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("pitch_assignments")
    .upsert(
      {
        day,
        field_number: body.fieldNumber,
        supervisor_name: String(body.supervisorName).trim(),
        referee_name: String(body.refereeName).trim(),
      },
      { onConflict: "day,field_number" }
    )
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}

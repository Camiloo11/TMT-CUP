import { getSupabase } from "@/lib/supabase";
import { requireRole, isAuthError } from "@/lib/auth";

// GET /api/teams → lista todos los equipos con sus jugadores
export async function GET() {
  const supabase = getSupabase();
  const { data: teams, error } = await supabase
    .from("teams")
    .select("*, players(*)");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(teams);
}

// POST /api/teams → crea un equipo nuevo
export async function POST(request: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (isAuthError(auth)) return auth;

  const supabase = getSupabase();
  const body = await request.json(); // lee el JSON que envía el cliente

  // Validación: nunca confíes en lo que te mandan
  if (!body.name || !body.category) {
    return Response.json(
      { error: "name y category son obligatorios" },
      { status: 400 } // 400 = "tu petición está mal hecha"
    );
  }

  const { data: team, error } = await supabase
    .from("teams")
    .insert({ name: body.name, category: body.category })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(team, { status: 201 }); // 201 = "creado con éxito"
}
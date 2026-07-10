import { getSupabase } from "@/lib/supabase";

// POST /api/fixtures/generate → genera el calendario de la fase de grupos:
// todos contra todos dentro de cada grupo, en la cancha fija del grupo,
// partidos cada 30 minutos (26 de juego + 4 de rotación).
//
// Body opcional: { day: "2026-07-12", startTime: "08:00", utcOffset: "-05:00" }
// Por defecto: hoy, 8:00 AM, hora de Bogotá.

// Round-robin con el "método del círculo": cada equipo juega contra todos
function roundRobin(ids: number[]): Array<[number, number]> {
  const teams = [...ids];
  if (teams.length % 2 === 1) teams.push(-1); // descansa en esa ronda
  const n = teams.length;
  const pairs: Array<[number, number]> = [];

  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      const a = teams[i];
      const b = teams[n - 1 - i];
      if (a !== -1 && b !== -1) pairs.push([a, b]);
    }
    teams.splice(1, 0, teams.pop()!); // rota todos menos el primero
  }
  return pairs;
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  const body = await request.json().catch(() => ({}));

  const day = body.day ?? new Date().toISOString().slice(0, 10);
  const startTime = body.startTime ?? "08:00";
  const utcOffset = body.utcOffset ?? "-05:00"; // Bogotá
  const kickoffBase = new Date(`${day}T${startTime}:00${utcOffset}`);

  if (Number.isNaN(kickoffBase.getTime())) {
    return Response.json({ error: "day/startTime/utcOffset inválidos" }, { status: 400 });
  }

  // Guardia: no duplicar el fixture
  const { data: existing } = await supabase
    .from("matches")
    .select("id")
    .eq("phase", "GRUPOS")
    .limit(1);
  if (existing && existing.length > 0) {
    return Response.json(
      { error: "Ya existe un fixture de grupos. Limpia los partidos (reset.sql) antes de regenerar." },
      { status: 409 }
    );
  }

  const { data: groups, error: gErr } = await supabase
    .from("groups")
    .select("id, name, field_number, teams(id)")
    .order("field_number");
  if (gErr) return Response.json({ error: gErr.message }, { status: 500 });

  const created: Record<string, number> = {};
  const SLOT_MINUTES = 30; // 26 de juego + 4 de rotación

  for (const group of groups ?? []) {
    const teamIds = (group.teams as Array<{ id: number }>).map((t) => t.id);
    if (teamIds.length < 2) {
      created[group.name] = 0;
      continue;
    }

    const pairs = roundRobin(teamIds);
    const rows = pairs.map(([a, b], slot) => ({
      phase: "GRUPOS",
      status: "PROGRAMADO",
      field_number: group.field_number,
      scheduled_at: new Date(kickoffBase.getTime() + slot * SLOT_MINUTES * 60000).toISOString(),
      team_a_id: a,
      team_b_id: b,
    }));

    const { error } = await supabase.from("matches").insert(rows);
    if (error) return Response.json({ error: `Grupo ${group.name}: ${error.message}` }, { status: 500 });
    created[group.name] = rows.length;
  }

  return Response.json({ day, startTime, created }, { status: 201 });
}

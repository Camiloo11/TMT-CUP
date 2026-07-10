import { getSupabase } from "@/lib/supabase";

// GET /api/debug?match=2 → TEMPORAL: ejecuta una a una las consultas del
// detalle del partido y reporta cuál falla. Borrar antes de ir a producción.
export async function GET(request: Request) {
  const supabase = getSupabase();
  const url = new URL(request.url);
  const matchId = Number(url.searchParams.get("match") ?? "2");
  const results: Record<string, string> = {};

  async function probe(name: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      results[name] = "OK";
    } catch (err) {
      results[name] = `THROW: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  await probe("1_match_simple", async () => {
    const { error } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
    if (error) throw new Error(`supabase error: ${error.message}`);
  });

  await probe("2_teams_con_players", async () => {
    const { error } = await supabase.from("teams").select("*, players(*)").limit(2);
    if (error) throw new Error(`supabase error: ${error.message}`);
  });

  await probe("3_events_con_joins", async () => {
    const { error } = await supabase
      .from("match_events")
      .select("*, player:players(id, name), team:teams(id, name)")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(`supabase error: ${error.message}`);
  });

  await probe("4_rojas_in_filter", async () => {
    const { error } = await supabase
      .from("match_events")
      .select("player_id")
      .eq("type", "ROJA")
      .in("player_id", [1, 2, 3]);
    if (error) throw new Error(`supabase error: ${error.message}`);
  });

  await probe("5_assignment_maybeSingle", async () => {
    const { error } = await supabase
      .from("pitch_assignments")
      .select("*")
      .eq("field_number", 1)
      .eq("day", new Date().toISOString().slice(0, 10))
      .maybeSingle();
    if (error) throw new Error(`supabase error: ${error.message}`);
  });

  return Response.json(results);
}

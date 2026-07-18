import { getSupabase } from "@/lib/supabase";

type Team = {
  id: number;
  name: string;
  flag: string | null;
};

type StandingRow = {
  teamId: number;
  team: string;
  flag: string | null;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
  amarillas: number;
  rojas: number;
};

// GET /api/standings → tabla de posiciones de cada grupo
export async function GET() {
  const supabase = getSupabase();
  const { data: groups, error: groupsError } = await supabase
    .from("groups")
    .select("*, teams(*)");

  if (groupsError) {
    return Response.json({ error: groupsError.message }, { status: 500 });
  }

  // Solo cuentan partidos TERMINADOS de la fase de grupos
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "FINALIZADO")
    .eq("phase", "GRUPOS");

  if (matchesError) {
    return Response.json({ error: matchesError.message }, { status: 500 });
  }

  // Tarjetas acumuladas por equipo (para las columnas 🟨/🟥 de la tabla pública)
  const { data: cardEvents } = await supabase
    .from("match_events")
    .select("team_id, type")
    .in("type", ["AMARILLA", "ROJA"]);
  const cardsByTeam = new Map<number, { amarillas: number; rojas: number }>();
  for (const c of cardEvents ?? []) {
    const entry = cardsByTeam.get(c.team_id) ?? { amarillas: 0, rojas: 0 };
    if (c.type === "AMARILLA") entry.amarillas++;
    else entry.rojas++;
    cardsByTeam.set(c.team_id, entry);
  }

  const standings = groups.map((group) => {
    const table = (group.teams as Team[]).map((team) => {
      const row: StandingRow = {
        teamId: team.id,
        team: team.name,
        flag: team.flag ?? null,
        pj: 0,  // partidos jugados
        pg: 0,  // ganados
        pe: 0,  // empatados
        pp: 0,  // perdidos
        gf: 0,  // goles a favor
        gc: 0,  // goles en contra
        dg: 0,  // diferencia de gol
        pts: 0, // puntos
        amarillas: cardsByTeam.get(team.id)?.amarillas ?? 0,
        rojas: cardsByTeam.get(team.id)?.rojas ?? 0,
      };

      for (const m of matches) {
        // Doble W: el partido cuenta como jugado pero sin goles ni puntos
        if (m.walkover === "DOBLE") {
          if (m.team_a_id === team.id || m.team_b_id === team.id) {
            row.pj++;
            row.pp++;
          }
          continue;
        }

        // ¿Este equipo jugó este partido? ¿Como A o como B?
        let golesFavor: number | null = null;
        let golesContra: number | null = null;

        if (m.team_a_id === team.id) {
          golesFavor = m.score_a;
          golesContra = m.score_b;
        } else if (m.team_b_id === team.id) {
          golesFavor = m.score_b;
          golesContra = m.score_a;
        }

        // No jugó aquí, o el partido no tiene marcador → no cuenta
        if (golesFavor === null || golesContra === null) continue;

        row.pj++;
        row.gf += golesFavor;
        row.gc += golesContra;

        if (golesFavor > golesContra) {
          row.pg++;
          row.pts += 3; // victoria
        } else if (golesFavor === golesContra) {
          row.pe++;
          row.pts += 1; // empate
        } else {
          row.pp++; // derrota: 0 puntos
        }
      }

      row.dg = row.gf - row.gc;
      return row;
    });

    // TU regla de clasificación: puntos → diferencia de gol → goles a favor
    table.sort((a: StandingRow, b: StandingRow) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);

    return {
      group: group.name,
      cancha: group.field_number,
      tabla: table, // los 2 primeros de esta lista clasifican
    };
  });

  return Response.json(standings);
}
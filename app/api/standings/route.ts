import { supabase } from "@/lib/supabase";

type Team = {
  id: number;
  name: string;
};

type StandingRow = {
  teamId: number;
  team: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
};

// GET /api/standings → tabla de posiciones de cada grupo
export async function GET() {
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

  const standings = groups.map((group) => {
    const table = (group.teams as Team[]).map((team) => {
      const row: StandingRow = {
        teamId: team.id,
        team: team.name,
        pj: 0,  // partidos jugados
        pg: 0,  // ganados
        pe: 0,  // empatados
        pp: 0,  // perdidos
        gf: 0,  // goles a favor
        gc: 0,  // goles en contra
        dg: 0,  // diferencia de gol
        pts: 0, // puntos
      };

      for (const m of matches) {
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
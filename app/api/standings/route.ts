import { prisma } from "@/lib/prisma";

// GET /api/standings → tabla de posiciones de cada grupo
export async function GET() {
  const groups = await prisma.group.findMany({
    include: { teams: true },
  });

  // Solo cuentan partidos TERMINADOS de la fase de grupos
  const matches = await prisma.match.findMany({
    where: { status: "FINALIZADO", phase: "GRUPOS" },
  });

  const standings = groups.map((group) => {
    const table = group.teams.map((team) => {
      const row = {
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

        if (m.teamAId === team.id) {
          golesFavor = m.scoreA;
          golesContra = m.scoreB;
        } else if (m.teamBId === team.id) {
          golesFavor = m.scoreB;
          golesContra = m.scoreA;
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
    table.sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);

    return {
      group: group.name,
      cancha: group.fieldNumber,
      tabla: table, // los 2 primeros de esta lista clasifican
    };
  });

  return Response.json(standings);
}
import { prisma } from "@/lib/prisma";

// GET /api/sanctions → historial de sanciones
export async function GET() {
  const sanctions = await prisma.sanction.findMany({
    orderBy: { createdAt: "desc" },
    include: { team: true, match: true },
  });
  return Response.json(sanctions);
}

// POST /api/sanctions → aplicar una sanción Y sus efectos automáticos
export async function POST(request: Request) {
  const body = await request.json();

  const validTypes = ["W_2MIN", "W_4MIN", "W_6MIN", "INASISTENCIA"];
  if (!body.teamId || !validTypes.includes(body.type)) {
    return Response.json(
      { error: "teamId y un type válido son obligatorios" },
      { status: 400 }
    );
  }

  // Las W de retraso aplican a un partido específico
  if (body.type !== "INASISTENCIA" && !body.matchId) {
    return Response.json(
      { error: "matchId es obligatorio para sanciones de retraso (W)" },
      { status: 400 }
    );
  }

  // ── W_2MIN: solo se registra (el efecto es en cancha) ──
  if (body.type === "W_2MIN") {
    const sanction = await prisma.sanction.create({
      data: { teamId: body.teamId, matchId: body.matchId, type: body.type, note: body.note },
    });
    return Response.json(sanction, { status: 201 });
  }

  // ── W_4MIN y W_6MIN: afectan el marcador ──
  if (body.type === "W_4MIN" || body.type === "W_6MIN") {
    const match = await prisma.match.findUnique({ where: { id: body.matchId } });
    if (!match) {
      return Response.json({ error: "Partido no encontrado" }, { status: 404 });
    }
    if (match.teamAId !== body.teamId && match.teamBId !== body.teamId) {
      return Response.json({ error: "Ese equipo no juega ese partido" }, { status: 400 });
    }

    const sancionadoEsA = match.teamAId === body.teamId;
    const scoreRival = body.type === "W_4MIN" ? 1 : 3; // 0-1 arranca | 3-0 perdido

    const [sanction] = await prisma.$transaction([
      prisma.sanction.create({
        data: { teamId: body.teamId, matchId: body.matchId, type: body.type, note: body.note },
      }),
      prisma.match.update({
        where: { id: match.id },
        data: {
          scoreA: sancionadoEsA ? 0 : scoreRival,
          scoreB: sancionadoEsA ? scoreRival : 0,
          status: body.type === "W_6MIN" ? "FINALIZADO" : "EN_JUEGO",
        },
      }),
    ]);

    return Response.json(sanction, { status: 201 });
  }

  // ── INASISTENCIA: cada rival del grupo gana 3-0 "de oficio" ──
  const team = await prisma.team.findUnique({ where: { id: body.teamId } });
  if (!team || !team.groupId) {
    return Response.json(
      { error: "El equipo no existe o no tiene grupo asignado" },
      { status: 400 }
    );
  }

  const rivals = await prisma.team.findMany({
    where: { groupId: team.groupId, id: { not: team.id } },
  });

  const sanction = await prisma.$transaction(async (tx) => {
    const s = await tx.sanction.create({
      data: { teamId: team.id, type: "INASISTENCIA", note: body.note },
    });

    for (const rival of rivals) {
      await tx.match.create({
        data: {
          phase: "GRUPOS",
          status: "FINALIZADO",
          fieldNumber: 0, // 0 = partido "de oficio", no se juega en cancha
          scheduledAt: new Date(),
          teamAId: rival.id,
          teamBId: team.id,
          scoreA: 3,
          scoreB: 0,
        },
      });
    }

    return s;
  });

  return Response.json(sanction, { status: 201 });
}
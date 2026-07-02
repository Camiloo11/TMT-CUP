import { prisma } from "@/lib/prisma";

// PATCH /api/matches/[id] → registrar el resultado de un partido
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;      // el número que viene en la URL
  const matchId = Number(id);

  if (Number.isNaN(matchId)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }

  const body = await request.json();

  if (body.scoreA === undefined || body.scoreB === undefined) {
    return Response.json(
      { error: "scoreA y scoreB son obligatorios" },
      { status: 400 }
    );
  }

  // ¿Existe el partido? Nunca actualices a ciegas
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return Response.json({ error: "Partido no encontrado" }, { status: 404 });
  }

  const updated = await prisma.match.update({
    where: { id: matchId },
    data: {
      scoreA: body.scoreA,
      scoreB: body.scoreB,
      status: "FINALIZADO", // registrar marcador = partido terminado
    },
    include: { teamA: true, teamB: true },
  });

  return Response.json(updated);
}
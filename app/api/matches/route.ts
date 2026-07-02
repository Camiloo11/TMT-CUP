import { prisma } from "@/lib/prisma";

// GET /api/matches → todos los partidos, ordenados por fecha, con sus equipos
export async function GET() {
  const matches = await prisma.match.findMany({
    orderBy: { scheduledAt: "asc" }, // 👈 del más próximo al más lejano
    include: { teamA: true, teamB: true }, // 👈 trae los DOS hilos con nombre
  });
  return Response.json(matches);
}

// POST /api/matches → programar un partido nuevo
export async function POST(request: Request) {
  const body = await request.json();

  if (!body.teamAId || !body.teamBId || !body.scheduledAt || !body.fieldNumber || !body.phase) {
    return Response.json(
      { error: "teamAId, teamBId, scheduledAt, fieldNumber y phase son obligatorios" },
      { status: 400 }
    );
  }

  // Validación de NEGOCIO (no solo de formato):
  if (body.teamAId === body.teamBId) {
    return Response.json(
      { error: "Un equipo no puede jugar contra sí mismo" },
      { status: 400 }
    );
  }

  const match = await prisma.match.create({
    data: {
      teamAId: body.teamAId,
      teamBId: body.teamBId,
      scheduledAt: new Date(body.scheduledAt), // texto → fecha real
      fieldNumber: body.fieldNumber,
      phase: body.phase,
    },
    include: { teamA: true, teamB: true },
  });

  return Response.json(match, { status: 201 });
}
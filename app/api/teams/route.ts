import { prisma } from "@/lib/prisma";

// GET /api/teams → lista todos los equipos con sus jugadores
export async function GET() {
  const teams = await prisma.team.findMany({
    include: { players: true },
  });
  return Response.json(teams);
}

// POST /api/teams → crea un equipo nuevo
export async function POST(request: Request) {
  const body = await request.json(); // lee el JSON que envía el cliente

  // Validación: nunca confíes en lo que te mandan
  if (!body.name || !body.category) {
    return Response.json(
      { error: "name y category son obligatorios" },
      { status: 400 } // 400 = "tu petición está mal hecha"
    );
  }

  const team = await prisma.team.create({
    data: {
      name: body.name,
      category: body.category,
    },
  });

  return Response.json(team, { status: 201 }); // 201 = "creado con éxito"
}
import { prisma } from "@/lib/prisma";

export async function GET() {
  const teams = await prisma.team.findMany({
    include: { players: true },
  });
  return Response.json(teams);
}
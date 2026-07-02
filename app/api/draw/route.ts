import { prisma } from "@/lib/prisma";

// POST /api/draw → sorteo: baraja los equipos masculinos y los reparte en A-D
export async function POST() {
  const teams = await prisma.team.findMany({
    where: { category: "MASCULINO" }, // el femenino no usa grupos
  });

  if (teams.length < 2) {
    return Response.json(
      { error: "Se necesitan al menos 2 equipos masculinos para sortear" },
      { status: 400 }
    );
  }

  // Barajar con Fisher-Yates (azar sin sesgo)
  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const groupNames = ["A", "B", "C", "D"];

  const result = await prisma.$transaction(async (tx) => {
    // Garantiza que existan los 4 grupos (tu regla: cancha 1=A ... cancha 4=D)
    const groups = [];
    for (let i = 0; i < groupNames.length; i++) {
      let group = await tx.group.findFirst({ where: { name: groupNames[i] } });
      if (!group) {
        group = await tx.group.create({
          data: { name: groupNames[i], fieldNumber: i + 1 },
        });
      }
      groups.push(group);
    }

    // Reparto en ronda: 0→A, 1→B, 2→C, 3→D, 4→A, ...
    for (let i = 0; i < shuffled.length; i++) {
      await tx.team.update({
        where: { id: shuffled[i].id },
        data: { groupId: groups[i % 4].id },
      });
    }

    return tx.group.findMany({ include: { teams: true } });
  });

  return Response.json(result);
}
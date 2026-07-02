-- CreateEnum
CREATE TYPE "SanctionType" AS ENUM ('W_2MIN', 'W_4MIN', 'W_6MIN', 'INASISTENCIA');

-- CreateTable
CREATE TABLE "Sanction" (
    "id" SERIAL NOT NULL,
    "type" "SanctionType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamId" INTEGER NOT NULL,
    "matchId" INTEGER,

    CONSTRAINT "Sanction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Sanction" ADD CONSTRAINT "Sanction_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sanction" ADD CONSTRAINT "Sanction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

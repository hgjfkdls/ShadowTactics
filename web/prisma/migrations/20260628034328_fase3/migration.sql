/*
  Warnings:

  - Added the required column `rngSeed` to the `Game` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "rngSeed" INTEGER NOT NULL,
ADD COLUMN     "totalTurns" INTEGER,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'quickplay';

-- CreateTable
CREATE TABLE "GameReplay" (
    "gameId" TEXT NOT NULL,
    "rngSeed" INTEGER NOT NULL,
    "actions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameReplay_pkey" PRIMARY KEY ("gameId")
);

-- CreateTable
CREATE TABLE "GameClassStats" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "unitClass" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "survived" BOOLEAN NOT NULL,
    "attacksMade" INTEGER NOT NULL,
    "attacksHit" INTEGER NOT NULL,
    "attacksMissed" INTEGER NOT NULL,
    "criticalHits" INTEGER NOT NULL,
    "counterAttacks" INTEGER NOT NULL,
    "damageDealt" INTEGER NOT NULL,
    "damageReceived" INTEGER NOT NULL,
    "damageMitigated" INTEGER NOT NULL,
    "counterDamage" INTEGER NOT NULL,
    "kills" INTEGER NOT NULL,
    "killsByCounter" INTEGER NOT NULL,
    "timesKilled" INTEGER NOT NULL,
    "totalMoves" INTEGER NOT NULL,
    "totalHexesMoved" INTEGER NOT NULL,
    "actionLog" JSONB,
    "deployment" JSONB,

    CONSTRAINT "GameClassStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameIdentityStats" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "won" BOOLEAN NOT NULL,
    "kills" INTEGER NOT NULL,
    "damageDealt" INTEGER NOT NULL,
    "damageReceived" INTEGER NOT NULL,
    "abilityUses" INTEGER NOT NULL,
    "cardsPlayed" INTEGER NOT NULL,

    CONSTRAINT "GameIdentityStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameClassStats_gameId_playerId_unitClass_key" ON "GameClassStats"("gameId", "playerId", "unitClass");

-- CreateIndex
CREATE UNIQUE INDEX "GameIdentityStats_gameId_playerId_identityId_key" ON "GameIdentityStats"("gameId", "playerId", "identityId");

-- AddForeignKey
ALTER TABLE "GameReplay" ADD CONSTRAINT "GameReplay_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameClassStats" ADD CONSTRAINT "GameClassStats_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameClassStats" ADD CONSTRAINT "GameClassStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameIdentityStats" ADD CONSTRAINT "GameIdentityStats_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameIdentityStats" ADD CONSTRAINT "GameIdentityStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

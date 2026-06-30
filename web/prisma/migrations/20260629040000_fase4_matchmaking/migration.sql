-- Migration: Fase 4 — Matchmaking (modelos QueueEntry, MatchSession, MatchPlayer, PendingInvite + GamePlayerPerformance + gameHistory en GameReplay)
-- Creada manualmente para sincronizar el schema.prisma con la BD existente

-- GameReplay.gameHistory
ALTER TABLE "GameReplay" ADD COLUMN IF NOT EXISTS "gameHistory" JSONB;

-- GamePlayerPerformance
CREATE TABLE IF NOT EXISTS "GamePlayerPerformance" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "winBonus" DOUBLE PRECISION NOT NULL,
    "hitRate" DOUBLE PRECISION NOT NULL,
    "damageTradeRatio" DOUBLE PRECISION NOT NULL,
    "survivalRate" DOUBLE PRECISION NOT NULL,
    "killParticipation" DOUBLE PRECISION NOT NULL,
    "counterEfficiency" DOUBLE PRECISION NOT NULL,
    "cardsPlayedPerTurn" DOUBLE PRECISION NOT NULL,
    "generalProtection" DOUBLE PRECISION NOT NULL,
    "firstBlood" DOUBLE PRECISION NOT NULL,
    "comeback" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "GamePlayerPerformance_pkey" PRIMARY KEY ("id")
);

-- QueueEntry
CREATE TABLE IF NOT EXISTS "QueueEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "elo" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueueEntry_pkey" PRIMARY KEY ("id")
);

-- MatchSession
CREATE TABLE IF NOT EXISTS "MatchSession" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userIds" JSONB NOT NULL,
    "type" TEXT NOT NULL,
    "isRanked" BOOLEAN NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchSession_pkey" PRIMARY KEY ("id")
);

-- MatchPlayer
CREATE TABLE IF NOT EXISTS "MatchPlayer" (
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MatchPlayer_pkey" PRIMARY KEY ("matchId","userId")
);

-- PendingInvite
CREATE TABLE IF NOT EXISTS "PendingInvite" (
    "id" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviterName" TEXT NOT NULL,
    "invitedId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingInvite_pkey" PRIMARY KEY ("id")
);

-- Unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "GamePlayerPerformance_gameId_playerId_key" ON "GamePlayerPerformance"("gameId", "playerId");
CREATE UNIQUE INDEX IF NOT EXISTS "QueueEntry_userId_key" ON "QueueEntry"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "MatchSession_gameId_key" ON "MatchSession"("gameId");

-- Foreign keys (con guardado para evitar duplicados)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GamePlayerPerformance_gameId_fkey') THEN
        ALTER TABLE "GamePlayerPerformance" ADD CONSTRAINT "GamePlayerPerformance_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GamePlayerPerformance_playerId_fkey') THEN
        ALTER TABLE "GamePlayerPerformance" ADD CONSTRAINT "GamePlayerPerformance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MatchPlayer_matchId_fkey') THEN
        ALTER TABLE "MatchPlayer" ADD CONSTRAINT "MatchPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "MatchSession"("gameId") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
        ALTER TABLE "MatchPlayer" DROP CONSTRAINT "MatchPlayer_matchId_fkey";
        ALTER TABLE "MatchPlayer" ADD CONSTRAINT "MatchPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "MatchSession"("gameId") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

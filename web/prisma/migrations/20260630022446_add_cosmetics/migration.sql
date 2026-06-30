-- CreateEnum
CREATE TYPE "CosmeticType" AS ENUM ('SKIN', 'WEAPON', 'BOARD', 'HEX_VARIANT', 'CLIMATE', 'LIGHTING', 'PROFILE_FRAME', 'AVATAR', 'PROFILE_BACKGROUND', 'TITLE', 'EMOTE', 'QUICK_MESSAGE', 'REACTION', 'LOADING_SCREEN', 'CURSOR', 'UI_THEME', 'MENU_BACKGROUND', 'ANIMATION_MOVEMENT', 'ANIMATION_ELIMINATION', 'ANIMATION_SUMMON', 'PET', 'COMPANION', 'BANNER');

-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('EARN', 'SPEND');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "coins" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Cosmetic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "CosmeticType" NOT NULL,
    "rarity" "Rarity" NOT NULL DEFAULT 'COMMON',
    "imageUrl" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cosmetic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCosmetic" (
    "userId" TEXT NOT NULL,
    "cosmeticId" TEXT NOT NULL,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "equippedAt" TIMESTAMP(3),

    CONSTRAINT "UserCosmetic_pkey" PRIMARY KEY ("userId","cosmeticId")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "concept" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserCosmetic" ADD CONSTRAINT "UserCosmetic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCosmetic" ADD CONSTRAINT "UserCosmetic_cosmeticId_fkey" FOREIGN KEY ("cosmeticId") REFERENCES "Cosmetic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

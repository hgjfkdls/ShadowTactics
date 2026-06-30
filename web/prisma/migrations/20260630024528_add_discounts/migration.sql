-- AlterTable
ALTER TABLE "Cosmetic" ADD COLUMN     "discountEndsAt" TIMESTAMP(3),
ADD COLUMN     "discountPercent" INTEGER NOT NULL DEFAULT 0;

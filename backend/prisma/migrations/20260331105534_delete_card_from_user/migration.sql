/*
  Warnings:

  - You are about to drop the column `userId` on the `card` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "card" DROP CONSTRAINT "card_userId_fkey";

-- DropIndex
DROP INDEX "card_userId_deckId_idx";

-- AlterTable
ALTER TABLE "card" DROP COLUMN "userId";

-- CreateIndex
CREATE INDEX "card_deckId_idx" ON "card"("deckId");

/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `card` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `card` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "card" ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "card_name_key" ON "card"("name");

/*
  Warnings:

  - A unique constraint covering the columns `[nafathId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[governmentId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."User_email_key";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "governmentId" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nafathId" TEXT,
ADD COLUMN     "step" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_nafathId_key" ON "public"."User"("nafathId");

-- CreateIndex
CREATE UNIQUE INDEX "User_governmentId_key" ON "public"."User"("governmentId");

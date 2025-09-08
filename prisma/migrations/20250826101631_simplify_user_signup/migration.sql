/*
  Warnings:

  - You are about to drop the column `userId` on the `ServiceProvider` table. All the data in the column will be lost.
  - You are about to drop the column `governmentId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `nafathId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `step` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nationalId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `hoaNumber` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `password` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nationalId` on table `User` required. This step will fail if there are existing NULL values in that column.

*/

-- First, handle existing data by providing default values
UPDATE "public"."User" SET "nationalId" = 'MIGRATED_' || id WHERE "nationalId" IS NULL;
UPDATE "public"."User" SET "hoaNumber" = 'MIGRATED_' || id WHERE "hoaNumber" IS NULL;
UPDATE "public"."User" SET "password" = '$2a$10$migrated.password.hash' WHERE "password" IS NULL;

-- DropForeignKey
ALTER TABLE "public"."ServiceProvider" DROP CONSTRAINT "ServiceProvider_userId_fkey";

-- DropIndex
DROP INDEX "public"."ServiceProvider_userId_key";

-- DropIndex
DROP INDEX "public"."User_governmentId_key";

-- DropIndex
DROP INDEX "public"."User_nafathId_key";

-- AlterTable
ALTER TABLE "public"."ServiceProvider" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "governmentId",
DROP COLUMN "nafathId",
DROP COLUMN "step",
ALTER COLUMN "hoaNumber" SET NOT NULL,
ALTER COLUMN "password" SET NOT NULL,
ALTER COLUMN "nationalId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_nationalId_key" ON "public"."User"("nationalId");

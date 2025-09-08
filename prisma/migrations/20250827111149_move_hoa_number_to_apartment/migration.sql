/*
  Warnings:

  - You are about to drop the column `hoaNumber` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[hoaNumber]` on the table `Apartment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hoaNumber` to the `Apartment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."User_hoaNumber_key";

-- AlterTable
ALTER TABLE "public"."Apartment" ADD COLUMN     "hoaNumber" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "hoaNumber";

-- CreateIndex
CREATE UNIQUE INDEX "Apartment_hoaNumber_key" ON "public"."Apartment"("hoaNumber");

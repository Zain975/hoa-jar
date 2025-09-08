/*
  Warnings:

  - You are about to drop the column `bankFirstName` on the `ServiceProvider` table. All the data in the column will be lost.
  - You are about to drop the column `bankLastName` on the `ServiceProvider` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."ServiceProvider" DROP COLUMN "bankFirstName",
DROP COLUMN "bankLastName",
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT;

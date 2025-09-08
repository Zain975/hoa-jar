/*
  Warnings:

  - The `bio` column on the `ServiceProvider` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `firstName` column on the `ServiceProvider` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `lastName` column on the `ServiceProvider` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `name` on the `ServiceProvider` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."ServiceProvider" DROP COLUMN "name",
ADD COLUMN     "name" JSONB NOT NULL,
DROP COLUMN "bio",
ADD COLUMN     "bio" JSONB,
DROP COLUMN "firstName",
ADD COLUMN     "firstName" JSONB,
DROP COLUMN "lastName",
ADD COLUMN     "lastName" JSONB;

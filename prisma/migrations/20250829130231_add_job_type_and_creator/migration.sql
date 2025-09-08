/*
  Warnings:

  - Added the required column `createdBy` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."JobType" AS ENUM ('HOME_SERVICE', 'COMMUNITY_SERVICE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "public"."JobStatus" ADD VALUE 'SENT_TO_LEADER';
ALTER TYPE "public"."JobStatus" ADD VALUE 'POSTED_BY_LEADER';

-- First add the columns as nullable
ALTER TABLE "public"."Job" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "jobType" "public"."JobType" DEFAULT 'HOME_SERVICE';

-- Update existing records to set default values
UPDATE "public"."Job" 
SET "createdBy" = "leaderId", 
    "jobType" = 'HOME_SERVICE' 
WHERE "createdBy" IS NULL;

-- Now make the columns required
ALTER TABLE "public"."Job" ALTER COLUMN "createdBy" SET NOT NULL;
ALTER TABLE "public"."Job" ALTER COLUMN "jobType" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Job" ADD CONSTRAINT "Job_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

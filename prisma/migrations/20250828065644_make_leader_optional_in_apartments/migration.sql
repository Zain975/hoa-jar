-- DropForeignKey
ALTER TABLE "public"."Apartment" DROP CONSTRAINT "Apartment_leaderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Job" DROP CONSTRAINT "Job_leaderId_fkey";

-- AlterTable
ALTER TABLE "public"."Apartment" ALTER COLUMN "leaderId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Job" ALTER COLUMN "leaderId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Apartment" ADD CONSTRAINT "Apartment_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Job" ADD CONSTRAINT "Job_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

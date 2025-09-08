-- DropIndex
DROP INDEX "public"."Service_name_key";

-- AlterTable
ALTER TABLE "public"."Apartment" ALTER COLUMN "country" SET DEFAULT '{"en": "Saudi Arabia", "ar": "السعودية"}';

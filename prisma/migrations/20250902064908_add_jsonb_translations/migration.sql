/*
  Warnings:

  - Converting existing string data to JSONB format with English and Arabic translations
  - This migration preserves existing data by converting strings to JSONB objects

*/

-- DropIndex
DROP INDEX "public"."Service_name_key";

-- Create temporary columns for Apartment table
ALTER TABLE "public"."Apartment" ADD COLUMN "name_temp" JSONB;
ALTER TABLE "public"."Apartment" ADD COLUMN "address_temp" JSONB;
ALTER TABLE "public"."Apartment" ADD COLUMN "city_temp" JSONB;
ALTER TABLE "public"."Apartment" ADD COLUMN "state_temp" JSONB;
ALTER TABLE "public"."Apartment" ADD COLUMN "country_temp" JSONB;

-- Convert existing data to JSONB format for Apartment
UPDATE "public"."Apartment" SET 
  "name_temp" = jsonb_build_object('en', "name", 'ar', "name"),
  "address_temp" = jsonb_build_object('en', "address", 'ar', "address"),
  "city_temp" = jsonb_build_object('en', "city", 'ar', "city"),
  "state_temp" = CASE 
    WHEN "state" IS NOT NULL THEN jsonb_build_object('en', "state", 'ar', "state")
    ELSE NULL
  END,
  "country_temp" = jsonb_build_object('en', "country", 'ar', "country");

-- Drop old columns and rename temp columns for Apartment
ALTER TABLE "public"."Apartment" DROP COLUMN "name";
ALTER TABLE "public"."Apartment" DROP COLUMN "address";
ALTER TABLE "public"."Apartment" DROP COLUMN "city";
ALTER TABLE "public"."Apartment" DROP COLUMN "state";
ALTER TABLE "public"."Apartment" DROP COLUMN "country";

ALTER TABLE "public"."Apartment" RENAME COLUMN "name_temp" TO "name";
ALTER TABLE "public"."Apartment" RENAME COLUMN "address_temp" TO "address";
ALTER TABLE "public"."Apartment" RENAME COLUMN "city_temp" TO "city";
ALTER TABLE "public"."Apartment" RENAME COLUMN "state_temp" TO "state";
ALTER TABLE "public"."Apartment" RENAME COLUMN "country_temp" TO "country";

-- Make columns NOT NULL where required
ALTER TABLE "public"."Apartment" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "public"."Apartment" ALTER COLUMN "address" SET NOT NULL;
ALTER TABLE "public"."Apartment" ALTER COLUMN "city" SET NOT NULL;
ALTER TABLE "public"."Apartment" ALTER COLUMN "country" SET NOT NULL;

-- Create temporary columns for Bid table
ALTER TABLE "public"."Bid" ADD COLUMN "coverLetter_temp" JSONB;

-- Convert existing data to JSONB format for Bid
UPDATE "public"."Bid" SET 
  "coverLetter_temp" = jsonb_build_object('en', "coverLetter", 'ar', "coverLetter");

-- Drop old column and rename temp column for Bid
ALTER TABLE "public"."Bid" DROP COLUMN "coverLetter";
ALTER TABLE "public"."Bid" RENAME COLUMN "coverLetter_temp" TO "coverLetter";
ALTER TABLE "public"."Bid" ALTER COLUMN "coverLetter" SET NOT NULL;

-- Create temporary columns for Job table
ALTER TABLE "public"."Job" ADD COLUMN "title_temp" JSONB;
ALTER TABLE "public"."Job" ADD COLUMN "description_temp" JSONB;
ALTER TABLE "public"."Job" ADD COLUMN "charges_temp" JSONB;
ALTER TABLE "public"."Job" ADD COLUMN "workDuration_temp" JSONB;
ALTER TABLE "public"."Job" ADD COLUMN "timeSlot_temp" JSONB;
ALTER TABLE "public"."Job" ADD COLUMN "location_temp" JSONB;
ALTER TABLE "public"."Job" ADD COLUMN "experienceLevel_temp" JSONB;

-- Convert existing data to JSONB format for Job
UPDATE "public"."Job" SET 
  "title_temp" = jsonb_build_object('en', "title", 'ar', "title"),
  "description_temp" = jsonb_build_object('en', "description", 'ar', "description"),
  "charges_temp" = jsonb_build_object('en', "charges", 'ar', "charges"),
  "workDuration_temp" = jsonb_build_object('en', "workDuration", 'ar', "workDuration"),
  "timeSlot_temp" = jsonb_build_object('en', "timeSlot", 'ar', "timeSlot"),
  "location_temp" = jsonb_build_object('en', "location", 'ar', "location"),
  "experienceLevel_temp" = CASE 
    WHEN "experienceLevel" IS NOT NULL THEN jsonb_build_object('en', "experienceLevel", 'ar', "experienceLevel")
    ELSE NULL
  END;

-- Drop old columns and rename temp columns for Job
ALTER TABLE "public"."Job" DROP COLUMN "title";
ALTER TABLE "public"."Job" DROP COLUMN "description";
ALTER TABLE "public"."Job" DROP COLUMN "charges";
ALTER TABLE "public"."Job" DROP COLUMN "workDuration";
ALTER TABLE "public"."Job" DROP COLUMN "timeSlot";
ALTER TABLE "public"."Job" DROP COLUMN "location";
ALTER TABLE "public"."Job" DROP COLUMN "experienceLevel";

ALTER TABLE "public"."Job" RENAME COLUMN "title_temp" TO "title";
ALTER TABLE "public"."Job" RENAME COLUMN "description_temp" TO "description";
ALTER TABLE "public"."Job" RENAME COLUMN "charges_temp" TO "charges";
ALTER TABLE "public"."Job" RENAME COLUMN "workDuration_temp" TO "workDuration";
ALTER TABLE "public"."Job" RENAME COLUMN "timeSlot_temp" TO "timeSlot";
ALTER TABLE "public"."Job" RENAME COLUMN "location_temp" TO "location";
ALTER TABLE "public"."Job" RENAME COLUMN "experienceLevel_temp" TO "experienceLevel";

-- Make columns NOT NULL where required for Job
ALTER TABLE "public"."Job" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "public"."Job" ALTER COLUMN "description" SET NOT NULL;
ALTER TABLE "public"."Job" ALTER COLUMN "charges" SET NOT NULL;
ALTER TABLE "public"."Job" ALTER COLUMN "workDuration" SET NOT NULL;
ALTER TABLE "public"."Job" ALTER COLUMN "timeSlot" SET NOT NULL;
ALTER TABLE "public"."Job" ALTER COLUMN "location" SET NOT NULL;

-- Create temporary columns for Service table
ALTER TABLE "public"."Service" ADD COLUMN "name_temp" JSONB;
ALTER TABLE "public"."Service" ADD COLUMN "description_temp" JSONB;

-- Convert existing data to JSONB format for Service
UPDATE "public"."Service" SET 
  "name_temp" = jsonb_build_object('en', "name", 'ar', "name"),
  "description_temp" = CASE 
    WHEN "description" IS NOT NULL THEN jsonb_build_object('en', "description", 'ar', "description")
    ELSE NULL
  END;

-- Drop old columns and rename temp columns for Service
ALTER TABLE "public"."Service" DROP COLUMN "name";
ALTER TABLE "public"."Service" DROP COLUMN "description";

ALTER TABLE "public"."Service" RENAME COLUMN "name_temp" TO "name";
ALTER TABLE "public"."Service" RENAME COLUMN "description_temp" TO "description";

-- Make columns NOT NULL where required for Service
ALTER TABLE "public"."Service" ALTER COLUMN "name" SET NOT NULL;

-- Recreate the unique index for Service name
CREATE UNIQUE INDEX "Service_name_key" ON "public"."Service"("name");
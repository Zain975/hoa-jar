/*
  Warnings:

  - You are about to drop the column `serviceId` on the `Job` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Job" DROP CONSTRAINT "Job_serviceId_fkey";

-- AlterTable
ALTER TABLE "public"."Job" DROP COLUMN "serviceId";

-- CreateTable
CREATE TABLE "public"."JobService" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobService_jobId_serviceId_key" ON "public"."JobService"("jobId", "serviceId");

-- AddForeignKey
ALTER TABLE "public"."JobService" ADD CONSTRAINT "JobService_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JobService" ADD CONSTRAINT "JobService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PAID', 'PENDING', 'PARTIAL');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "exemptionReason" TEXT,
ADD COLUMN     "isFeeExempt" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PassoutStudent" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "contactNumber" TEXT,
    "academicYear" TEXT NOT NULL,
    "feesStatus" "Status" NOT NULL DEFAULT 'PENDING',
    "pendingAmount" INTEGER NOT NULL DEFAULT 0,
    "tcTaken" BOOLEAN NOT NULL DEFAULT false,
    "resultCollected" BOOLEAN NOT NULL DEFAULT false,
    "booksPaid" BOOLEAN NOT NULL DEFAULT false,
    "uniformPaid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassoutStudent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PassoutStudent_fullName_academicYear_idx" ON "PassoutStudent"("fullName", "academicYear");

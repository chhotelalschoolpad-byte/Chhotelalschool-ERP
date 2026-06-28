-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'USER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "religion" TEXT,
    "caste" TEXT,
    "fatherName" TEXT NOT NULL,
    "motherName" TEXT,
    "mobile1" TEXT NOT NULL,
    "mobile2" TEXT,
    "address" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "className" TEXT NOT NULL,
    "previousSchool" TEXT,
    "admissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isExisting" BOOLEAN NOT NULL DEFAULT false,
    "joiningYear" INTEGER,
    "previousDue" INTEGER NOT NULL DEFAULT 0,
    "previousDuePaid" INTEGER NOT NULL DEFAULT 0,
    "aadhaarNumber" TEXT,
    "parentAadhaarNumber" TEXT,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeStructure" (
    "id" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "monthlyFee" INTEGER NOT NULL,
    "admissionFee" INTEGER NOT NULL,
    "examFee" INTEGER NOT NULL,
    "extraFees" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vanChargeFee" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "month" TEXT NOT NULL DEFAULT '',
    "amount" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "paymentMode" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentItems" JSONB NOT NULL,
    "isMonthlyPaid" BOOLEAN NOT NULL DEFAULT false,
    "previousDueCleared" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletedPayment" (
    "id" TEXT NOT NULL,
    "originalPaymentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "paymentSnapshot" JSONB NOT NULL,
    "deletedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autoDeleteAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeletedPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolSettings" (
    "id" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "logoBase64" TEXT,
    "address" TEXT,
    "contactNumber" TEXT,
    "ownerName" TEXT,
    "upiId" TEXT,
    "bankName" TEXT,
    "accountHolder" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "branch" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nameLastChanged" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "defaultClasses" JSONB NOT NULL,
    "feeTypes" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Student_admissionNumber_key" ON "Student"("admissionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FeeStructure_className_key" ON "FeeStructure"("className");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletedPayment" ADD CONSTRAINT "DeletedPayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

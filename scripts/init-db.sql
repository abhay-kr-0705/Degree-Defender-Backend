-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'VERIFIER', 'STUDENT', 'PUBLIC');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('UNIVERSITY', 'COLLEGE', 'INSTITUTE', 'BOARD');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PUBLIC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "institutionId" TEXT,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "InstitutionType" NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "establishedYear" INTEGER,
    "affiliatedUniversity" TEXT,
    "recognitionNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "fatherName" TEXT,
    "motherName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "course" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "specialization" TEXT,
    "passingYear" INTEGER NOT NULL,
    "grade" TEXT,
    "cgpa" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "dateOfIssue" TIMESTAMP(3) NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'PENDING',
    "institutionId" TEXT NOT NULL,
    "issuedBy" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "blockchainHash" TEXT,
    "qrCode" TEXT,
    "digitalSignature" TEXT,
    "documentPath" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestorEmail" TEXT NOT NULL,
    "purpose" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationCode" TEXT NOT NULL,
    "isValid" BOOLEAN,
    "confidenceScore" DOUBLE PRECISION,
    "verificationMethod" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "flaggedReasons" TEXT[],
    "notes" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "institutions_code_key" ON "institutions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certificateNumber_key" ON "certificates"("certificateNumber");

-- CreateIndex
CREATE INDEX "certificates_studentName_idx" ON "certificates"("studentName");

-- CreateIndex
CREATE INDEX "certificates_institutionId_idx" ON "certificates"("institutionId");

-- CreateIndex
CREATE INDEX "certificates_status_idx" ON "certificates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "verifications_verificationCode_key" ON "verifications"("verificationCode");

-- CreateIndex
CREATE INDEX "verifications_certificateId_idx" ON "verifications"("certificateId");

-- CreateIndex
CREATE INDEX "verifications_status_idx" ON "verifications"("status");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "certificates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

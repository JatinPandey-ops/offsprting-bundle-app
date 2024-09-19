/*
  Warnings:

  - The primary key for the `BundleVariant` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "BundleVariant" DROP CONSTRAINT "BundleVariant_pkey",
ADD CONSTRAINT "BundleVariant_pkey" PRIMARY KEY ("variantId", "bundleId");

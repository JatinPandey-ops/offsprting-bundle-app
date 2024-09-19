-- CreateTable
CREATE TABLE "BundleVariant" (
    "bundleId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,

    CONSTRAINT "BundleVariant_pkey" PRIMARY KEY ("bundleId","variantId")
);

-- AddForeignKey
ALTER TABLE "BundleVariant" ADD CONSTRAINT "BundleVariant_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleVariant" ADD CONSTRAINT "BundleVariant_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

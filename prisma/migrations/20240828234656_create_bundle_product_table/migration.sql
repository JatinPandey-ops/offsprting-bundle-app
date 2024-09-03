/*
  Warnings:

  - You are about to drop the `_ProductBundles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_ProductBundles";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "BundleProduct" (
    "productId" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,

    PRIMARY KEY ("productId", "bundleId"),
    CONSTRAINT "BundleProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("shopifyProductId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BundleProduct_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

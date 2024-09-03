/*
  Warnings:

  - You are about to drop the `_BundleProducts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `name` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `placeholderProductId` on the `Bundle` table. All the data in the column will be lost.
  - The primary key for the `Product` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Product` table. All the data in the column will be lost.
  - Added the required column `handle` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shopifyProductId` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "_BundleProducts_B_index";

-- DropIndex
DROP INDEX "_BundleProducts_AB_unique";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_BundleProducts";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Variant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "sku" TEXT,
    "inventoryQuantity" INTEGER,
    "weight" REAL,
    "weightUnit" TEXT,
    "requiresShipping" BOOLEAN NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("shopifyProductId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "src" TEXT NOT NULL,
    "altText" TEXT,
    "productId" TEXT NOT NULL,
    CONSTRAINT "Image_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("shopifyProductId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ProductBundles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProductBundles_A_fkey" FOREIGN KEY ("A") REFERENCES "Bundle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProductBundles_B_fkey" FOREIGN KEY ("B") REFERENCES "Product" ("shopifyProductId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bundle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userChosenName" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "compareAtPrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Bundle" ("createdAt", "id", "price", "updatedAt", "userChosenName") SELECT "createdAt", "id", "price", "updatedAt", "userChosenName" FROM "Bundle";
DROP TABLE "Bundle";
ALTER TABLE "new_Bundle" RENAME TO "Bundle";
CREATE TABLE "new_Product" (
    "shopifyProductId" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "descriptionHtml" TEXT,
    "productType" TEXT,
    "vendor" TEXT,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("createdAt", "title", "updatedAt") SELECT "createdAt", "title", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_handle_key" ON "Product"("handle");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_ProductBundles_AB_unique" ON "_ProductBundles"("A", "B");

-- CreateIndex
CREATE INDEX "_ProductBundles_B_index" ON "_ProductBundles"("B");

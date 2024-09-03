/*
  Warnings:

  - You are about to drop the column `available` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `barcode` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `compareAtPrice` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `featuredImage` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `featuredMedia` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `incoming` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `inventoryManagement` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `inventoryPolicy` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `matched` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `metafields` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `nextIncomingDate` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `option1` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `option2` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `option3` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `options` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `quantityPriceBreaks` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `quantityRule` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `requiresSellingPlan` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `selected` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `selectedSellingPlanAllocation` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `sellingPlanAllocations` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `storeAvailabilities` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `taxable` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `unitPrice` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `unitPriceMeasurement` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `Variant` table. All the data in the column will be lost.
  - You are about to drop the column `weightInUnit` on the `Variant` table. All the data in the column will be lost.
  - Made the column `price` on table `Variant` required. This step will fail if there are existing NULL values in that column.
  - Made the column `productId` on table `Variant` required. This step will fail if there are existing NULL values in that column.
  - Made the column `title` on table `Variant` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Variant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "sku" TEXT,
    "inventoryQuantity" INTEGER,
    "weight" REAL,
    "weightUnit" TEXT,
    "requiresShipping" BOOLEAN,
    "productId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("shopifyProductId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Variant" ("createdAt", "id", "inventoryQuantity", "price", "productId", "requiresShipping", "sku", "title", "updatedAt", "weight", "weightUnit") SELECT "createdAt", "id", "inventoryQuantity", "price", "productId", "requiresShipping", "sku", "title", "updatedAt", "weight", "weightUnit" FROM "Variant";
DROP TABLE "Variant";
ALTER TABLE "new_Variant" RENAME TO "Variant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

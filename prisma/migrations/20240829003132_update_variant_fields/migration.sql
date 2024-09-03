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

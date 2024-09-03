-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Variant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "available" BOOLEAN,
    "barcode" TEXT,
    "compareAtPrice" REAL,
    "featuredImage" TEXT,
    "featuredMedia" TEXT,
    "image" TEXT,
    "incoming" BOOLEAN,
    "inventoryManagement" TEXT,
    "inventoryPolicy" TEXT,
    "inventoryQuantity" INTEGER,
    "matched" BOOLEAN,
    "metafields" TEXT,
    "nextIncomingDate" DATETIME,
    "option1" TEXT,
    "option2" TEXT,
    "option3" TEXT,
    "options" TEXT,
    "price" REAL,
    "productId" TEXT,
    "quantityPriceBreaks" TEXT,
    "quantityRule" TEXT,
    "requiresSellingPlan" BOOLEAN,
    "requiresShipping" BOOLEAN,
    "selected" BOOLEAN,
    "selectedSellingPlanAllocation" TEXT,
    "sellingPlanAllocations" TEXT,
    "sku" TEXT,
    "storeAvailabilities" TEXT,
    "taxable" BOOLEAN,
    "title" TEXT,
    "unitPrice" REAL,
    "unitPriceMeasurement" TEXT,
    "url" TEXT,
    "weight" REAL,
    "weightInUnit" REAL,
    "weightUnit" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("shopifyProductId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Variant" ("createdAt", "id", "inventoryQuantity", "price", "productId", "requiresShipping", "sku", "title", "updatedAt", "weight", "weightUnit") SELECT "createdAt", "id", "inventoryQuantity", "price", "productId", "requiresShipping", "sku", "title", "updatedAt", "weight", "weightUnit" FROM "Variant";
DROP TABLE "Variant";
ALTER TABLE "new_Variant" RENAME TO "Variant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

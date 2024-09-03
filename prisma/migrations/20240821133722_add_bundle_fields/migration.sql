-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bundle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "userChosenName" TEXT,
    "price" REAL,
    "placeholderProductId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Bundle" ("createdAt", "id", "name", "placeholderProductId", "price", "updatedAt", "userChosenName") SELECT "createdAt", "id", "name", "placeholderProductId", "price", "updatedAt", "userChosenName" FROM "Bundle";
DROP TABLE "Bundle";
ALTER TABLE "new_Bundle" RENAME TO "Bundle";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

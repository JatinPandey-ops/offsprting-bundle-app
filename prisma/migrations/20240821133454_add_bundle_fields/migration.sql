/*
  Warnings:

  - Added the required column `price` to the `Bundle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userChosenName` to the `Bundle` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bundle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "userChosenName" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "placeholderProductId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Bundle" ("createdAt", "id", "name", "updatedAt") SELECT "createdAt", "id", "name", "updatedAt" FROM "Bundle";
DROP TABLE "Bundle";
ALTER TABLE "new_Bundle" RENAME TO "Bundle";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

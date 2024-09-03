/*
  Warnings:

  - Made the column `price` on table `Bundle` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userChosenName` on table `Bundle` required. This step will fail if there are existing NULL values in that column.

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
INSERT INTO "new_Bundle" ("createdAt", "id", "name", "placeholderProductId", "price", "updatedAt", "userChosenName") SELECT "createdAt", "id", "name", "placeholderProductId", "price", "updatedAt", "userChosenName" FROM "Bundle";
DROP TABLE "Bundle";
ALTER TABLE "new_Bundle" RENAME TO "Bundle";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

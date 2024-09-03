/*
  Warnings:

  - A unique constraint covering the columns `[placeholderProductId]` on the table `Bundle` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Bundle_placeholderProductId_key" ON "Bundle"("placeholderProductId");

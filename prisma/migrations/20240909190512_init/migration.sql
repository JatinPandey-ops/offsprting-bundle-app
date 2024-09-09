/*
  Warnings:

  - The primary key for the `bundle` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `bundleproduct` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `image` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `product` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `variant` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE `bundleproduct` DROP FOREIGN KEY `BundleProduct_bundleId_fkey`;

-- DropForeignKey
ALTER TABLE `bundleproduct` DROP FOREIGN KEY `BundleProduct_productId_fkey`;

-- DropForeignKey
ALTER TABLE `image` DROP FOREIGN KEY `Image_productId_fkey`;

-- DropForeignKey
ALTER TABLE `variant` DROP FOREIGN KEY `Variant_productId_fkey`;

-- AlterTable
ALTER TABLE `bundle` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `bundleproduct` DROP PRIMARY KEY,
    MODIFY `productId` VARCHAR(191) NOT NULL,
    MODIFY `bundleId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`productId`, `bundleId`);

-- AlterTable
ALTER TABLE `image` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `productId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `product` DROP PRIMARY KEY,
    MODIFY `shopifyProductId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`shopifyProductId`);

-- AlterTable
ALTER TABLE `variant` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `productId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AddForeignKey
ALTER TABLE `Variant` ADD CONSTRAINT `Variant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`shopifyProductId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Image` ADD CONSTRAINT `Image_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`shopifyProductId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BundleProduct` ADD CONSTRAINT `BundleProduct_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`shopifyProductId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BundleProduct` ADD CONSTRAINT `BundleProduct_bundleId_fkey` FOREIGN KEY (`bundleId`) REFERENCES `Bundle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

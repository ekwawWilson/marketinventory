-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "promoPrice" DOUBLE PRECISION,
ADD COLUMN     "retailPrice" DOUBLE PRECISION,
ADD COLUMN     "wholesalePrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "enableDiscounts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enablePromoPrice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableRetailPrice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableWholesalePrice" BOOLEAN NOT NULL DEFAULT false;

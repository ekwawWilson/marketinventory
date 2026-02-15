-- Add receipt settings to Tenant table
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "showManufacturerOnReceipt" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "receiptPrinterWidth" TEXT NOT NULL DEFAULT '80mm';

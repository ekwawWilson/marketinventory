-- What a confirmed MoMo payment should record.
--
-- Recovery only ever worked for POS sales: the payload was assumed to be a
-- cart. A customer settling their balance was charged, the payment marked
-- SUCCESS, and nothing written against the customer — their debt stood after
-- they had paid. Naming the intent lets the callback replay either.

CREATE TYPE "MomoIntent" AS ENUM ('SALE', 'CUSTOMER_PAYMENT');

ALTER TABLE "MomoTransaction" ADD COLUMN "intent" "MomoIntent";

-- Existing rows carrying a payload are POS sales; that was the only writer.
UPDATE "MomoTransaction" SET "intent" = 'SALE' WHERE "salePayload" IS NOT NULL;

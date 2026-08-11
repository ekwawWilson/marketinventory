-- Foreign keys from branch-scoped records to Branch.
--
-- Only User referenced Branch before this. Every other branchId was an
-- unconstrained string, so nothing at the database level stopped a branch being
-- deleted out from under its sales and stock, or a bad id being written. An
-- orphaned row is worse than a missing one: branch scoping is strict equality,
-- so a record pointing at a branch that no longer exists is invisible from
-- every branch — silently absent from stock counts, takings and reports.
--
-- RESTRICT rather than CASCADE: the delete handler already refuses to remove a
-- branch that still has records and names what is in the way. This enforces
-- that promise instead of quietly destroying a branch's history.
--
-- Verified clean before writing: zero dangling references across all of these
-- tables in production.

ALTER TABLE "Item" ADD CONSTRAINT "Item_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Sale" ADD CONSTRAINT "Sale_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MomoTransaction" ADD CONSTRAINT "MomoTransaction_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Branch scoping filters on these constantly; without an index every branch
-- view is a sequential scan that grows with the whole tenant's history.
-- Composite, leading with tenantId: every scoped query filters on both, and a
-- tenantId-first index serves tenant-only queries as well.
CREATE INDEX IF NOT EXISTS "Sale_tenantId_branchId_idx" ON "Sale"("tenantId", "branchId");
CREATE INDEX IF NOT EXISTS "Item_tenantId_branchId_idx" ON "Item"("tenantId", "branchId");
CREATE INDEX IF NOT EXISTS "Purchase_tenantId_branchId_idx" ON "Purchase"("tenantId", "branchId");
CREATE INDEX IF NOT EXISTS "Expense_tenantId_branchId_idx" ON "Expense"("tenantId", "branchId");

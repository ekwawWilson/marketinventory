# PETROS Business Management Mini — Feature Roadmap

_Last updated: 2026-02-19_
_Maintained by: EYO Solutions_

---

## Current System Summary

| Metric | Count |
|--------|-------|
| Page routes | 44 |
| API endpoints | 29 |
| Database models | 12 |
| User roles | 6 |
| Permissions | 24 |
| Reports | 6 |

### What's Already Built ✅

- Full sales & purchase cycle with atomic stock updates
- Customer & supplier management with debt/credit tracking
- Returns processing (cash refund, credit, exchange)
- Stock adjustments with history
- 6 reports: End-of-Day, Sales, Purchases, Inventory, Debtors, Creditors
- 6 user roles with 24 granular permissions (OWNER, STORE_MANAGER, CASHIER, INVENTORY_MANAGER, ACCOUNTANT, STAFF)
- Multi-tenant architecture (multiple businesses, one deployment)
- CSV bulk import for items and customers
- Thermal receipt printing
- 3 payment methods: Cash, MoMo, Bank
- Per-tenant feature flags (unit system, pricing tiers, discounts)
- PWA support (fullscreen on mobile when added to home screen)
- Role-based access control on every API route

---

## Feature Gaps & Roadmap

Features are grouped by priority. Build them in order — check off each item as it is completed.

---

## PRIORITY 1 — High Impact, Fixes Core Gaps

### 1.1 Expense Tracking
**Status:** `[x] Done — 2026-02-19`

**Why:** Non-inventory costs (rent, salaries, electricity, transport) are not recorded. The profit report currently shows Revenue − COGS only, which overstates profit significantly.

**What to build:**
- `Expense` model in Prisma (amount, category, description, date, paidBy, tenantId)
- Expense categories: Rent, Salaries, Utilities, Transport, Marketing, Maintenance, Other
- `/expenses` page — list expenses with date filter and category filter
- `/expenses/new` — add expense form
- `POST/GET /api/expenses` route
- Include expenses in End-of-Day report profit section (Revenue − COGS − Expenses = Net Profit)
- Include expenses in the Sales/Profit report

**Files to create:**
- `prisma/schema.prisma` — add `Expense` model
- `app/expenses/page.tsx`
- `app/expenses/new/page.tsx`
- `app/api/expenses/route.ts`

**Files to modify:**
- `app/api/reports/route.ts` — add expense deduction to profit calc
- `app/reports/end-of-day/page.tsx` — show net profit with expenses
- `components/layout/Sidebar.tsx` — add Expenses nav item
- `lib/permissions/rbac.ts` — add `create_expenses`, `view_expenses` permissions

---

### 1.2 Dashboard Charts / Analytics
**Status:** `[x] Done — 2026-02-19`

**Why:** The dashboard has quick-action buttons but no visual data. Owners and managers need to see trends at a glance — sales by day, top items, revenue vs purchases.

**What to build:**
- Bar chart: Sales revenue by day (last 7 days)
- Line chart: Daily sales count (last 14 days)
- Donut chart: Payment method split (Cash vs MoMo vs Bank)
- Top 5 selling items (bar or horizontal list)
- Summary KPI cards: Today's revenue, total customers, total stock value, outstanding debt

**Library:** Use `recharts` (lightweight, works with Next.js, no SSR issues with `'use client'`)

**Files to create:**
- `components/dashboard/SalesChart.tsx`
- `components/dashboard/PaymentMethodChart.tsx`
- `components/dashboard/TopItemsChart.tsx`
- `app/api/dashboard/route.ts` — dedicated dashboard data endpoint

**Files to modify:**
- `app/dashboard/page.tsx` (or dashboard component) — embed charts below quick actions

---

### 1.3 Till / Cash Register Management
**Status:** `[x] Done — 2026-02-19`

**Why:** There is no record of how much cash should be in the till at any time. Cashiers can't open/close a shift, and owners can't detect cash discrepancies.

**What to build:**
- `CashRegister` model (openedAt, closedAt, openingFloat, closingCount, userId, tenantId)
- `CashRegisterEntry` model (amount, type: SALE/PAYMENT/EXPENSE, reference)
- `/till` page — open shift (enter opening float), view running total, close shift (enter counted cash)
- Shift summary: expected cash vs counted cash, variance
- Till history: past shifts with variance

**Files to create:**
- `prisma/schema.prisma` — add `CashRegister`, `CashRegisterEntry` models
- `app/till/page.tsx`
- `app/api/till/route.ts`

**Files to modify:**
- `components/layout/Sidebar.tsx` — add Till nav item
- `lib/permissions/rbac.ts` — add `manage_till` permission (CASHIER, STORE_MANAGER, OWNER)

---

### 1.4 Audit Log Page
**Status:** `[x] Done — 2026-02-19`

**Why:** The `AuditLog` model and `/api/audit-logs` endpoint already exist and are collecting data, but there is no UI page to view them. Owners cannot see what staff did.

**What to build:**
- `/audit-logs` page — list audit events with filters
- Filter by: user, action type, date range
- Show: timestamp, user name, action, affected record, before/after values
- OWNER and STORE_MANAGER only

**Files to create:**
- `app/audit-logs/page.tsx`

**Files to modify:**
- `components/layout/Sidebar.tsx` — add Audit Log nav item (OWNER only)
- `app/api/audit-logs/route.ts` — verify filters are implemented

---

### 1.5 Data Export (Excel / PDF)
**Status:** `[x] Done — 2026-02-19`

**Why:** Reports are view-only. Owners can't send data to their accountant or keep offline backups.

**What to build:**
- Export button on all report pages → download as CSV/Excel
- Export button on lists (Sales, Purchases, Items, Customers, Suppliers) → download filtered data as CSV
- Print-to-PDF already works via browser print; enhance with better print styles

**Library:** Use `xlsx` package for Excel export (client-side, no server needed)

**Files to modify:**
- `app/reports/sales/page.tsx` — add export button
- `app/reports/purchases/page.tsx` — add export button
- `app/reports/inventory/page.tsx` — add export button
- `app/reports/end-of-day/page.tsx` — add export button
- `app/sales/page.tsx` — add CSV export
- `app/items/page.tsx` — add CSV export
- `app/customers/page.tsx` — add CSV export

---

## PRIORITY 2 — Medium Impact, Standard Features

### 2.1 Quotation / Proforma Invoice
**Status:** `[ ] Not started`

**Why:** Many businesses need to send a price quote to a customer before confirming a sale. Without this, staff manually write quotes on paper.

**What to build:**
- `Quotation` model (customer, items, total, status: DRAFT/SENT/ACCEPTED/REJECTED/EXPIRED)
- `/quotations` page — list quotations
- `/quotations/new` — create quotation (reuse SaleForm item selector)
- Convert quotation → Sale with one click
- Print/share quotation as PDF

**Files to create:**
- `prisma/schema.prisma` — add `Quotation`, `QuotationItem` models
- `app/quotations/page.tsx`
- `app/quotations/new/page.tsx`
- `app/api/quotations/route.ts`

---

### 2.2 Customer Statement PDF Export
**Status:** `[ ] Not started`

**Why:** Customer statements are viewable on screen but cannot be downloaded or sent. Suppliers and customers need a paper/PDF copy for reconciliation.

**What to build:**
- "Download PDF" button on `/customers/[id]/statement`
- "Download PDF" button on `/suppliers/[id]/statement`
- Use browser print with a print-optimized stylesheet, or `@react-pdf/renderer`

**Files to modify:**
- `app/customers/[id]/statement/page.tsx`
- `app/suppliers/[id]/statement/page.tsx`

---

### 2.3 Stock Expiry Date Tracking
**Status:** `[ ] Not started`

**Why:** Critical for pharmacies, food/beverage businesses. Expired stock sold is a legal and health risk.

**What to build:**
- `expiryDate` optional field on `Item` model
- Show expiry date on item list (highlight items expiring within 30 days)
- Expiry alerts section in End-of-Day report
- Filter: "Expiring soon" tab on Items page

**Files to modify:**
- `prisma/schema.prisma` — add `expiryDate` to `Item`
- `app/items/page.tsx` — expiry column + filter tab
- `app/api/reports/route.ts` — expiry alerts in end-of-day

---

### 2.4 Per-Line Discount on Sales
**Status:** `[ ] Not started`

**Why:** Discounts currently exist as a feature flag toggle, but there is no UI to apply a discount per line item during a sale. Cashiers negotiate different prices for different customers.

**What to build:**
- Discount % or fixed amount field per cart line in SaleForm
- Store `discountAmount` on `SaleItem` model
- Show discount on receipt and sale detail

**Files to modify:**
- `prisma/schema.prisma` — add `discountAmount` to `SaleItem`
- `components/forms/SaleForm.tsx` — add discount input per item
- `app/api/sales/route.ts` — handle discount in total calc
- `components/ThermalReceipt.tsx` — show discount on receipt

---

### 2.5 Purchase Order (Before Delivery)
**Status:** `[ ] Not started`

**Why:** Currently a purchase is recorded after goods arrive. Best practice is to raise a Purchase Order (PO) to the supplier first, then confirm when goods are received (GRN).

**What to build:**
- `PurchaseOrder` model with status: DRAFT / SENT / RECEIVED / CANCELLED
- Convert PO → Purchase (GRN) on delivery
- PO list and detail pages

---

## PRIORITY 3 — Nice to Have

### 3.1 SMS / WhatsApp Notifications
**Status:** `[ ] Not started`

**Why:** Alert customers of outstanding balances. Send payment confirmation. Use a Ghana-based SMS gateway (e.g. Hubtel, mNotify) or WhatsApp Business API.

---

### 3.2 Customer Loyalty / Points
**Status:** `[ ] Not started`

**Why:** Encourage repeat purchases. Award points per sale, redeem for discounts.

---

### 3.3 Multiple Branches / Warehouses
**Status:** `[ ] Not started`

**Why:** Businesses with more than one location need separate stock per branch, with a consolidated owner view. Requires significant schema changes (add `branchId` to Item, Sale, Purchase, etc.)

---

### 3.4 Recurring Sales / Subscriptions
**Status:** `[ ] Not started`

**Why:** Useful for contract customers who receive the same order monthly.

---

### 3.5 Supplier Price History
**Status:** `[ ] Not started`

**Why:** Track how cost prices change over time per supplier, helping negotiate better rates.

---

## Build Progress Tracker

| # | Feature | Priority | Status |
|---|---------|----------|--------|
| 1.1 | Expense Tracking | HIGH | `[x] Done — 2026-02-19` |
| 1.2 | Dashboard Charts | HIGH | `[x] Done — 2026-02-19` |
| 1.3 | Till / Cash Register | HIGH | `[x] Done — 2026-02-19` |
| 1.4 | Audit Log Page | HIGH | `[x] Done — 2026-02-19` |
| 1.5 | Data Export (Excel/CSV) | HIGH | `[x] Done — 2026-02-19` |
| 2.1 | Quotation / Proforma | MEDIUM | `[x] Done — 2026-02-19` |
| 2.2 | Statement PDF Export | MEDIUM | `[x] Done — 2026-02-19` |
| 2.3 | Stock Expiry Tracking | MEDIUM | `[x] Done — 2026-02-19` |
| 2.4 | Per-Line Discount | MEDIUM | `[x] Done — 2026-02-19` |
| 2.5 | Purchase Order (PO) | MEDIUM | `[x] Done — 2026-02-19` |
| 3.1 | SMS / WhatsApp | LOW | `[x] Done — 2026-02-19` |
| 3.2 | Customer Loyalty | LOW | `[ ] Not started` |
| 3.3 | Multi-Branch | LOW | `[x] Done — 2026-02-19` |
| 3.4 | Recurring Sales | LOW | `[ ] Not started` |
| 3.5 | Supplier Price History | LOW | `[ ] Not started` |

---

_Update this file after each feature is completed. Change `[ ] Not started` → `[x] Done — YYYY-MM-DD`_

**Multi-Tenant Sales & Inventory Management App**

---

# Project Overview

A **Next.js-based SaaS application** designed for small-scale market women to manage:

- Sales (cash & credit)
- Inventory by manufacturer/producer
- Customers (debtors) and suppliers (creditors)
- Returns & stock adjustments
- Payments tracking
- Role-based access (Owner, Staff)
- Multi-tenant support (one shop per tenant)

The system is **production-ready**, **multi-tenant**, and **mobile-first**. Each tenant’s data is fully isolated using a **tenantId** across all tables.

---

# Current Project Status

## Completed

1. **Next.js project initialized**
   - TypeScript + App Router
   - TailwindCSS configured
2. **Project folder structure scaffolded** using script (`scripts/scaffold.sh`)  
   - `/app` pages (auth, dashboard, sales, purchases, items, customers, suppliers, reports, settings)  
   - `/app/api` API routes  
   - `/lib` utilities (db, auth, tenant, permissions)  
   - `/components`, `/hooks`, `/types`, `/middleware`  
3. **Prisma ORM initialized** with PostgreSQL  
4. **Multi-tenant Prisma schema drafted** (needs final correction to remove duplicates)  
5. **Models created** (draft):
   - Tenant, User, Manufacturer, Item
   - Customer, Supplier
   - Sale, SaleItem
   - Purchase, PurchaseItem (duplicates need removal)
   - CustomerPayment, SupplierPayment
   - CustomerReturn, SupplierReturn
   - StockAdjustment
   - AuditLog
6. **Bidirectional relations for Item -> SaleItem & PurchaseItem started**  
7. **Tenant enforcement helper implemented** (`requireTenant`)  
8. **RBAC helper implemented** (`requireRole`)  
9. **Script scaffolds project folders and placeholder files**

## Issues / Pending Fixes

1. Prisma schema errors:
   - Duplicate `PurchaseItem` models
   - `Purchase` not defined before `PurchaseItem`
   - Missing bidirectional relations for `Item`
2. Transactions and credit logic not implemented
3. Auth with NextAuth.js and tenant-aware session not implemented
4. Sales, purchases, payments, and returns logic not connected
5. Reports pages not implemented

---

# Architecture & Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js App Router, TypeScript, Tailwind CSS, ShadCN/UI |
| Backend | Next.js API Routes, Server Actions |
| Database | PostgreSQL, Prisma ORM |
| Authentication | NextAuth.js |
| Roles & Permissions | RBAC middleware |
| Multi-Tenancy | Shared schema, `tenantId` enforced in all tables |
| Deployment | Vercel (Next.js), Supabase / Neon for Postgres |

---

# Database Design Notes

**Tenant Isolation**: All models have `tenantId` for multi-tenancy.  
**Bidirectional Relations**:
- `Item` → `SaleItem[]`, `PurchaseItem[]`
- `Sale` → `SaleItem[]`
- `Purchase` → `PurchaseItem[]`

**Core Models**:

- **Tenant**: Shop info, status (TRIAL, ACTIVE, SUSPENDED)  
- **User**: TenantId, role (OWNER/STAFF)  
- **Manufacturer**: TenantId, items[]  
- **Item**: Stock quantity, cost, selling price, related to manufacturer  
- **Customer**: Debtors, balance  
- **Supplier**: Creditors, balance  
- **Sale / SaleItem**: Tracks sales, items, payment type (CASH/CREDIT)  
- **Purchase / PurchaseItem**: Tracks purchases, items, payment type  
- **Payments**: CustomerPayment & SupplierPayment  
- **Returns**: CustomerReturn & SupplierReturn  
- **StockAdjustment**: Manual inventory adjustments  
- **AuditLog**: Tracks all user actions  

---

# Next Steps for a Developer

1. **Fix Prisma schema**:
   - Remove duplicate `PurchaseItem` model  
   - Ensure `Purchase` is defined before `PurchaseItem`  
   - Add bidirectional relations for `Item`  

2. **Migrate database**:  
```bash
npx prisma format
npx prisma migrate dev --name fix-schema
```

3. **Implement tenant-aware auth**:
   - NextAuth.js session includes `tenantId`  
   - Protect all API routes with `requireTenant`  

4. **Implement transactional sales & credit logic**:
   - Sales reduce stock
   - Purchases increase stock
   - Customer/Supplier balances update atomically  
   - Use Prisma `$transaction`  

5. **Implement returns & stock adjustments**  
6. **Implement role-based access** for Owners vs Staff  
7. **Create frontend pages**:
   - Dashboard, Sales, Purchases, Items, Customers, Suppliers, Reports  
8. **Test multi-tenant isolation**:
   - Each tenant only sees their own data  

---

# Key Considerations

- Multi-tenancy is **strictly enforced by tenantId**  
- All financial transactions must be **atomic**  
- **Audit logs** must capture all changes  
- Mobile-first UX is critical  
- Scalability:
  - Route-based tenancy for MVP  
  - Subdomain tenancy optional later  

---

# Developer Handoff Summary

If a developer/code agent takes over, they should:

1. Fix the **Prisma schema** and migrate  
2. Implement **tenant-aware NextAuth.js authentication**  
3. Build **core sales & inventory flows** with transactions  
4. Add **reports, returns, and adjustments**  
5. Ensure **RBAC enforcement and audit logs**


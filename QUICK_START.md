# 🚀 Quick Start Guide

## Prerequisites
- PostgreSQL running on `localhost:5432`
- Database named `inventory` created
- Node.js installed

---

## Step 1: Database Setup (5 minutes)

```bash
# Navigate to project
cd /home/wilsonjunior/Documents/salesInventoryapp/market-inventory

# Format Prisma schema
npx prisma format

# Create and run migration
npx prisma migrate dev --name init-foundation

# Generate Prisma client
npx prisma generate

# Seed test data
npx prisma db seed
```

**Expected output:**
```
✅ Seed completed successfully!

📊 Summary:
🏢 Tenants: 2
👥 Users: 4 (password: "password123")
   • alice@tenanta.com (OWNER)
   • bob@tenanta.com (STAFF)
   • charlie@tenantb.com (OWNER)
   • diana@tenantb.com (STAFF)
```

---

## Step 2: Start Development Server (1 minute)

```bash
npm run dev
```

Visit: http://localhost:3000/auth/login

---

## Step 3: Test Login (2 minutes)

### Test Account 1 (Tenant A - OWNER)
- **Email:** `alice@tenanta.com`
- **Password:** `password123`
- **Role:** OWNER (full access)
- **Tenant:** Market Store A

### Test Account 2 (Tenant A - STAFF)
- **Email:** `bob@tenanta.com`
- **Password:** `password123`
- **Role:** STAFF (limited access)
- **Tenant:** Market Store A

### Test Account 3 (Tenant B - OWNER)
- **Email:** `charlie@tenantb.com`
- **Password:** `password123`
- **Role:** OWNER (full access)
- **Tenant:** Market Store B

### Test Account 4 (Tenant B - STAFF)
- **Email:** `diana@tenantb.com`
- **Password:** `password123`
- **Role:** STAFF (limited access)
- **Tenant:** Market Store B

---

## Step 4: Verify Multi-Tenant Isolation (3 minutes)

1. Login as `alice@tenanta.com`
   - Note the Tenant ID on dashboard
   - Note it says "Market Store A"

2. Logout

3. Login as `charlie@tenantb.com`
   - Note the Tenant ID is DIFFERENT
   - Note it says "Market Store B"

✅ **This confirms multi-tenant isolation is working!**

---

## What's Working Now

✅ Authentication (login/logout)
✅ Multi-tenant sessions (tenantId in JWT)
✅ Role-based access control (OWNER vs STAFF)
✅ Protected routes (auto-redirect to login)
✅ Dashboard with session info
✅ Database with test data

---

## What to Build Next

Choose one of these to start building features:

### Option 1: Items Management (Easiest)
Build API routes for items (no complex transactions):
- `GET /api/items` - List items
- `POST /api/items` - Create item
- `PUT /api/items/[id]` - Update item
- `DELETE /api/items/[id]` - Delete item (OWNER only)

### Option 2: Customers Management
Build API routes for customers:
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `PUT /api/customers/[id]` - Update customer
- `DELETE /api/customers/[id]` - Delete customer (OWNER only)

### Option 3: Sales (Advanced - requires transactions)
Build sales API with stock updates and balance tracking

---

## API Route Template

Use this template for all API routes:

```typescript
import { NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requirePermission } from '@/lib/permissions/rbac'
import { prisma } from '@/lib/db/prisma'

// GET - List items
export async function GET() {
  const { error, tenantId } = await requireTenant()
  if (error) return error

  const items = await prisma.item.findMany({
    where: { tenantId }, // ALWAYS filter by tenantId
  })

  return NextResponse.json(items)
}

// POST - Create item
export async function POST(req: Request) {
  const { error, tenantId, user } = await requireTenant()
  if (error) return error

  // Check permission
  const { authorized, error: permError } = requirePermission(
    user.role,
    'create_items'
  )
  if (!authorized) return permError

  const body = await req.json()

  const item = await prisma.item.create({
    data: {
      ...body,
      tenantId, // Use session tenantId, NOT from request
    },
  })

  return NextResponse.json(item, { status: 201 })
}
```

---

## Important Rules

### 🔴 ALWAYS Do This:
1. Use `requireTenant()` in every API route
2. Filter ALL database queries by `tenantId`
3. Use `requirePermission()` or `requireRole()` for sensitive operations
4. Use session `tenantId`, never accept it from request body
5. Use `prisma.$transaction()` for financial operations

### 🔴 NEVER Do This:
1. Query database without filtering by `tenantId`
2. Accept `tenantId` from request body
3. Skip permission checks on DELETE operations
4. Forget to handle errors from middleware
5. Expose internal error details to client

---

## Troubleshooting

### "Prisma Client not found"
```bash
npx prisma generate
```

### "Can't connect to database"
- Check PostgreSQL is running
- Check `.env` has correct `DATABASE_URL`
- Test: `npx prisma db pull`

### "Session doesn't include tenantId"
- Check you ran migrations (added password field to User)
- Clear browser cookies
- Re-login

### "Other tenant's data is visible"
- **CRITICAL SECURITY ISSUE**
- Check ALL queries have `where: { tenantId }`
- Review the API route implementation

---

## Need Help?

1. Check [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) for detailed docs
2. Check [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) for patterns
3. Review example API route template above

---

**You're ready to build! 🎉**

Start with Items API → Customers API → Sales API

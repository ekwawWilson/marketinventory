# 🚀 Implementation Roadmap - Market Inventory System

**Project:** Multi-Tenant Sales & Inventory Management App
**Status:** 5% Complete (Scaffolding + Database Schema Only)
**Current Phase:** Foundation Setup

---

## ⚠️ CRITICAL INFRASTRUCTURE - MUST DO FIRST

These tasks MUST be completed in order before building any features. This is the foundation that everything else depends on.

### ✅ **Task 1: Database Setup & Migration**

**Priority:** URGENT - Nothing works without this
**Location:** `/prisma/schema.prisma`
**Status:** Schema designed, migrations NOT created

**Steps:**
```bash
# 1. Validate schema
npx prisma format

# 2. Create initial migration
npx prisma migrate dev --name init-schema

# 3. Generate Prisma client
npx prisma generate
```

**Verification:**
- [ ] Migration files created in `/prisma/migrations/`
- [ ] No Prisma errors
- [ ] Database tables created
- [ ] Prisma client generated in `/lib/generated/prisma/`

**Blockers if not done:**
- Cannot query database
- All API routes will fail
- Cannot test multi-tenant isolation

---

### ✅ **Task 2: Prisma Client Initialization**

**Priority:** URGENT - Required for all database operations
**Location:** `/lib/db/prisma.ts`
**Status:** File exists but is EMPTY (0 lines)

**Implementation Required:**
```typescript
// /lib/db/prisma.ts
import { PrismaClient } from '@/lib/generated/prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

**Why this pattern:**
- Prevents multiple Prisma instances in development (hot reload issue)
- Singleton pattern for serverless environments
- Proper logging for debugging

**Verification:**
- [ ] File created with singleton pattern
- [ ] Can import `prisma` from other files
- [ ] No connection errors
- [ ] Logging works in development

**Blockers if not done:**
- Cannot make any database queries
- All API endpoints will crash
- Authentication won't work

---

### ✅ **Task 3: Authentication System (NextAuth.js)**

**Priority:** HIGH - Required for user sessions and tenant isolation
**Location:** `/lib/auth/auth.ts` + `/app/api/auth/[...nextauth]/route.ts`
**Status:** Both files EMPTY, next-auth installed

**Implementation Required:**

**File 1: `/lib/auth/auth.ts`**
```typescript
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/db/prisma'
import { compare } from 'bcryptjs' // Need to install

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.tenantId = user.tenantId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.tenantId = token.tenantId
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/login',
  },
}
```

**File 2: `/app/api/auth/[...nextauth]/route.ts`**
```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

**Additional Required:**
- [ ] Install bcryptjs: `npm install bcryptjs @types/bcryptjs`
- [ ] Add password field to User model in Prisma schema
- [ ] Add types to `/types/next-auth.d.ts`:
```typescript
import { Role } from '@prisma/client'

declare module 'next-auth' {
  interface User {
    id: string
    role: Role
    tenantId: string
  }
  interface Session {
    user: User & {
      id: string
      role: Role
      tenantId: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    tenantId: string
  }
}
```

**Verification:**
- [ ] Can login with credentials
- [ ] Session includes tenantId and role
- [ ] JWT token contains user data
- [ ] Redirects work properly

**Blockers if not done:**
- Cannot identify which tenant is making requests
- No user authentication
- Cannot enforce RBAC
- All data will be accessible to everyone (SECURITY RISK)

---

### ✅ **Task 4: Tenant Enforcement Middleware**

**Priority:** CRITICAL - Required for multi-tenant data isolation
**Location:** `/lib/tenant/requireTenant.ts`
**Status:** File exists but is EMPTY (0 lines)

**Implementation Required:**
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { NextResponse } from 'next/server'

export async function requireTenant() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized - Please login' },
        { status: 401 }
      ),
      tenantId: null,
      user: null,
    }
  }

  if (!session.user.tenantId) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden - No tenant associated' },
        { status: 403 }
      ),
      tenantId: null,
      user: null,
    }
  }

  return {
    error: null,
    tenantId: session.user.tenantId,
    user: session.user,
  }
}

// Helper to filter queries by tenant
export function withTenantId(tenantId: string) {
  return { tenantId }
}
```

**Usage in API Routes:**
```typescript
// Example: /app/api/items/route.ts
import { requireTenant } from '@/lib/tenant/requireTenant'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const { error, tenantId } = await requireTenant()
  if (error) return error

  const items = await prisma.item.findMany({
    where: { tenantId }, // THIS IS CRITICAL - filters by tenant
  })

  return NextResponse.json(items)
}
```

**Verification:**
- [ ] All database queries filter by tenantId
- [ ] Unauthorized requests return 401
- [ ] Requests without tenant return 403
- [ ] Cannot access other tenant's data

**Blockers if not done:**
- **CRITICAL SECURITY ISSUE:** Users can see ALL tenants' data
- Data leakage between businesses
- Violates core multi-tenant requirement
- Cannot deploy to production safely

---

### ✅ **Task 5: Role-Based Access Control (RBAC)**

**Priority:** HIGH - Required for permission management
**Location:** `/lib/permissions/rbac.ts`
**Status:** File exists but is EMPTY (0 lines)

**Implementation Required:**
```typescript
import { Role } from '@prisma/client'
import { NextResponse } from 'next/server'

// Define permissions per role
const PERMISSIONS = {
  OWNER: [
    'manage_users',
    'manage_settings',
    'view_all_reports',
    'delete_transactions',
    'manage_tenant',
  ],
  STAFF: [
    'create_sale',
    'create_purchase',
    'view_items',
    'view_customers',
    'view_suppliers',
  ],
}

export function hasPermission(role: Role, permission: string): boolean {
  return PERMISSIONS[role]?.includes(permission) ?? false
}

export function requireRole(
  userRole: Role,
  allowedRoles: Role[]
): { authorized: boolean; error: NextResponse | null } {
  if (!allowedRoles.includes(userRole)) {
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      ),
    }
  }

  return {
    authorized: true,
    error: null,
  }
}

// Helper for routes that require OWNER role
export function requireOwner(userRole: Role) {
  return requireRole(userRole, [Role.OWNER])
}
```

**Usage in API Routes:**
```typescript
// Example: Delete sale (OWNER only)
import { requireTenant } from '@/lib/tenant/requireTenant'
import { requireOwner } from '@/lib/permissions/rbac'

export async function DELETE(req: Request) {
  const { error, tenantId, user } = await requireTenant()
  if (error) return error

  const { authorized, error: roleError } = requireOwner(user.role)
  if (!authorized) return roleError

  // Only OWNERs reach here
  // Delete logic...
}
```

**Verification:**
- [ ] STAFF cannot delete transactions
- [ ] STAFF cannot manage settings
- [ ] OWNER has full access
- [ ] Permission checks work correctly

**Blockers if not done:**
- Staff users can perform admin actions
- No permission boundaries
- Cannot restrict sensitive operations

---

### ✅ **Task 6: Global Middleware Configuration**

**Priority:** MEDIUM - Protects routes automatically
**Location:** `/middleware.ts`
**Status:** File exists but is EMPTY (0 lines)

**Implementation Required:**
```typescript
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Custom middleware logic here
    const token = req.nextauth.token

    // Log requests (optional)
    console.log(`[${req.method}] ${req.nextUrl.pathname} - User: ${token?.email}`)

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

// Protect these routes
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/sales/:path*',
    '/purchases/:path*',
    '/items/:path*',
    '/customers/:path*',
    '/suppliers/:path*',
    '/payments/:path*',
    '/returns/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/api/:path*',
  ],
}
```

**Verification:**
- [ ] Unauthenticated users redirected to login
- [ ] Protected routes require authentication
- [ ] API routes protected
- [ ] Public routes (login, register) still accessible

**Blockers if not done:**
- Routes not automatically protected
- Need manual auth checks everywhere
- Easier to forget protection on new routes

---

## 📋 CHECKLIST - Foundation Phase

Before proceeding to build features, verify ALL these items:

### Database
- [ ] `npx prisma migrate dev` runs successfully
- [ ] Database contains all tables from schema
- [ ] Prisma client generated
- [ ] Can query database without errors

### Prisma Client
- [ ] `/lib/db/prisma.ts` implemented with singleton pattern
- [ ] Can import and use `prisma` in other files
- [ ] No multiple instance warnings in dev mode

### Authentication
- [ ] NextAuth configured in `/lib/auth/auth.ts`
- [ ] API route `/app/api/auth/[...nextauth]/route.ts` created
- [ ] Session includes `tenantId` and `role`
- [ ] Can login and maintain session
- [ ] Password hashing with bcryptjs works

### Tenant Enforcement
- [ ] `/lib/tenant/requireTenant.ts` implemented
- [ ] Returns tenantId from session
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns 403 for users without tenant
- [ ] Helper function filters queries by tenantId

### RBAC
- [ ] `/lib/permissions/rbac.ts` implemented
- [ ] Permissions defined for OWNER and STAFF
- [ ] `requireRole()` helper works
- [ ] `requireOwner()` helper works
- [ ] Permission checks return proper errors

### Middleware
- [ ] `/middleware.ts` implemented
- [ ] Protected routes require authentication
- [ ] Unauthenticated users redirected to login
- [ ] Logging works (optional)

---

## 🚨 COMMON PITFALLS TO AVOID

### 1. **Forgetting tenantId in queries**
```typescript
// ❌ WRONG - Returns ALL tenants' data
const items = await prisma.item.findMany()

// ✅ CORRECT - Returns only current tenant's data
const items = await prisma.item.findMany({
  where: { tenantId }
})
```

### 2. **Not using transactions for financial operations**
```typescript
// ❌ WRONG - Race conditions, data inconsistency
await prisma.sale.create({ data: saleData })
await prisma.item.update({ data: { quantity: newQty } })

// ✅ CORRECT - Atomic operation
await prisma.$transaction([
  prisma.sale.create({ data: saleData }),
  prisma.item.update({ data: { quantity: newQty } })
])
```

### 3. **Not validating role before sensitive operations**
```typescript
// ❌ WRONG - Any authenticated user can delete
export async function DELETE() {
  const { error, tenantId } = await requireTenant()
  if (error) return error
  // Delete logic
}

// ✅ CORRECT - Only OWNER can delete
export async function DELETE() {
  const { error, tenantId, user } = await requireTenant()
  if (error) return error

  const { authorized, error: roleError } = requireOwner(user.role)
  if (!authorized) return roleError
  // Delete logic
}
```

### 4. **Not handling errors properly**
```typescript
// ❌ WRONG - Exposes internal errors to client
catch (error) {
  return NextResponse.json({ error: error.message })
}

// ✅ CORRECT - Generic error, log details server-side
catch (error) {
  console.error('Sale creation failed:', error)
  return NextResponse.json(
    { error: 'Failed to create sale' },
    { status: 500 }
  )
}
```

---

## 🎯 NEXT STEPS AFTER FOUNDATION

Once ALL foundation tasks are complete, proceed in this order:

1. **Items & Manufacturers API** - Basic CRUD, no transactions needed
2. **Customers & Suppliers API** - Basic CRUD
3. **Sales API** - Complex with transactions, stock reduction, balance updates
4. **Purchases API** - Complex with transactions, stock increase
5. **Payments API** - Updates balances
6. **Returns & Adjustments** - Stock modifications

**DO NOT** start building feature APIs until foundation is complete. Every feature depends on these core systems.

---

## 📊 PROGRESS TRACKER

**Foundation Phase:** 0/6 Complete

- [ ] Task 1: Database Migration
- [ ] Task 2: Prisma Client
- [ ] Task 3: Authentication
- [ ] Task 4: Tenant Enforcement
- [ ] Task 5: RBAC
- [ ] Task 6: Middleware

**Estimated Time:** 2-3 days for foundation
**Current Blocker:** Database migration not run

---

## 🆘 TROUBLESHOOTING

### "Prisma Client not generated"
```bash
npx prisma generate
```

### "Can't connect to database"
- Check `.env` file has correct `DATABASE_URL`
- Verify PostgreSQL is running
- Test connection: `npx prisma db pull`

### "Session doesn't include tenantId"
- Check JWT callback in `/lib/auth/auth.ts`
- Verify NextAuth types in `/types/next-auth.d.ts`
- Clear browser cookies and re-login

### "Other tenant's data is visible"
- **CRITICAL SECURITY ISSUE**
- Check all queries have `where: { tenantId }`
- Audit all API routes
- Test with multiple tenants

---

**Last Updated:** 2026-02-11
**Status:** Foundation not started
**Next Action:** Run `npx prisma migrate dev --name init-schema`

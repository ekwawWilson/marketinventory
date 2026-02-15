# Quick Setup Guide

## 🚀 Getting Started

Follow these steps to set up and run the Multi-Tenant Sales & Inventory Management System:

---

## 1️⃣ Prerequisites

Ensure you have:
- **Node.js** 18+ installed
- **PostgreSQL** database running
- **Git** (optional, for version control)

---

## 2️⃣ Environment Setup

1. **Create `.env` file** (if not already exists):
```bash
cp .env.example .env
```

2. **Configure database connection** in `.env`:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/inventory_db"

# NextAuth
NEXTAUTH_SECRET="your-super-secret-random-string-here"
NEXTAUTH_URL="http://localhost:3000"

# Environment
NODE_ENV="development"
```

**Generate a secure NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

---

## 3️⃣ Install Dependencies

```bash
npm install
```

---

## 4️⃣ Database Setup

### Option A: First Time Setup (Recommended)

```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Push schema to database (creates tables)
npx prisma db push

# 3. Seed sample data
npm run seed
```

### Option B: Using Migrations (Production-ready)

```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Create initial migration
npx prisma migrate dev --name init

# 3. Seed sample data
npm run seed
```

---

## 5️⃣ Run Development Server

```bash
npm run dev
```

The application will be available at: **http://localhost:3000**

---

## 6️⃣ Login Credentials

After seeding, you can login with these accounts:

### **Tenant A (Market Store A)**
- **Owner**: `alice@tenanta.com` / `password123`
- **Staff**: `bob@tenanta.com` / `password123`

### **Tenant B (Market Store B)**
- **Owner**: `charlie@tenantb.com` / `password123`
- **Staff**: `diana@tenantb.com` / `password123`

---

## 📋 Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run seed` | Seed database with sample data |
| `npx prisma studio` | Open Prisma Studio (database GUI) |
| `npx prisma generate` | Generate Prisma Client |
| `npx prisma db push` | Push schema changes to database |
| `npx prisma migrate dev` | Create and apply migration |

---

## 🔧 Troubleshooting

### Error: "Can't reach database server"
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env` is correct
- Test connection: `npx prisma db pull`

### Error: "Prisma Client not generated"
```bash
npx prisma generate
```

### Error: "Table does not exist"
```bash
npx prisma db push
```

### Error: "Module not found '@/lib/generated/prisma'"
```bash
npx prisma generate
# Then restart dev server
```

### Reset Database (⚠️ Deletes all data!)
```bash
npx prisma migrate reset
```

---

## 🗂️ Project Structure

```
market-inventory/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (41 endpoints)
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard page
│   ├── sales/             # Sales pages
│   ├── purchases/         # Purchase pages
│   ├── items/             # Inventory pages
│   └── ...
├── components/            # React components
│   ├── forms/            # Form components
│   ├── tables/           # Table components
│   └── layout/           # Layout components
├── hooks/                # Custom React hooks
├── lib/                  # Core libraries
│   ├── auth/            # NextAuth configuration
│   ├── db/              # Prisma client
│   ├── permissions/     # RBAC logic
│   └── tenant/          # Multi-tenant enforcement
├── prisma/              # Database
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Seed script
├── types/               # TypeScript types
└── .env                 # Environment variables
```

---

## 📚 Documentation

- [IMPLEMENTATION_COMPLETE_SUMMARY.md](IMPLEMENTATION_COMPLETE_SUMMARY.md) - Full system overview
- [SEEDING_GUIDE.md](SEEDING_GUIDE.md) - Detailed seed data information
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API reference

---

## ✅ Verify Installation

After setup, verify everything works:

1. ✅ Application loads at http://localhost:3000
2. ✅ Can login with seeded credentials
3. ✅ Dashboard shows metrics
4. ✅ Can view items list (should see 30 items for Tenant A)
5. ✅ Multi-tenant isolation works (different data per tenant)

---

## 🎯 Next Steps

1. **Explore the Dashboard** - View business metrics
2. **Create a Sale** - Test the sales workflow
3. **Record a Purchase** - Test inventory management
4. **View Reports** - Check analytics and insights
5. **Test Multi-Tenancy** - Login as different tenants
6. **Test RBAC** - Login as STAFF vs OWNER

---

## 🆘 Need Help?

- Check [SEEDING_GUIDE.md](SEEDING_GUIDE.md) for seed data details
- Review [IMPLEMENTATION_COMPLETE_SUMMARY.md](IMPLEMENTATION_COMPLETE_SUMMARY.md) for architecture
- Open Prisma Studio: `npx prisma studio` to inspect database

---

**Happy coding!** 🚀

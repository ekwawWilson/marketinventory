# Database Seeding Guide

## 📋 Overview

The seed script creates comprehensive sample data for testing the multi-tenant sales and inventory management system. It populates the database with realistic business data across two separate tenants to demonstrate tenant isolation.

---

## 🎯 What Gets Seeded

### **Tenant A: "Market Store A"** (Lagos-based store)

#### **Users (2)**
| Email | Password | Role | Access Level |
|-------|----------|------|--------------|
| alice@tenanta.com | password123 | OWNER | Full system access |
| bob@tenanta.com | password123 | STAFF | Limited access |

#### **Manufacturers (6)**
1. Coca-Cola Company
2. Nestle Nigeria
3. Unilever Nigeria
4. PZ Cussons
5. Cadbury Nigeria
6. Dano Milk

#### **Items (30)**
**Beverages (7 items)** - Coca-Cola Products
- Coca-Cola 35cl, 50cl, 1L
- Fanta 35cl, 50cl
- Sprite 35cl, 50cl
- Schweppes Tonic 35cl ⚠️ (Low stock: 8)

**Food (6 items)** - Nestle Products
- Milo 400g, 900g
- Maggi Chicken, Maggi Crayfish
- Golden Morn 500g
- Cerelac 400g
- Nescafe Classic 100g ⚠️ (Low stock: 5)

**Personal Care (8 items)** - Unilever & PZ Cussons
- Lux Soap, Lifebuoy Soap
- Close Up Toothpaste
- Sunlight, Omo Detergent
- Imperial Leather, Premier Cool, Canoe Soap
- Morning Fresh Dishwashing
- Dove Soap 100g ⚠️ (Low stock: 3)

**Food (3 items)** - Cadbury Products
- Bournvita 500g, 1kg
- Tom Tom Classic

**Dairy (3 items)** - Dano Products
- Dano Full Cream, Slim Milk
- Dano Cool Cow

#### **Customers (10)**
| Name | Phone | Balance |
|------|-------|---------|
| John Doe | +234-803-123-4567 | ₦0 |
| Jane Smith | +234-805-234-5678 | ₦5,000 💰 |
| Michael Johnson | +234-807-345-6789 | ₦12,500 💰 |
| Sarah Williams | +234-809-456-7890 | ₦0 |
| David Brown | +234-810-567-8901 | ₦8,300 💰 |
| Emma Davis | +234-812-678-9012 | ₦0 |
| James Wilson | +234-813-789-0123 | ₦3,200 💰 |
| Olivia Taylor | +234-814-890-1234 | ₦0 |
| Robert Anderson | +234-815-901-2345 | ₦15,700 💰 |
| Sophia Martinez | (No phone) | ₦0 |

**Total Debtors: 6 customers owing ₦44,700**

#### **Suppliers (5)**
| Name | Phone | Balance Owed |
|------|-------|--------------|
| Wholesale Distributors Ltd | +234-802-111-2222 | ₦0 |
| Lagos Trade Center | +234-803-222-3333 | ₦45,000 💸 |
| Beverage Suppliers Co | +234-804-333-4444 | ₦0 |
| Food & Dairy Distributors | +234-805-444-5555 | ₦28,500 💸 |
| Personal Care Wholesale | +234-806-555-6666 | ₦0 |

**Total Creditors: 2 suppliers owed ₦73,500**

---

### **Tenant B: "Market Store B"** (Kano-based store)

#### **Users (2)**
| Email | Password | Role | Access Level |
|-------|----------|------|--------------|
| charlie@tenantb.com | password123 | OWNER | Full system access |
| diana@tenantb.com | password123 | STAFF | Limited access |

#### **Manufacturers (4)**
1. Dangote Group
2. Golden Penny
3. Honeywell Flour Mills
4. Chi Limited

#### **Items (17)**
**Dangote Products (5 items)**
- Dangote Sugar 500g, 1kg, 2kg ⚠️ (Low stock: 7)
- Dangote Salt 250g, 500g
- Dangote Cement 50kg

**Golden Penny Products (4 items)**
- Semovita 1kg
- Flour 2kg
- Spaghetti, Macaroni 500g
- Noodles 120g ⚠️ (Low stock: 9)

**Honeywell Products (3 items)**
- Semovita 1kg
- Wheat Flour 2kg
- Noodles 120g

**Chi Limited Products (3 items)**
- Chi Exotic 1L
- Chi Active Body 60cl
- Hollandia Yoghurt 315ml

#### **Customers (6)**
| Name | Phone | Balance |
|------|-------|---------|
| Ibrahim Musa | +234-816-123-4567 | ₦0 |
| Amina Hassan | +234-817-234-5678 | ₦7,500 💰 |
| Chukwudi Okafor | +234-818-345-6789 | ₦0 |
| Blessing Eze | +234-819-456-7890 | ₦4,200 💰 |
| Tunde Adeyemi | +234-820-567-8901 | ₦0 |
| Fatima Bello | (No phone) | ₦0 |

**Total Debtors: 2 customers owing ₦11,700**

#### **Suppliers (3)**
| Name | Phone | Balance Owed |
|------|-------|--------------|
| Kano Wholesale Market | +234-821-111-2222 | ₦0 |
| Northern Distributors Ltd | +234-822-222-3333 | ₦32,000 💸 |
| Food Stuff Suppliers | +234-823-333-4444 | ₦0 |

**Total Creditors: 1 supplier owed ₦32,000**

---

## 🚀 How to Run the Seed Script

### **Prerequisites**
```bash
# 1. Ensure database is configured
# Check your .env file has DATABASE_URL set

# 2. Install dependencies (if not already done)
npm install
```

### **Step 1: Generate Prisma Client**
```bash
npx prisma generate
```

### **Step 2: Push Schema to Database**
```bash
# For first time setup or schema changes
npx prisma db push
```

### **Step 3: Run Seed Script**
```bash
# Using the npm script (recommended)
npm run seed

# OR directly with tsx
npx tsx prisma/seed.ts

# OR using Prisma's built-in seed command
npx prisma db seed
```

### **Expected Output:**
```
🌱 Starting database seed...

🗑️  Clearing existing data...
✅ Cleared existing data

🏢 Creating Tenant A...
   Created: Market Store A (clxxx...)
👥 Creating users for Tenant A...
   Created OWNER: alice@tenanta.com
   Created STAFF: bob@tenanta.com
🏭 Creating manufacturers for Tenant A...
   Created 6 manufacturers
📦 Creating items for Tenant A...
   Created 30 items
👤 Creating customers for Tenant A...
   Created 10 customers
🚚 Creating suppliers for Tenant A...
   Created 5 suppliers

🏢 Creating Tenant B...
   Created: Market Store B (clyyy...)
👥 Creating users for Tenant B...
   Created OWNER: charlie@tenantb.com
   Created STAFF: diana@tenantb.com
🏭 Creating manufacturers for Tenant B...
   Created 4 manufacturers
📦 Creating items for Tenant B...
   Created 17 items
👤 Creating customers for Tenant B...
   Created 6 customers
🚚 Creating suppliers for Tenant B...
   Created 3 suppliers

✅ Seed completed successfully!

📊 Summary:
═══════════════════════════════════════════════════════
🏢 TENANTS: 2
   • Market Store A (Lagos-based store)
   • Market Store B (Kano-based store)

👥 USERS: 4 (Password: "password123" for all)
   ┌─ Tenant A (Market Store A):
   │  • alice@tenanta.com (OWNER)
   │  • bob@tenanta.com (STAFF)
   └─ Tenant B (Market Store B):
      • charlie@tenantb.com (OWNER)
      • diana@tenantb.com (STAFF)

🏭 MANUFACTURERS:
   • Tenant A: 6 manufacturers
   • Tenant B: 4 manufacturers

📦 ITEMS:
   • Tenant A: 30 items (3 low stock alerts)
   • Tenant B: 17 items (2 low stock alerts)

👤 CUSTOMERS:
   • Tenant A: 10 customers (6 with debt)
   • Tenant B: 6 customers (2 with debt)

🚚 SUPPLIERS:
   • Tenant A: 5 suppliers (2 with credit)
   • Tenant B: 3 suppliers (1 with credit)
═══════════════════════════════════════════════════════

🚀 NEXT STEPS:
   1. Run:   npm run dev
   2. Visit: http://localhost:3000/auth/login
   3. Login with any user above
   4. Test the multi-tenant system!
```

---

## 🔑 Login Credentials

### **Tenant A (Market Store A)**
```
OWNER Account:
Email: alice@tenanta.com
Password: password123
Access: Full system access, settings, user management

STAFF Account:
Email: bob@tenanta.com
Password: password123
Access: Sales, purchases, inventory, limited reporting
```

### **Tenant B (Market Store B)**
```
OWNER Account:
Email: charlie@tenantb.com
Password: password123
Access: Full system access, settings, user management

STAFF Account:
Email: diana@tenantb.com
Password: password123
Access: Sales, purchases, inventory, limited reporting
```

---

## 🧪 Testing Scenarios

### **1. Multi-Tenant Isolation**
- Login as `alice@tenanta.com`
- View inventory → See 30 items from Tenant A
- Logout
- Login as `charlie@tenantb.com`
- View inventory → See 17 items from Tenant B (completely different data!)

### **2. Role-Based Access Control (RBAC)**
- Login as `bob@tenanta.com` (STAFF)
- Try to access Settings → Should be redirected (OWNER only)
- Try to void a sale → Should fail (OWNER only permission)

### **3. Low Stock Alerts**
- Login to Tenant A
- Go to Inventory Reports
- Should see 3 items flagged as low stock (≤10 units)
  - Schweppes Tonic 35cl (8 units)
  - Nescafe Classic 100g (5 units)
  - Dove Soap 100g (3 units)

### **4. Debtor Tracking**
- Login to Tenant A
- Go to Reports → Debtors
- Should see 6 customers with total debt of ₦44,700
- Highest debtor: Robert Anderson (₦15,700)

### **5. Creditor Tracking**
- Login to Tenant A
- Go to Reports → Creditors
- Should see 2 suppliers owed total of ₦73,500
- Lagos Trade Center: ₦45,000
- Food & Dairy Distributors: ₦28,500

---

## 🔄 Re-seeding the Database

To clear all data and re-run the seed:

```bash
# Option 1: Reset and seed in one command
npx prisma migrate reset

# Option 2: Manual steps
npx prisma db push --force-reset
npx prisma db seed
```

⚠️ **WARNING**: This will delete ALL data in the database!

---

## 📝 Customizing Seed Data

To modify the seed data, edit [/prisma/seed.ts](prisma/seed.ts):

```typescript
// Add more items
await prisma.item.createMany({
  data: [
    {
      tenantId: tenantA.id,
      manufacturerId: manufacturerA1.id,
      name: 'Your Product Name',
      quantity: 100,
      costPrice: 500,
      sellingPrice: 700,
    },
  ],
})

// Add more customers
await prisma.customer.createMany({
  data: [
    {
      tenantId: tenantA.id,
      name: 'Customer Name',
      phone: '+234-xxx-xxx-xxxx',
      balance: 0,
    },
  ],
})
```

After modifying, re-run:
```bash
npm run seed
```

---

## 🎯 What to Test After Seeding

1. **Authentication**
   - ✅ Login with all 4 user accounts
   - ✅ Test password validation
   - ✅ Test logout functionality

2. **Inventory Management**
   - ✅ View items list
   - ✅ Search and filter items
   - ✅ Check low stock alerts
   - ✅ Edit item prices

3. **Sales Operations**
   - ✅ Create walk-in sale
   - ✅ Create credit sale (partial payment)
   - ✅ Verify stock reduction
   - ✅ Verify balance updates

4. **Purchases**
   - ✅ Record new purchase
   - ✅ Verify stock increase
   - ✅ Verify supplier balance

5. **Payments**
   - ✅ Record customer payment
   - ✅ Record supplier payment
   - ✅ Verify balance reduction

6. **Reporting**
   - ✅ Sales reports
   - ✅ Inventory valuation
   - ✅ Debtors/creditors lists
   - ✅ Dashboard metrics

7. **Multi-Tenancy**
   - ✅ Switch between tenants
   - ✅ Verify data isolation
   - ✅ Test cross-tenant access (should fail)

---

## 💡 Tips

- **Default Password**: All users use `password123` for easy testing
- **Walk-in Customers**: Customers without phone numbers represent walk-in sales
- **Low Stock Items**: Intentionally seeded to test alert functionality
- **Debt/Credit**: Pre-set balances help test payment recording
- **Different Inventories**: Tenant A focuses on beverages/FMCG, Tenant B on food staples

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'bcryptjs'"
```bash
npm install bcryptjs @types/bcryptjs
```

### Error: "Cannot find module 'tsx'"
```bash
npm install -D tsx
```

### Error: "No such file or directory"
```bash
# Make sure you're in the market-inventory directory
cd market-inventory
npm run seed
```

### Error: "Table does not exist"
```bash
# Push the schema first
npx prisma db push
npm run seed
```

---

## 📚 Related Documentation

- [IMPLEMENTATION_COMPLETE_SUMMARY.md](IMPLEMENTATION_COMPLETE_SUMMARY.md) - Full system overview
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API endpoints reference
- [Prisma Schema](prisma/schema.prisma) - Database schema

---

**Ready to seed!** 🌱 Run `npm run seed` to populate your database with sample data.

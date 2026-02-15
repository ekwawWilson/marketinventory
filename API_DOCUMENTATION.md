# 📡 API Documentation - Market Inventory System

**Version:** 1.0
**Base URL:** `http://localhost:3000/api`
**Authentication:** Required (Session-based via NextAuth)

---

## 🔐 Authentication

All API routes require authentication. Include session cookie in requests.

**Login:** `POST /api/auth/signin`

**Headers:**
```
Cookie: next-auth.session-token=...
```

---

## 📊 API Summary

| Resource | Endpoints | Features |
|----------|-----------|----------|
| **Manufacturers** | 5 routes | CRUD operations |
| **Items** | 5 routes | CRUD + stock tracking |
| **Customers** | 5 routes | CRUD + debt management |
| **Suppliers** | 5 routes | CRUD + credit management |
| **Sales** | 3 routes | CRUD + atomic transactions |
| **Purchases** | 3 routes | CRUD + atomic transactions |

**Total:** 26 API routes implemented

---

## 🏭 Manufacturers API

### List Manufacturers
```http
GET /api/manufacturers
```

**Response:**
```json
[
  {
    "id": "uuid",
    "tenantId": "uuid",
    "name": "Coca-Cola Company",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "_count": {
      "items": 5
    }
  }
]
```

### Create Manufacturer
```http
POST /api/manufacturers
```

**Permission:** `manage_manufacturers`

**Request:**
```json
{
  "name": "Nestle Nigeria"
}
```

**Response:** `201 Created`

### Get Manufacturer
```http
GET /api/manufacturers/{id}
```

**Response:** Includes manufacturer with items

### Update Manufacturer
```http
PUT /api/manufacturers/{id}
```

**Permission:** `manage_manufacturers`

**Request:**
```json
{
  "name": "Updated Name"
}
```

### Delete Manufacturer
```http
DELETE /api/manufacturers/{id}
```

**Permission:** `manage_manufacturers`

**Note:** Cannot delete if manufacturer has items

---

## 📦 Items API

### List Items
```http
GET /api/items?search={query}&manufacturerId={id}&lowStock=true
```

**Query Parameters:**
- `search` - Filter by name (case-insensitive)
- `manufacturerId` - Filter by manufacturer
- `lowStock` - Show items with quantity ≤ 10

**Response:**
```json
[
  {
    "id": "uuid",
    "tenantId": "uuid",
    "manufacturerId": "uuid",
    "name": "Coca-Cola 50cl",
    "quantity": 100,
    "costPrice": 80.00,
    "sellingPrice": 120.00,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "manufacturer": {
      "id": "uuid",
      "name": "Coca-Cola Company"
    }
  }
]
```

### Create Item
```http
POST /api/items
```

**Permission:** `create_items`

**Request:**
```json
{
  "manufacturerId": "uuid",
  "name": "Fanta 50cl",
  "quantity": 50,
  "costPrice": 75.00,
  "sellingPrice": 115.00
}
```

**Validation:**
- Name required
- Manufacturer must belong to tenant
- Cost price must be ≥ 0
- Selling price must be ≥ cost price
- Quantity must be ≥ 0

**Response:** `201 Created`

### Get Item
```http
GET /api/items/{id}
```

**Response:** Includes transaction history (last 10 sales/purchases)

### Update Item
```http
PUT /api/items/{id}
```

**Permission:** `update_items`

**Request:**
```json
{
  "name": "Updated Name",
  "quantity": 150,
  "costPrice": 80.00,
  "sellingPrice": 130.00
}
```

**Note:** All fields optional (partial update)

### Delete Item
```http
DELETE /api/items/{id}
```

**Permission:** `delete_items`

**Note:** Cannot delete if item has transaction history

---

## 👤 Customers API

### List Customers
```http
GET /api/customers?search={query}&hasDebt=true
```

**Query Parameters:**
- `search` - Filter by name or phone
- `hasDebt` - Show customers with balance > 0

**Response:**
```json
{
  "customers": [...],
  "summary": {
    "total": 50,
    "withDebt": 12,
    "totalDebt": 45000.00
  }
}
```

### Create Customer
```http
POST /api/customers
```

**Permission:** `create_customers`

**Request:**
```json
{
  "name": "John Doe",
  "phone": "+234-800-1234-567"
}
```

**Note:** Phone is optional, balance starts at 0

### Get Customer
```http
GET /api/customers/{id}
```

**Response:**
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "name": "John Doe",
  "phone": "+234-800-1234-567",
  "balance": 5000.00,
  "sales": [...],
  "_count": { "sales": 15 },
  "summary": {
    "totalSales": 50000.00,
    "totalPaid": 45000.00,
    "currentBalance": 5000.00
  }
}
```

### Update Customer
```http
PUT /api/customers/{id}
```

**Permission:** `update_customers`

**Request:**
```json
{
  "name": "Updated Name",
  "phone": "+234-800-9999-999"
}
```

**Note:** Cannot update balance directly (use sales/payments)

### Delete Customer
```http
DELETE /api/customers/{id}
```

**Permission:** `delete_customers`

**Note:** Cannot delete if customer has balance or sales history

---

## 🚚 Suppliers API

### List Suppliers
```http
GET /api/suppliers?search={query}&hasCredit=true
```

**Query Parameters:**
- `search` - Filter by name or phone
- `hasCredit` - Show suppliers with balance > 0

**Response:**
```json
{
  "suppliers": [...],
  "summary": {
    "total": 25,
    "withCredit": 8,
    "totalCredit": 120000.00
  }
}
```

### Create Supplier
```http
POST /api/suppliers
```

**Permission:** `create_suppliers`

**Request:**
```json
{
  "name": "Wholesale Distributors Ltd",
  "phone": "+234-800-5555-555"
}
```

### Get Supplier
```http
GET /api/suppliers/{id}
```

**Response:** Includes purchase history and summary

### Update Supplier
```http
PUT /api/suppliers/{id}
```

**Permission:** `update_suppliers`

**Note:** Cannot update balance directly (use purchases/payments)

### Delete Supplier
```http
DELETE /api/suppliers/{id}
```

**Permission:** `delete_suppliers`

**Note:** Cannot delete if supplier has balance or purchase history

---

## 💰 Sales API (with Atomic Transactions)

### List Sales
```http
GET /api/sales?customerId={id}&paymentType={CASH|CREDIT}&startDate={date}&endDate={date}
```

**Response:**
```json
{
  "sales": [...],
  "summary": {
    "total": 150,
    "totalAmount": 500000.00,
    "totalPaid": 450000.00,
    "totalCredit": 50000.00
  }
}
```

### Create Sale
```http
POST /api/sales
```

**Permission:** `create_sale`

**Request:**
```json
{
  "customerId": "uuid",  // Optional for cash sales, required for credit
  "paidAmount": 5000.00,  // Optional, defaults to 0
  "items": [
    {
      "itemId": "uuid",
      "quantity": 10,
      "price": 120.00  // Optional, defaults to item.sellingPrice
    },
    {
      "itemId": "uuid",
      "quantity": 5,
      "price": 150.00
    }
  ]
}
```

**Atomic Transaction:**
1. ✅ Creates sale record
2. ✅ Creates sale items
3. ✅ Reduces item stock
4. ✅ Updates customer balance (if credit)

**Validation:**
- At least 1 item required
- Items must belong to tenant
- Sufficient stock required
- Customer required for credit sales
- Paid amount ≤ total amount

**Response:** `201 Created` with complete sale data

### Get Sale
```http
GET /api/sales/{id}
```

**Response:** Includes customer, items, and manufacturer details

### Void Sale (Delete)
```http
DELETE /api/sales/{id}
```

**Permission:** OWNER only (`void_sales`)

**Atomic Rollback:**
1. ✅ Deletes sale items
2. ✅ Restores item stock
3. ✅ Reverses customer balance
4. ✅ Deletes sale record

**Response:**
```json
{
  "message": "Sale voided successfully",
  "voidedAmount": 10000.00,
  "restoredItems": 3
}
```

---

## 🛒 Purchases API (with Atomic Transactions)

### List Purchases
```http
GET /api/purchases?supplierId={id}&paymentType={CASH|CREDIT}&startDate={date}&endDate={date}
```

**Response:**
```json
{
  "purchases": [...],
  "summary": {
    "total": 80,
    "totalAmount": 800000.00,
    "totalPaid": 700000.00,
    "totalCredit": 100000.00
  }
}
```

### Create Purchase
```http
POST /api/purchases
```

**Permission:** `create_purchase`

**Request:**
```json
{
  "supplierId": "uuid",  // Required
  "paidAmount": 50000.00,  // Optional, defaults to 0
  "items": [
    {
      "itemId": "uuid",
      "quantity": 100,
      "costPrice": 75.00  // Optional, defaults to item.costPrice
    },
    {
      "itemId": "uuid",
      "quantity": 50,
      "costPrice": 80.00
    }
  ]
}
```

**Atomic Transaction:**
1. ✅ Creates purchase record
2. ✅ Creates purchase items
3. ✅ Increases item stock
4. ✅ Updates supplier balance (if credit)

**Validation:**
- Supplier required
- At least 1 item required
- Items must belong to tenant
- Paid amount ≤ total amount

**Response:** `201 Created` with complete purchase data

### Get Purchase
```http
GET /api/purchases/{id}
```

**Response:** Includes supplier, items, and manufacturer details

### Void Purchase (Delete)
```http
DELETE /api/purchases/{id}
```

**Permission:** OWNER only (`void_purchases`)

**Atomic Rollback:**
1. ✅ Deletes purchase items
2. ✅ Reduces item stock (reverses increase)
3. ✅ Reverses supplier balance
4. ✅ Deletes purchase record

**Note:** Cannot void if insufficient stock to reverse

**Response:**
```json
{
  "message": "Purchase voided successfully",
  "voidedAmount": 50000.00,
  "reversedItems": 5
}
```

---

## 🔒 Security Features

### Multi-Tenant Isolation
- ✅ All queries filtered by `tenantId`
- ✅ Automatic tenant validation on every request
- ✅ Cross-tenant access prevented

### Role-Based Access Control
- **OWNER Permissions:**
  - All CRUD operations
  - Delete transactions
  - Void sales/purchases
  - Manage settings

- **STAFF Permissions:**
  - Create sales/purchases
  - View items/customers/suppliers
  - Update items/customers/suppliers
  - Record payments

### Input Validation
- ✅ Required fields validated
- ✅ Data types validated
- ✅ Business rules enforced
- ✅ Duplicate prevention

### Error Handling
- ✅ Consistent error responses
- ✅ User-friendly messages
- ✅ Internal errors logged server-side

---

## 📝 Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "You must be logged in to access this resource"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to perform this action",
  "requiredRole": ["OWNER"],
  "yourRole": "STAFF"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 409 Conflict
```json
{
  "error": "A resource with this identifier already exists"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to perform operation"
}
```

---

## 🧪 Testing the APIs

### Using curl

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@tenanta.com","password":"password123"}' \
  -c cookies.txt
```

**List Items:**
```bash
curl http://localhost:3000/api/items \
  -b cookies.txt
```

**Create Sale:**
```bash
curl -X POST http://localhost:3000/api/sales \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "items": [
      {"itemId": "item-uuid", "quantity": 5}
    ],
    "paidAmount": 600
  }'
```

### Using Postman

1. **Import Collection:** Create requests for each endpoint
2. **Set Base URL:** `http://localhost:3000/api`
3. **Authentication:** Login first, save session cookie
4. **Test:** Send requests with saved cookie

---

## 🚀 Next Steps

1. **Test all endpoints** with Postman or curl
2. **Verify multi-tenant isolation** (login as different tenants)
3. **Test RBAC** (login as OWNER vs STAFF)
4. **Test transactions** (verify stock updates, balance changes)
5. **Build frontend pages** to consume these APIs

---

**Status:** ✅ ALL CORE APIs IMPLEMENTED
**Date:** 2026-02-11
**Total Endpoints:** 26

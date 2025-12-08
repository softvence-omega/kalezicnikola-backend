# 🚀 Subscription API - Complete Testing Guide (A to Z)

## 📋 **All Available Subscription APIs**

### **1. GET /subscription/plans**
Get all available subscription plans from database

**Request:**
```http
GET http://localhost:7000/subscription/plans
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "productId": "prod_TYJYMAKsoxlokO",
  "plans": [
    {
      "type": "BASIC",
      "name": "Basic Plan",
      "price": 399,
      "priceId": "price_1SbCviD60jTqpzFUD4WuxbQN",
      "minutes": 500,
      "features": [
        "Average of 2-5 easy to follow trade alerts",
        "Average of 2-5 easy to follow trade",
        "Average of 2-5 easy to follow trade alerts per week",
        "Average of 2-5 easy to follow trade alerts"
      ]
    },
    {
      "type": "PROFESSIONAL",
      "name": "Professional",
      "price": 899,
      "priceId": "price_1SbCv9D60jTqpzFUYuH2aykt",
      "minutes": 1000,
      "features": [...]
    },
    {
      "type": "ENTERPRISE",
      "name": "Enterprise",
      "price": 1299,
      "priceId": "price_1SbCwLD60jTqpzFUGZBNsqi0",
      "minutes": 2000,
      "features": [...]
    }
  ]
}
```

---

### **2. PUT /subscription/plans/update**
Update plan details (name, price, minutes, features)

**Request:**
```http
PUT http://localhost:7000/subscription/plans/update
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "planType": "PROFESSIONAL",
  "name": "Premium Professional Plan",
  "price": 999,
  "minutes": 1500,
  "features": [
    "Premium feature 1",
    "Premium feature 2",
    "Premium feature 3",
    "Premium feature 4"
  ]
}
```

**Response:**
```json
{
  "message": "Plan details updated successfully",
  "planType": "PROFESSIONAL",
  "updatedPlan": {
    "name": "Premium Professional Plan",
    "price": 999,
    "priceId": "price_1SbCv9D60jTqpzFUYuH2aykt",
    "minutes": 1500,
    "features": [
      "Premium feature 1",
      "Premium feature 2",
      "Premium feature 3",
      "Premium feature 4"
    ]
  }
}
```

---

### **3. POST /subscription/checkout**
Create Stripe checkout session (EASIEST METHOD - Recommended)

**Request:**
```http
POST http://localhost:7000/subscription/checkout?planType=PROFESSIONAL
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "sessionId": "cs_test_1234567890abcdef",
  "url": "https://checkout.stripe.com/c/pay/cs_test_1234567890abcdef"
}
```

**What to do next:**
- Redirect user to the `url` in the response
- User completes payment on Stripe's secure page
- Stripe redirects back to your success/cancel URL

---

### **4. POST /subscription/create**
Create subscription with payment method (Advanced - requires Stripe Elements)

**Request:**
```http
POST http://localhost:7000/subscription/create
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "planType": "PROFESSIONAL",
  "paymentMethodId": "pm_1234567890abcdef"
}
```

**Response:**
```json
{
  "subscriptionId": "sub_1234567890",
  "customerId": "cus_1234567890",
  "status": "active",
  "planType": "PROFESSIONAL",
  "minutesAllocated": 1000,
  "minutesUsed": 0,
  "minutesRemaining": 1000,
  "currentPeriodStart": "2025-12-06T08:30:00.000Z",
  "currentPeriodEnd": "2026-01-06T08:30:00.000Z",
  "clientSecret": "pi_123_secret_456"
}
```

---

### **5. GET /subscription/current**
Get current user's subscription details

**Request:**
```http
GET http://localhost:7000/subscription/current
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "subscriptionId": "sub_1234567890",
  "customerId": "cus_1234567890",
  "status": "ACTIVE",
  "planType": "PROFESSIONAL",
  "planName": "Professional",
  "price": 899,
  "minutesAllocated": 1000,
  "minutesUsed": 800,
  "minutesRemaining": 200,
  "currentPeriodStart": "2025-12-06T08:30:00.000Z",
  "currentPeriodEnd": "2026-01-06T08:30:00.000Z",
  "features": [
    "Average of 2-5 easy to follow trade alerts",
    "Average of 2-5 easy to follow trade",
    "Average of 2-5 easy to follow trade alerts per week",
    "Average of 2-5 easy to follow"
  ]
}
```

---

### **6. PATCH /subscription/update**
Upgrade or downgrade subscription plan

**Request:**
```http
PATCH http://localhost:7000/subscription/update
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "newPlanType": "ENTERPRISE"
}
```

**Response:**
```json
{
  "message": "Subscription updated successfully",
  "subscriptionId": "sub_1234567890",
  "newPlanType": "ENTERPRISE",
  "planName": "Enterprise",
  "price": 1299,
  "minutesAllocated": 2000
}
```

---

### **7. DELETE /subscription/cancel**
Cancel current subscription

**Request:**
```http
DELETE http://localhost:7000/subscription/cancel
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "message": "Subscription cancelled successfully",
  "subscriptionId": "sub_1234567890",
  "status": "canceled"
}
```

---

### **8. GET /subscription/invoices**
Get transaction/invoice history

**Request:**
```http
GET http://localhost:7000/subscription/invoices
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
[
  {
    "date": "2025-12-06T08:30:00.000Z",
    "name": "Customer",
    "transactionId": "INV-2025-001",
    "status": "PAID",
    "amount": 899,
    "currency": "EUR",
    "invoiceUrl": "https://invoice.stripe.com/i/acct_xxx/test_xxx"
  },
  {
    "date": "2025-11-06T08:30:00.000Z",
    "name": "Customer",
    "transactionId": "INV-2025-002",
    "status": "PAID",
    "amount": 899,
    "currency": "EUR",
    "invoiceUrl": "https://invoice.stripe.com/i/acct_xxx/test_xxx"
  }
]
```

---

## 🧪 **Complete Testing Flow (A to Z)**

### **Step 1: Start the Server**
```bash
npm run start:dev
```

### **Step 2: Get JWT Token**
First, login to get your JWT token:
```http
POST http://localhost:7000/auth/login
Content-Type: application/json

{
  "email": "your@email.com",
  "password": "yourpassword"
}
```

**Copy the `accessToken` from response** - you'll use this in all subscription requests.

---

### **Step 3: View Available Plans**
```http
GET http://localhost:7000/subscription/plans
Authorization: Bearer YOUR_JWT_TOKEN
```

✅ You should see 3 plans: BASIC, PROFESSIONAL, ENTERPRISE

---

### **Step 4: Update a Plan (Optional)**
```http
PUT http://localhost:7000/subscription/plans/update
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "planType": "BASIC",
  "minutes": 600,
  "features": ["Updated feature 1", "Updated feature 2"]
}
```

✅ Plan should be updated in database

---

### **Step 5: Create Subscription (Choose ONE method)**

#### **Method A: Stripe Checkout (Recommended & Easiest)**
```http
POST http://localhost:7000/subscription/checkout?planType=PROFESSIONAL
Authorization: Bearer YOUR_JWT_TOKEN
```

**You'll get:**
```json
{
  "sessionId": "cs_test_xxx",
  "url": "https://checkout.stripe.com/c/pay/cs_test_xxx"
}
```

**Then:**
1. Open the `url` in browser
2. Enter test card: `4242 4242 4242 4242`
3. Expiry: Any future date
4. CVC: Any 3 digits
5. Complete payment
6. Stripe redirects you back

#### **Method B: Direct Subscription (Advanced)**
Requires Stripe Elements implementation in frontend - skip for now unless you have custom payment UI.

---

### **Step 6: Check Current Subscription**
```http
GET http://localhost:7000/subscription/current
Authorization: Bearer YOUR_JWT_TOKEN
```

✅ You should see your active subscription with minutes allocated

---

### **Step 7: Upgrade/Downgrade Plan**
```http
PATCH http://localhost:7000/subscription/update
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "newPlanType": "ENTERPRISE"
}
```

✅ Your plan should be upgraded

---

### **Step 8: View Invoices**
```http
GET http://localhost:7000/subscription/invoices
Authorization: Bearer YOUR_JWT_TOKEN
```

✅ You should see your payment history

---

### **Step 9: Cancel Subscription**
```http
DELETE http://localhost:7000/subscription/cancel
Authorization: Bearer YOUR_JWT_TOKEN
```

✅ Subscription should be cancelled

---

## 📝 **Postman Collection Setup**

### **Create Environment Variables:**
1. Click gear icon ⚙️ → Environments
2. Add new environment: "Subscription API"
3. Add variables:
   - `base_url` = `http://localhost:7000`
   - `token` = (paste your JWT token here)

### **Use in Requests:**
- URL: `{{base_url}}/subscription/plans`
- Authorization: `Bearer {{token}}`

---

## 🧪 **Stripe Test Cards**

| Card Number | Description |
|------------|-------------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0025 0000 3155` | Requires authentication |

**For all cards:**
- Expiry: Any future date (e.g., 12/26)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits (e.g., 12345)

---

## ✅ **Expected Flow for End User**

1. **User views plans** → `GET /subscription/plans`
2. **User clicks "Subscribe"** → Frontend calls `POST /subscription/checkout?planType=PROFESSIONAL`
3. **User redirected to Stripe** → Enters payment details on Stripe's secure page
4. **Payment processed** → Stripe creates subscription automatically
5. **User redirected back** → To your success URL
6. **Display subscription** → `GET /subscription/current` to show active plan
7. **User can upgrade** → `PATCH /subscription/update` with new plan type
8. **User can cancel** → `DELETE /subscription/cancel`

---

## 🎯 **Quick Test Checklist**

- [ ] Server running on port 7000
- [ ] Have valid JWT token
- [ ] Can view all plans
- [ ] Can update plan details
- [ ] Can create checkout session
- [ ] Can view current subscription
- [ ] Can upgrade/downgrade plan
- [ ] Can view invoices
- [ ] Can cancel subscription

---

## 🚨 **Common Issues & Solutions**

### **Issue: "No subscription found"**
**Solution:** Create a subscription first using checkout or create endpoint

### **Issue: "Invalid plan type"**
**Solution:** Use exact plan types: `BASIC`, `PROFESSIONAL`, or `ENTERPRISE`

### **Issue: "Authorization header required"**
**Solution:** Add `Authorization: Bearer YOUR_JWT_TOKEN` header

### **Issue: Stripe test mode not working**
**Solution:** Make sure you're using test keys (starts with `pk_test_` and `sk_test_`)

---

## 📞 **Support**

All APIs are now ready to test! The plan data is stored in database and persists across server restarts.

**Happy Testing! 🚀**

# Billing & Billing API

## List Bills
**Endpoint:** `GET /api/bills`

**Response Body:**
```json
[
  {
    "id": 1,
    "customer_id": 5,
    "customer_name": "Bob Miller",
    "customer_phone": "+123456789",
    "amount": 200.00,
    "month_ending": "2026-03-31",
    "due_date": "2026-04-05",
    "pay_via": "UPI | Bank Transfer | Credit Card",
    "pay_date": "2026-04-02",
    "status": "paid | pending | overdue"
  }
]
```

## Create Bill
**Endpoint:** `POST /api/bills`

**Request Body:**
```json
{
  "customer_id": 5,
  "amount": 150.00,
  "month_ending": "2026-04-30",
  "due_date": "2026-05-05",
  "pay_via": "Bank Transfer"
}
```

## Update Status
**Endpoint:** `PATCH /api/bills/:id/status`

**Request Body:**
```json
{
  "status": "paid"
}
```

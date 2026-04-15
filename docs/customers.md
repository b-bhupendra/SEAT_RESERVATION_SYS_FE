# Customers API

## List Customers
**Endpoint:** `GET /api/customers`

**Response Body:**
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "status": "active | inactive",
    "first_contact": "2026-03-01",
    "avatar": "string (optional url)"
  }
]
```

## Create Customer
**Endpoint:** `POST /api/customers`

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+9876543210",
  "status": "active"
}
```

## Biometric Scan
**Endpoint:** `POST /api/customers/scan` (Simulation point)

**Request:** Triggered via UI modal.
**Response:** Success/Failure based on verification flow.

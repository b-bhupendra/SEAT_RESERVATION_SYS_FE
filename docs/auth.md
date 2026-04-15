# Authentication & Roles

## Login
**Endpoint:** `POST /api/auth/login` (Simulated in demo)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Successful Response:**
```json
{
  "user": {
    "email": "user@example.com",
    "role": "admin | manager | staff"
  },
  "token": "string (optional/future)"
}
```

## Role Definitions & Permissions

| Role | Permissions |
| :--- | :--- |
| **Admin** | Full access to all modules and actions. |
| **Manager** | Access to all modules. Limited system config access. |
| **Staff** | Access to Customers and Reservations. Read-only for Billing. Cannot add/delete primary records. |

### Visibility Logic
The frontend uses the `role` field to conditionally render navigation items and action buttons (e.g., "Add Customer").
- **Admin/Manager:** Sees all sidebar tabs.
- **Staff:** Sees only Customers and Reservations tabs.

# Reservations API

## List Reservations
**Endpoint:** `GET /api/reservations`

**Response Body:**
```json
[
  {
    "id": 1,
    "customer_id": 12,
    "customer_name": "Alice Brown",
    "subsection": "Trisha | G2 Library | Main Hall",
    "seat_number": "A1-04",
    "start_date": "2026-03-15",
    "end_date": "2026-04-15",
    "duration_months": 1,
    "amount": 150.00,
    "pay_via": "Cash | QR Platform | Credit Card",
    "status": "paid | pending | overdue"
  }
]
```

## Create Reservation
**Endpoint:** `POST /api/reservations`

**Request Body:**
```json
{
  "customer_id": 1,
  "subsection": "Main Hall",
  "seat_number": "B-22",
  "start_date": "2026-03-20",
  "duration_months": 3,
  "amount": 450.00,
  "pay_via": "QR Platform"
}
```

## Update Status
**Endpoint:** `PATCH /api/reservations/:id/status`

**Request Body:**
```json
{
  "status": "paid"
}
```

# Notifications API

## List Notifications
**Endpoint:** `GET /api/notifications`

**Response Body:**
```json
[
  {
    "id": 1,
    "customer_id": 3,
    "customer_name": "Charlie Wilson",
    "message": "Reminder: Your payment is due tomorrow.",
    "sent_at": "2026-03-19T14:30:00Z"
  }
]
```

## Send Notification
**Endpoint:** `POST /api/notifications`

**Request Body:**
```json
{
  "customer_id": 3,
  "message": "Custom notification message text."
}
```

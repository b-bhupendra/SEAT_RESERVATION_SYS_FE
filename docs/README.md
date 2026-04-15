# Lumina Pro API Documentation

This directory contains the API contract expected by the Lumina Pro frontend. Implementing these endpoints will allow for seamless integration with a custom backend.

## Base URL
All API calls are relative to the same origin during development (proxied via Vite) or a configured environment variable.

## Authentication
The frontend expects a session-based or token-based authentication mechanism.
See [Authentication & Roles](./auth.md) for details on login and role-based access.

## Core Modules
- [Customers](./customers.md) - Relationship management and biometric data.
- [Reservations](./reservations.md) - Seat and cabin bookings.
- [Billing & Invoices](./billing.md) - Payment tracking and invoice generation.
- [Notifications](./notifications.md) - System alerts and customer reminders.

## Data Format
- All requests and responses use **JSON**.
- Date strings should follow **ISO 8601** (e.g., `2026-03-19`).
- Amount values are generally **Number/Float**.

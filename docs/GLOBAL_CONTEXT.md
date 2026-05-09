# Global Context

## Product
Schollet - School Finance Management System

## Tech Stack
- Next.js (App Router)
- TypeScript
- shadcn/ui
- Supabase (PostgreSQL)

## Core Rules
- All financial actions must create journal entries
- All critical actions must be logged in audit_logs
- No business logic in UI
- Use services layer for logic

## Coding Standards
- Strict typing
- No any
- Reusable components
- API-first approach

## Database Rules
- Use transactions for:
  - Fee payment
  - Salary processing
- Maintain referential integrity

## UI Rules
- Clean dashboard layout
- Always show:
  - Total
  - Paid
  - Pending

## Security
- Validate all inputs
- Never trust frontend
- Use role-based access

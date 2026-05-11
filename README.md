# Salafni BNPL Tunisia

Production-structured Tunisian BNPL fintech MVP using Next.js, NestJS, TypeScript, TailwindCSS, and a filesystem JSON data lake instead of a traditional database.

## Architecture

- `apps/web`: Next.js customer/admin/merchant-facing web app.
- `apps/api`: NestJS REST API with Swagger at `/docs`.
- `packages/shared`: shared domain contracts.
- `data`: local JSON data lake generated at runtime.
- `data/indexes`: indexed lookup files.
- `data/audit`: append-only JSONL audit trail.

## JSON Data Lake Guarantees

The storage layer implements repository/service boundaries, atomic temp-file writes, per-collection write queues, memory caching, indexes, soft deletes, optimistic versioning, audit logging, pagination, and recovery-safe directory layout. Controllers never access JSON files directly.

## WSL Quickstart

Run from WSL:

```bash
cd /mnt/c/code/c2
cp .env.example .env
pnpm install
pnpm seed
pnpm dev
```

Open:

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1
- Swagger: http://localhost:4000/docs

## Demo Credentials

- Email: `amira@example.tn`
- Password: `DemoPass123!`

## Gmail Registration

Create a Google OAuth Web Client in Google Cloud Console and set both values in `.env`:

- `GOOGLE_CLIENT_ID`: backend verifier audience.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: frontend Google Identity Services client ID.

After changing dependencies, run `pnpm install` again.

## Docker

```bash
cd /mnt/c/code/c2
cp .env.example .env
docker compose up --build
```

## Key Features

- Email/phone signup foundation
- JWT access and refresh token issuance
- KYC submit/approve/reject workflows
- Dynamic credit scoring and credit limit recalculation
- BNPL loan creation with 4 weekly installments
- Mock-payment-ready abstraction surface
- Merchant onboarding and approval
- Admin analytics endpoint
- Notification persistence
- Append-only audit trail
- Premium fintech frontend landing, customer dashboard, and admin command center

## Important Notes

- No PostgreSQL, MySQL, MongoDB, SQLite, Supabase, Firebase, Prisma, Sequelize, or TypeORM are used.
- AWS S3 configuration is prepared through environment variables; real upload endpoints should be enabled once credentials and compliance controls are finalized.
- Banking, card, wallet, crypto, and open-banking integrations are intentionally abstract/mock-ready until commercial agreements are complete.

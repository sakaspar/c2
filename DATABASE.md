# Salafni — Data Layer Documentation

## Overview

The backend uses a **flat-file JSON data lake** managed by `JsonDataLakeService` (`apps/api/src/modules/storage/json-data-lake.service.ts`). All data lives under the `data/` directory at the project root. There is **no SQL/NoSQL database** — every record is a `.json` file on disk.

The root path is resolved from the `DATA_LAKE_ROOT` env variable (defaults to `../../data` relative to `apps/api/`).

---

## Directory Structure

```
data/
├── indexes/                          # Collection indexes (auto-managed)
│   ├── users_index.json
│   ├── loans_index.json
│   ├── merchants_index.json
│   ├── products_index.json
│   ├── credit_scores_index.json
│   ├── kyc_cases_index.json
│   ├── transactions_index.json
│   ├── notifications_index.json
│   └── sessions_index.json
│
├── clients/                          # Client profile directories (per-user)
│   └── {client-slug}/               # Slugified from user's fullName
│       ├── profile.json              # Client profile + documents metadata
│       └── kyc/                      # Uploaded KYC document files
│           ├── cin_front.jpg
│           ├── cin_back.jpg
│           ├── selfie.jpg
│           └── proof_of_address.jpg
│
├── users/                            # ⚠️ COLLECTION — user record JSON files
│   └── user_{uuid}.json              #    Written by the collections system
│
├── loans/                            # Loan record JSON files
│   └── loan_{uuid}.json
│
├── merchants/                        # Merchant record JSON files (collection)
│   └── merchant_{uuid}.json
│
├── merchant/                         # ⚠️ LEGACY seed merchant data (not a collection)
│   ├── techstore-tunis.json
│   ├── mode-carthage.json
│   └── maison-sousse.json
│
├── products/                         # Product record JSON files
│   └── product_{uuid}.json
│
├── credit_scores/                    # Credit score record JSON files
│   └── credit_score_{uuid}.json
│
├── kyc_cases/                        # KYC application case JSON files
│   └── kyc_case_{uuid}.json
│
├── transactions/                     # Transaction record JSON files
│   └── transaction_{uuid}.json
│
├── notifications/                    # Notification record JSON files
│   └── notification_{uuid}.json
│
├── sessions/                         # Session record JSON files
│   └── session_{uuid}.json
│
├── admin/                            # Static admin user seed data
│   ├── super-admin.json
│   ├── merchant-ops.json
│   └── risk-analyst.json
│
├── audit/                            # Append-only audit log (one file per day)
│   └── YYYY-MM-DD.jsonl
│
├── uploads/                          # Generic upload staging area
│   ├── kyc/
│   └── contracts/
│
└── transactions_log/                 # Transaction log (reserved)
```

---

## Two Storage Systems (⚠️ Known Issue)

There are **two parallel systems** for storing user/client data that must be kept in sync:

### 1. Collections System (`create`, `update`, `findById`, `query`)

Generic CRUD engine. Each collection has:
- A **directory**: `data/{collection}/` containing `{id}.json` files
- An **index**: `data/indexes/{collection}_index.json` for fast lookup/filtering

Registered collections: `users`, `loans`, `transactions`, `merchants`, `products`, `credit_scores`, `notifications`, `kyc_cases`, `sessions`

When you call `storage.create('users', ...)`, it writes to `data/users/user_{uuid}.json` and updates `data/indexes/users_index.json`.

### 2. Client Profiles System (`writeClientProfile`, `listClientProfiles`)

A separate per-client directory structure under `data/clients/`:
- `data/clients/{slug}/profile.json` — rich client profile with documents metadata
- `data/clients/{slug}/kyc/` — actual uploaded KYC document files (images, PDFs)

The slug is derived from the user's `fullName` (lowercased, diacritics stripped, non-alphanumeric replaced with hyphens).

### ⚠️ The Problem

- The **`users` collection** writes records to `data/users/` and indexes them in `users_index.json`.
- The **client profiles** write to `data/clients/{slug}/` independently.
- These two systems can be **out of sync**: a user record may exist in the index pointing to `data/users/user_xxx.json`, but the actual rich profile (with documents, KYC status, employment info) only exists at `data/clients/{slug}/profile.json`.
- The `data/users/` directory may be **empty** while `data/clients/` has the actual data.

### ⚠️ Legacy `merchant/` vs Collection `merchants/`

- `data/merchant/` contains hand-seeded merchant files (e.g., `techstore-tunis.json`).
- `data/merchants/` is the collection directory used by `storage.create('merchants', ...)`.
- These are **separate** — the seed data in `merchant/` is not indexed or managed by the collections system.

---

## Index File Format

Each `data/indexes/{collection}_index.json` is a flat object keyed by record ID:

```json
{
  "user_{uuid}": {
    "path": "users/user_{uuid}.json",
    "updatedAt": "2026-05-12T17:41:42.403Z",
    "deletedAt": null,
    "fields": {
      "email": "user@example.com",
      "phone": "+21620123456",
      "state": "active",
      "kycState": "approved",
      "username": "johndoe"
    }
  }
}
```

- **`path`**: relative path from `data/` root to the record JSON file
- **`fields`**: indexed subset of the record (used for filtering in `query()` without reading every file). Indexed fields: `email`, `phone`, `state`, `userId`, `merchantId`, `kycState`, `riskTier`, `channel`, `username`

---

## Record JSON Format

Every collection record extends `BaseRecord`:

```json
{
  "id": "user_{uuid}",
  "version": 3,
  "createdAt": "2026-05-12T00:00:00.000Z",
  "updatedAt": "2026-05-12T01:00:00.000Z",
  "deletedAt": null
}
```

- **`version`**: incremented on every update (used for optimistic locking)
- **`deletedAt`**: set on soft-delete, filtered out by default in queries

---

## Client Profile Format (`data/clients/{slug}/profile.json`)

```json
{
  "id": "user_{uuid}",
  "fullName": "Hamza Saadi",
  "email": "hamza@example.com",
  "state": "pending_kyc",
  "kycState": "under_review",
  "employmentStatus": "unemployed",
  "latestKycApplicationId": "kyc_case_{uuid}",
  "documents": [
    {
      "type": "cin_front",
      "fileName": "photo.jpg",
      "storagePath": "clients/hamza-saadi/kyc/photo.jpg",
      "uploadedAt": "2026-05-12T03:17:10.592Z"
    }
  ],
  "updatedAt": "2026-05-12T03:17:10.626Z"
}
```

- **`documents[].storagePath`**: relative path from `data/` to the actual file on disk
- **`documents[].type`**: one of `cin_front`, `cin_back`, `selfie`, `proof_of_address`, `bank_statement_month_1`, `bank_statement_month_2`, `bank_statement_month_3`

---

## KYC Case Format (`data/kyc_cases/kyc_case_{uuid}.json`)

```json
{
  "id": "kyc_case_{uuid}",
  "userId": "user_{uuid}",
  "employmentStatus": "unemployed",
  "state": "under_review",
  "documents": [
    {
      "type": "cin_front",
      "fileName": "photo.jpg",
      "storagePath": "clients/{slug}/kyc/photo.jpg",
      "uploadedAt": "2026-05-12T17:15:06.829Z"
    }
  ],
  "missingDocuments": [],
  "submittedAt": "2026-05-12T17:15:06.829Z",
  "version": 1,
  "createdAt": "2026-05-12T17:15:06.829Z",
  "updatedAt": "2026-05-12T17:15:06.829Z",
  "deletedAt": null
}
```

---

## Loan Record Format (`data/loans/loan_{uuid}.json`)

```json
{
  "id": "loan_{uuid}",
  "userId": "user_{uuid}",
  "merchantId": "merchant_{uuid}",
  "principal": { "amount": 500, "currency": "TND" },
  "outstanding": { "amount": 500, "currency": "TND" },
  "state": "active",
  "dueDate": "2026-06-09T00:00:00.000Z",
  "installments": [
    {
      "id": "inst_{uuid}",
      "amount": { "amount": 125, "currency": "TND" },
      "dueDate": "2026-05-19T00:00:00.000Z",
      "state": "pending"
    }
  ],
  "lateFees": { "amount": 0, "currency": "TND" },
  "version": 1,
  "createdAt": "2026-05-12T00:00:00.000Z",
  "updatedAt": "2026-05-12T00:00:00.000Z",
  "deletedAt": null
}
```

- Loans have 4 weekly installments (7 days apart)
- States: `pending` → `active` → `paid` | `overdue` → `defaulted`

---

## Merchant Record Format (`data/merchants/merchant_{uuid}.json`)

```json
{
  "id": "merchant_{uuid}",
  "legalName": "TechStore SARL",
  "displayName": "TechStore Tunis",
  "state": "approved",
  "settlementIban": "TN59000000000000001",
  "category": "electronics",
  "riskTier": "low",
  "version": 1,
  "createdAt": "2026-04-10T09:00:00.000Z",
  "updatedAt": "2026-05-09T10:00:00.000Z",
  "deletedAt": null
}
```

---

## Admin Seed Data (`data/admin/`)

Static JSON files, **not** managed by the collections system:

```json
{
  "id": "admin_super_admin",
  "fullName": "Salafni Super Admin",
  "email": "admin@salafni.tn",
  "role": "admin",
  "permissions": ["clients:read", "clients:review", "merchants:read", "merchants:review", "kyc:approve", "kyc:reject"],
  "state": "active"
}
```

---

## Audit Log (`data/audit/`)

Append-only JSONL files (one line per event, one file per day):

```jsonl
{"id":"...","collection":"users","recordId":"user_xxx","action":"create","actorId":null,"reason":null,"occurredAt":"2026-05-12T00:00:00.000Z"}
{"id":"...","collection":"users","recordId":"user_xxx","action":"update","actorId":null,"reason":null,"occurredAt":"2026-05-12T01:00:00.000Z"}
```

---

## File Upload Flow

1. Frontend uploads file via `POST /api/v1/kyc/:userId/upload` (multipart form with `file` + `type`)
2. Backend saves to `data/clients/{slug}/kyc/{safe-filename}` via `saveUploadedFile()`
3. The relative `storagePath` (e.g., `clients/hamza-saadi/kyc/photo.jpg`) is stored in both the client profile and the KYC case record
4. Admin views documents via `GET /api/v1/admin/kyc-documents/{storagePath}` which resolves and streams the file

---

## Key Methods in `JsonDataLakeService`

| Method | Description |
|---|---|
| `create(collection, data)` | Create record in `data/{collection}/{id}.json` + update index |
| `update(collection, id, patch)` | Patch record, bump version, update index |
| `findById(collection, id)` | Read record by ID (cached) |
| `query(collection, options)` | Filter/sort/paginate via index |
| `softDelete(collection, id)` | Set `deletedAt` timestamp |
| `writeClientProfile(name, profile)` | Write to `data/clients/{slug}/profile.json` |
| `listClientProfiles()` | List all client directories under `data/clients/` |
| `saveUploadedFile(relativePath, buffer)` | Write raw file buffer to `data/{relativePath}` |
| `resolveFilePath(relativePath)` | Resolve + validate path under `data/clients/` |
| `getFileStream(absolutePath)` | Return readable stream for file serving |

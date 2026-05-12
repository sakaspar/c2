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
│   ├── kyb_cases_index.json
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
├── users/                            # User entities (directory per user)
│   └── user_{uuid}/
│       └── record.json               # UserRecord
│
├── loans/                            # Loan entities (directory per loan)
│   └── loan_{uuid}/
│       └── record.json               # LoanRecord
│
├── merchants/                        # Merchant entities (directory per merchant)
│   └── merchant_{uuid}/
│       ├── record.json               # MerchantRecord
│       └── kyb/                      # KYB document uploads
│           ├── commercial_register.pdf
│           ├── tax_certificate.pdf
│           └── ...
│
├── products/                         # Product entities (directory per product)
│   └── product_{uuid}/
│       └── record.json               # ProductRecord
│
├── credit_scores/                    # Credit score entities
│   └── credit_score_{uuid}/
│       └── record.json               # CreditScoreRecord
│
├── kyc_cases/                        # KYC application entities
│   └── kyc_case_{uuid}/
│       └── record.json               # KycApplicationRecord
│
├── kyb_cases/                        # KYB application entities
│   └── kyb_case_{uuid}/
│       └── record.json               # KybApplicationRecord
│
├── transactions/                     # Transaction entities
│   └── transaction_{uuid}/
│       └── record.json               # TransactionRecord
│
├── notifications/                    # Notification entities
│   └── notification_{uuid}/
│       └── record.json               # NotificationRecord
│
├── sessions/                         # Session entities
│   └── session_{uuid}/
│       └── record.json               # SessionRecord
│
├── audit/                            # Append-only audit log (one file per day)
│   └── YYYY-MM-DD.jsonl
│
└── transactions_log/                 # Transaction log (reserved)
```

---

## How The Database Works

The application uses a **JSON file data lake**. There is no database server. The API reads and writes `.json` files under `data/`.

There are three important concepts:

- **Collection records** — canonical entities used by API services (`users`, `merchants`, `loans`, etc.)
- **Indexes** — small lookup files that tell the API where records are and expose filterable fields
- **Profile/document directories** — human-friendly folders for rich profile views and uploaded files

### 1. Collection Records (`create`, `update`, `findById`, `query`)

Generic CRUD engine. Each collection has:
- A **directory**: `data/{collection}/` containing entity subdirectories
- Each entity: `data/{collection}/{id}/record.json` (directory per entity, room for related files)
- An **index**: `data/indexes/{collection}_index.json` for fast lookup/filtering

Registered collections: `users`, `loans`, `transactions`, `merchants`, `products`, `credit_scores`, `notifications`, `kyc_cases`, `kyb_cases`, `sessions`

When you call `storage.create('users', ...)`, it writes to `data/users/user_{uuid}/record.json` and updates `data/indexes/users_index.json`.

The collection record is the **source of truth** for each entity.

Examples:

- **User**: `data/users/user_123/record.json`
- **Merchant**: `data/merchants/merchant_123/record.json`
- **Product**: `data/products/product_123/record.json`
- **Loan**: `data/loans/loan_123/record.json`
- **KYB case**: `data/kyb_cases/kyb_case_123/record.json`

### 2. Indexes

Every collection has an index under `data/indexes/`.

Example: `data/indexes/users_index.json`

The index is not the full data. It is a fast lookup table:

- **Key**: record ID
- **`path`**: where the actual `record.json` lives
- **`fields`**: small searchable fields like `email`, `state`, `merchantId`, `username`

The API uses indexes for `query()` so it does not need to scan every JSON file every time.

Important rule:

- **If a file is missing but the index still points to it, that index entry is stale.**

The storage service handles this in three ways:

- **Startup rebuild**: `rebuildIndexesFromDisk()` scans actual records on disk and recreates/fixes index entries from real files.
- **Startup cleanup**: `pruneStaleIndexEntries()` removes entries pointing to missing files only after trying known path formats.
- **Runtime cleanup**: `findById()` catches `ENOENT`, removes the broken index entry, and returns `null` instead of crashing.

This means Google login and regular login should be based on real user records on disk, not hardcoded users. If a real user file exists but the index path is wrong, startup rebuild repairs it.

### 3. Client Profile Projection (`writeClientProfile`, `listClientProfiles`)

A separate per-client directory structure exists under `data/clients/`:
- `data/clients/{slug}/profile.json` — rich client profile with documents metadata
- `data/clients/{slug}/kyc/` — actual uploaded KYC document files (images, PDFs)

The slug is derived from the user's `fullName` (lowercased, diacritics stripped, non-alphanumeric replaced with hyphens).

This is a **projection / view directory**, not a replacement for the canonical user record.

Canonical user record:

```text
data/users/user_123/record.json
```

Client profile projection:

```text
data/clients/hamza-saadi/profile.json
data/clients/hamza-saadi/kyc/cin_front.jpg
```

The KYC flow updates both:

- `users/{id}/record.json` — current user state and KYC status
- `clients/{slug}/profile.json` — rich admin-friendly profile with document metadata

### 4. Entity Document Directories

Uploaded documents should live inside the entity's directory when possible.

Example merchant KYB:

```text
data/merchants/merchant_123/
├── record.json
└── kyb/
    ├── commercial_register.pdf
    ├── tax_certificate.pdf
    ├── articles_of_association.pdf
    ├── bank_rib.pdf
    └── representative_cin.jpg
```

The API stores these paths as relative paths, for example:

```json
{
  "storagePath": "merchants/merchant_123/kyb/commercial_register.pdf"
}
```

The admin document preview endpoint resolves that relative path under `data/`.

### Legacy `merchant/` vs Collection `merchants/`

- `data/merchant/` contains hand-seeded merchant files (e.g., `techstore-tunis.json`).
- `data/merchants/` is the collection directory used by `storage.create('merchants', ...)`.
- These are **separate** — the seed data in `merchant/` is not indexed or managed by the collections system.
- New code should use `data/merchants/{merchantId}/record.json`.

---

## Index File Format

Each `data/indexes/{collection}_index.json` is a flat object keyed by record ID:

```json
{
  "user_{uuid}": {
    "path": "users/user_{uuid}/record.json",
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

- **`path`**: relative path from `data/` root to the record JSON file (e.g., `users/user_{uuid}/record.json`)
- **`fields`**: indexed subset of the record (used for filtering in `query()` without reading every file). Indexed fields: `email`, `phone`, `state`, `userId`, `merchantId`, `kycState`, `riskTier`, `channel`, `username`, `displayName`, `legalName`, `category`

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

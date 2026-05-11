# Deployment Guide

## WSL Development

```bash
cd /mnt/c/code/c2
cp .env.example .env
pnpm install
pnpm seed
pnpm dev
```

## Production Build

```bash
pnpm build
pnpm --filter @bnpl/api start
pnpm --filter @bnpl/web start
```

## Docker Compose

```bash
docker compose up --build -d
```

## Data Persistence

Mount these directories as persistent volumes:

- `/app/data`
- `/app/backups`

## Environment Hardening

Before production:

- Replace JWT secrets with high-entropy secrets.
- Set a 32-byte encryption key.
- Configure AWS S3 bucket policies for KYC files.
- Add external log/error sinks.
- Put the API behind a TLS reverse proxy.
- Add real payment adapter implementations behind the payment interface.
- Add regulated audit retention and backup policies.

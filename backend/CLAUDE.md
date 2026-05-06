# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS backend API for a multi-tenant digital menu (cardápio) SaaS. Each tenant (restaurant/business) has their own products, categories, and public-facing menu accessible via a unique slug.

## Commands

```bash
npm run start:dev       # Development with hot-reload
npm run build           # Compile TypeScript → dist/
npm run start:prod      # Run compiled output
npm run lint            # ESLint with auto-fix
npm run format          # Prettier format
npm run test            # Jest unit tests
npm run test:e2e        # E2E tests (config: test/jest-e2e.json)
npm run test:cov        # Coverage report
```

### Database

```bash
npx prisma migrate dev --name <name>   # Create and apply a migration
npx prisma migrate deploy              # Apply pending migrations (prod)
npx prisma studio                      # Open Prisma Studio UI
npx prisma generate                    # Regenerate Prisma client after schema changes
```

## Architecture

### Module Structure

Each feature follows the NestJS pattern: `module → controller → service`. All business logic lives in services; controllers only handle HTTP routing and DTO mapping.

- **auth** — JWT login (`POST /auth/login`). JWT secret is currently hardcoded as `'segredo-temporario'`.
- **users** — Registration (`POST /users`) and profile management (`GET/PATCH /users/me`). Handles slug generation and tenant customization (logo, banner, hours, primary color).
- **products** — Tenant-scoped CRUD (`/products`). All queries filter by `userId` from JWT.
- **categories** — Tenant-scoped CRUD (`/categories`). Products reference categories with `SET NULL` on delete.
- **public** — Unauthenticated menu view (`GET /public/cardapio/:slug`). Returns full user profile + nested categories + products in a single query.
- **upload** — File upload via multer (`POST /upload`). Saves to `./uploads/` and returns `http://localhost:3000/uploads/{filename}`.
- **prisma** — Shared `PrismaService` (singleton) using `@prisma/adapter-pg` with connection pooling. Injected into all services via `PrismaModule` (global).

### Multi-tenancy

Every `Product` and `Category` row has a `userId` FK. Services always scope queries to the authenticated user's ID extracted from the JWT. The `slug` field on `User` is unique and powers public URL routing.

### Authentication Flow

1. `POST /auth/login` → bcrypt compare → sign JWT (7-day expiry)
2. Protected routes use `@UseGuards(AuthGuard('jwt'))`
3. JWT payload contains `sub: user.id`; services call `prisma.user.findUnique({ where: { id: req.user.sub } })`

### Database Schema (Prisma)

Three models: `User` → `Category` → `Product`. Both `Category` and `Product` cascade-delete when their owner `User` is deleted. `Product.categoryId` is nullable with `SET NULL` behavior.

Schema: `prisma/schema.prisma`  
Migrations: `prisma/migrations/`

### File Uploads

Static files are served at `/uploads` via `ServeStaticModule` pointed at `./uploads`. Uploaded filenames are `{timestamp}-{uuid}.{ext}`.

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha os valores. Variáveis obrigatórias:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret para assinar JWTs (use string longa e aleatória) |

Variáveis do Asaas (pagamento e assinaturas):

| Variável | Descrição |
|----------|-----------|
| `ASAAS_API_KEY` | Chave de API do Asaas (`$aact_...`). Se ausente, o backend sobe com warning e pagamento Pix fica desabilitado. |
| `ASAAS_BASE_URL` | URL base da API. Sandbox: `https://api-sandbox.asaas.com/v3` — Produção: `https://api.asaas.com/v3` |
| `ASAAS_WEBHOOK_TOKEN` | Token secreto para validar webhooks. Gere com: `openssl rand -base64 32` |

Links úteis:
- Sandbox (testes): https://sandbox.asaas.com/
- Produção: https://www.asaas.com/

## Key Notes

- The JWT secret must be set via `JWT_SECRET` env variable before production.
- Upload URLs use `API_URL` env variable; fallback is `http://localhost:3000` in dev.
- `prisma migrate deploy` applies pending migrations in production (never `db push` in prod).

## Pedidos — Origens

- WEBSITE: cardapio publico proprio (ATIVO)
- MANUAL: dono lanca no painel (ATIVO)
- WHATSAPP_BOT: chatbot (placeholder, integracao futura)
- IFOOD, RAPPI_99, UBER_EATS: schema preparado, aguarda parcerias

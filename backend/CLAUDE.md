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

## Key Notes

- `DATABASE_URL` is the only required env variable (`.env` file).
- The JWT secret (`'segredo-temporario'`) must be moved to an env variable before production deployment.
- Upload URLs are hardcoded to `http://localhost:3000` — this needs an env variable for production.
- No global validation pipe is configured; DTOs lack `class-validator` decorators as of the current state.

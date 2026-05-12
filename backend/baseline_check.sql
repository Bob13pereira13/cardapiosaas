-- Migration 013 applied?
SELECT migration_name, finished_at FROM "_prisma_migrations" WHERE migration_name LIKE '%013%';
-- Demo restaurant exists?
SELECT id, slug, nome FROM "Restaurant" WHERE slug = 'pizzaria-bella';
-- Owner account?
SELECT a.email, m.role FROM "Account" a JOIN "Membership" m ON m."accountId" = a.id WHERE m.role = 'OWNER' LIMIT 1;

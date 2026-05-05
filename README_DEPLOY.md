# Deploy em VPS - Cardapio SaaS

Guia para subir o SaaS em uma VPS com Docker, PostgreSQL, Traefik, HTTPS automatico, uploads persistentes e suporte a dominio proprio por restaurante.

## 1. Preparar servidor

Instale Docker e Compose Plugin:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Abra as portas `80` e `443` no firewall da VPS.

## 2. Clonar projeto

```bash
git clone <repo> cardapio-saas
cd cardapio-saas
cp .env.example .env
```

## 3. Configurar ambiente

Edite `.env` na raiz:

```env
POSTGRES_PASSWORD=senha-forte
JWT_SECRET=jwt-longo-e-aleatorio

APP_DOMAIN=seudominio.com
API_DOMAIN=api.seudominio.com
API_URL=https://api.seudominio.com
FRONTEND_URL=https://seudominio.com
CORS_ORIGINS=https://seudominio.com
NEXT_PUBLIC_API_URL=https://api.seudominio.com
NEXT_PUBLIC_APP_URL=https://seudominio.com

LETSENCRYPT_EMAIL=admin@seudominio.com

ASAAS_API_KEY=$aact_prod_xxx
ASAAS_BASE_URL=https://api.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=token-secreto
```

## 4. DNS da plataforma

Configure:

- `A seudominio.com -> IP_DA_VPS`
- `A api.seudominio.com -> IP_DA_VPS`

O Traefik emite SSL automaticamente via Let's Encrypt.

## 5. Subir containers

```bash
docker compose up -d --build
```

O compose cria:

- `db`: PostgreSQL
- `backend`: NestJS na porta interna `3000`
- `frontend`: Next.js standalone na porta interna `3000`
- `proxy`: Traefik em `80/443`

## 6. Banco e Prisma

O backend executa `prisma migrate deploy` ao iniciar. Se precisar rodar manualmente:

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma generate
```

Para ambiente inicial sem historico de migrations, use `db push` apenas se voce tiver certeza que nao ha dados a preservar:

```bash
docker compose exec backend npx prisma db push
```

## 7. Uploads

Uploads ficam fora do container em volume Docker montado em `/uploads`.

Faça backup do volume `uploads_data`. Para escalar horizontalmente, migrar depois para S3, Cloudflare R2 ou storage compativel.

## 8. Dominio proprio de restaurante

No dashboard do restaurante, configure o dominio em `/dashboard/configuracoes`.

DNS recomendado:

- Subdominio: `CNAME cardapio.restaurante.com -> seudominio.com`
- Dominio raiz: `A restaurante.com -> IP_DA_VPS`

Depois de validar DNS, marque `customDomainVerified=true` no banco ou implemente uma rotina automatica de verificacao DNS.

O frontend reescreve dominios customizados para o cardapio publico, e o backend resolve o restaurante por `Host`.

## 9. Webhooks Asaas

Pedidos Pix:

```text
https://api.seudominio.com/public/webhooks/asaas/orders
```

Assinaturas SaaS:

```text
https://api.seudominio.com/billing/webhook/asaas
```

Header:

```text
asaas-access-token: mesmo valor de ASAAS_WEBHOOK_TOKEN
```

## 10. Validacao final

Backend:

```bash
cd backend
npm run lint
npm run build
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Fluxos manuais:

- Abrir cardapio publico por slug.
- Abrir cardapio por dominio proprio verificado.
- Criar pedido pagamento na entrega.
- Criar pedido Pix e conferir QR Code/copia e cola.
- Simular webhook Pix e conferir pedido `PAID`.
- Conferir cliente salvo em `/dashboard/clientes`.
- Gerar assinatura Pix/cartao e simular webhook Asaas.
- Conferir dashboard e admin.

## Checklist de deploy

- `.env` da raiz configurado.
- DNS `APP_DOMAIN` e `API_DOMAIN` apontando para VPS.
- Portas `80/443` abertas.
- `docker compose up -d --build` executado.
- `docker compose ps` saudavel.
- Migrations aplicadas.
- Webhooks Asaas cadastrados.
- Backup de `postgres_data` e `uploads_data` planejado.
- Primeiro dominio proprio testado com DNS propagado.

# BLOCOS_INVENTARIO.md

> Inventário completo de módulos por bucket — nome, arquivos, migrations, status, uso real e dependências.
> Gerado em: 2026-05-12. Somente relatório — NÃO remove nem altera código.

---

## Legenda

| Bucket | Significado |
|--------|-------------|
| **A — ESSENCIAL** | Núcleo do produto Tier 1.5: caixa, fiado, comandas, pedidos, delivery, cardápio, multi-tenancy, auth de funcionário |
| **B — ÚTIL futuro** | Válido para o produto, incompleto ou dependente de integração externa |
| **C — NÃO-RELACIONADO** | Código funcional mas fora do escopo atual de gestão do restaurante |
| **D — CONTRADIZ escopo** | Conflita com o modelo definido, cria inconsistência, ou assume parceria inexistente |

| Status | Significado |
|--------|-------------|
| **ATIVO** | Endpoints funcionando, dados reais no banco, chamado pelo frontend/smoke |
| **PARCIAL** | CRUD funcional mas dependência crítica ausente (canal, env, integração) |
| **SKELETON** | Estrutura existe, nenhuma lógica real implementada |
| **UNTRACKED** | Criado em Etapa 5, código existe mas não commitado |

---

## Histórico de commits — referência rápida

| Hash | Mensagem | Impacto |
|------|----------|---------|
| `434c198` | initial commit | monorepo base |
| `6ccf91f` | security: production-readiness | helmet, rate limit, admin guard |
| `2b5a359` | validation/DTOs/rate limiting | global ValidationPipe |
| `e20b587` | password reset, mail, pagination | mail, reset token |
| `def01af` | product fields, dashboard nav | products, frontend |
| `a27f1f0` | schema orders, coupons, option groups | Order, Coupon, OptionGroup |
| `bca9c6e` | cardápio público redesign Tailwind | public endpoint |
| `d7b7867` | pages fase 1+2, configuracoes | frontend, restaurants |
| `2d4d068` | **BLOCOs 1-26** (67 files, +6621 lines) | loyalty, NPS, customer-auth, QR, reports, integrations, scheduler, S3 |
| `7bfb0ac` | FASE A: fidelidade, NPS, notifications | loyalty (expand), nps, scheduler |
| `0cce093` | FASE B: tables, agenda, combos, campaigns, audit | 28 novos arquivos |
| `ba1d8fc` | audit logging orders/products | audit, orders |
| `4394002` | product availability + cron | products, scheduler |
| `5c193fa` | combo cart, customer tags/loyalty, QR mesa | customers, tables |
| `d52f2a0` | tracking, team, variations | team, tracking, delivery |
| `f274afb` | catalog complements and options | complementos |
| `c56c62c` | **security: remove PIN logging** | customer-auth fix |
| `4189ec8` | **fix: PaymentMethod mapping + block RADIUS** | orders, delivery-zones |
| *(untracked)* | Etapa 5: caixa, tabs, fiado, payments | tabs, cash-register, fiado |

---

---

# A — ESSENCIAL (Tier 1.5)

---

## A.1 — auth / jwt-strategy

**Commit origem:** `6ccf91f`, `e20b587`, `001-005 tenancy migrations` (2026-05-09)
**Status:** ATIVO

**Arquivos:**
```
src/auth/
  auth.controller.ts          POST /auth/login, POST /auth/select-restaurant, POST /auth/forgot-password, POST /auth/reset-password
  auth.service.ts             bcrypt compare, JWT sign com { accountId, activeRestaurantId, role }
  auth.module.ts
  auth.controller.spec.ts
  auth.service.spec.ts
  restaurant-scope.guard.ts   enforça req.user.activeRestaurantId em todas rotas protegidas
  dto/login.dto.ts
  dto/forgot-password.dto.ts
  dto/reset-password.dto.ts
  dto/select-restaurant.dto.ts
  jwt-strategy/
    jwt-strategy.service.ts   valida JWT, injeta user no req
    jwt-strategy.service.spec.ts
```

**Migrations:**
- `20260503230302_add_password_reset` — `User.resetToken`, `User.resetTokenExpiry`
- `20260509184609_001_tenancy_phase_a_add_account_restaurant_membership` — tabelas `Account`, `Restaurant`, `Membership`; enum `MembershipRole (OWNER/MANAGER/ATTENDANT/KITCHEN/CASHIER)`
- `20260509185500_002_tenancy_phase_a_restaurant_full_columns` — campos completos em `Restaurant`
- `20260510004000_004_tenancy_phase_e_drop_userid_columns` — remoção de FKs userId antigas
- `20260510005000_005_tenancy_phase_e_drop_user_table` — drop da tabela `User` legada

**Uso real:** Toda rota protegida usa `@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)`. JWT payload `{ accountId, activeRestaurantId, role }` é lido em 30+ services.

**Dependências:** `prisma` · `mail` (reset de senha) · `@nestjs/passport` · `bcrypt`

---

## A.2 — users / accounts

**Commit origem:** `434c198`, `def01af`, `e20b587`
**Status:** ATIVO

**Arquivos:**
```
src/users/
  users.controller.ts         POST /users (registro), GET/PATCH /users/me
  users.service.ts            criação de conta + upsert Restaurant + Membership OWNER
  users.module.ts
  users.controller.spec.ts
  users.service.spec.ts
  dto/create-user.dto.ts
  dto/update-me.dto.ts
```

**Migrations:**
- `20260502163254_init` — tabela `User` original (substituída pela Account/Restaurant nas migrations 001-005)
- `20260502194451_add_users_multi_tenant` — campos multi-tenant no User
- `20260503014940_add_user_whatsapp` — `User.whatsapp`
- `20260503024647_add_slug_user` — `User.slug` (unique, rota `/cardapio/:slug`)
- `20260503200523_add_opening_hours` — `User.openingHours` (JSON)
- `20260503204032_add_primary_color` — `User.primaryColor`
- `20260506032917_add_config_fields_to_user` — campos de config adicionais
- `001-005` (tenancy) — migração para `Account` + `Restaurant`

**Uso real:** Registro público (`POST /users`) + auto-login pós-registro. `PATCH /users/me` usado no painel de configurações.

**Dependências:** `prisma` · `mail` · `auth`

---

## A.3 — restaurants

**Commit origem:** `d7b7867`, `0cce093`, `001-002 tenancy`
**Status:** ATIVO

**Arquivos:**
```
src/restaurants/
  restaurants.controller.ts   GET /restaurants/me, PATCH /restaurants/me, GET /restaurants/me/fiado-summary
  restaurants.service.ts      leitura e atualização de configurações do restaurante
  restaurants.module.ts       imports: [FiadoModule]
```

**Migrations:**
- `20260509184609_001_tenancy_phase_a` — tabela `Restaurant`
- `20260509185500_002_tenancy_phase_a_restaurant_full_columns` — todos os campos (slug, nome, logo, banner, cores, taxas, etc.)

**Uso real:** `GET /restaurants/me` é chamado no load inicial do dashboard. `GET /restaurants/me/fiado-summary` adicionado em Etapa 5 (untracked).

**Dependências:** `prisma` · `fiado` (FiadoService injetado via FiadoModule para summary)

---

## A.4 — products / categories

**Commit origem:** `434c198` (products), `a27f1f0`, `def01af`, `4394002`
**Status:** ATIVO

**Arquivos:**
```
src/products/
  products.controller.ts      CRUD /products, GET /products/:id/availability
  products.service.ts         com schedule de disponibilidade por dia/hora
  products.module.ts
  products.controller.spec.ts
  products.service.spec.ts
  dto/create-product.dto.ts
  dto/update-product.dto.ts
  dto/paginate-products.dto.ts

src/categories/
  categories.controller.ts    CRUD /categories
  categories.service.ts
  categories.module.ts
  categories.controller.spec.ts
  categories.service.spec.ts
  dto/create-category.dto.ts
  dto/update-category.dto.ts
```

**Migrations:**
- `20260502163254_init` — `Product`
- `20260502180318_add_categories` — `Category`
- `20260503063544_add_imagem`, `20260503083331_add_imagem` — `Product.imagem`
- `20260504033145_add_product_fields` — campos de preço, estoque, disponibilidade
- `20260506175801_add_product_category_fields` — `displayOrder`, `destaque`, campos extras
- `20260511120000_008_add_product_availability` — `disponibilidadeAtiva`, `disponibilidadeInicio/Fim`, `disponibilidadeDias`
- `20260511130000_009_drop_product_disponibilidade_dias` — limpeza de coluna legada

**Uso real:** Cardápio público (`/public/cardapio/:slug`) e painel de gestão ativos. Disponibilidade por horário verificada por cron (`scheduler`).

**Dependências:** `prisma` · `options` · `complementos` · `production-sectors` · `promotions` (FK em OrderItem)

---

## A.5 — options / complementos

**Commit origem:** `a27f1f0`, `2d4d068`, `f274afb`
**Status:** ATIVO

**Arquivos:**
```
src/options/
  options.controller.ts       CRUD /option-groups, /option-groups/:id/options
  options.service.ts          gerencia OptionGroup e Option
  options.module.ts
  dto/create-option-group.dto.ts
  dto/create-option.dto.ts
  dto/update-option-group.dto.ts
  dto/update-option.dto.ts

src/complementos/
  complementos.controller.ts  GET/POST/DELETE /products/:id/complementos
  complementos.service.ts     tabela pivot ProductComplement (produto ↔ option group)
  complementos.module.ts
```

**Migrations:**
- `20260504034839_orders_coupons_options` — `OptionGroup`, `Option`
- `20260507000543_add_option_group_tipo_and_team_members` — `OptionGroup.tipo`, `OptionGroup.descricao`, `OptionGroup.ativo`
- `20260507013000_add_product_complements_options` — `ProductComplement` (pivot), `Option.descricao/imagem/estoque`
- `20260511090000_006_drop_optiongroup_productid` — remove `OptionGroup.productId` (foi substituído por ProductComplement)

**Uso real:** Cardápio público inclui option groups no retorno. Pedidos calculam preço final via `OptionPriceMode (SUM/HIGHEST)`.

**Dependências:** `prisma` · `products`

---

## A.6 — combos

**Commit origem:** `0cce093`, `5c193fa`
**Status:** ATIVO

**Arquivos:**
```
src/combos/
  combos.controller.ts        CRUD /combos
  combos.service.ts           combo de produtos com itens e preço calculado
  combos.module.ts
```

**Migrations:**
- `20260506215629_add_fase_b_tables_agenda_combos_campaigns_audit_tags` — tabela `Combo` (inferida; schema atual tem modelo Combo)

**Uso real:** Exibido no cardápio público. Adicionável ao pedido pelo cliente.

**Dependências:** `prisma` · `products`

---

## A.7 — public (cardápio público)

**Commit origem:** `bca9c6e`, `2d4d068`
**Status:** ATIVO

**Arquivos:**
```
src/public/
  public.controller.ts        GET /public/cardapio/:slug, GET /public/delivery-check
  public.service.ts           query multi-join: Restaurant + Categories + Products + Options + Combos
  public.module.ts
```

**Migrations:** Nenhuma própria — depende de todas as tabelas de catálogo.

**Uso real:** Principal endpoint de entrada do cliente final. Não requer autenticação. `delivery-check` valida se bairro está em zona ativa.

**Dependências:** `prisma` · `products` · `categories` · `options` · `complementos` · `combos` · `delivery-zones`

---

## A.8 — orders (pedidos)

**Commit origem:** `a27f1f0`, `2d4d068`, `ba1d8fc`, `d52f2a0`, `4189ec8`
**Status:** ATIVO

**Arquivos:**
```
src/orders/
  orders.controller.ts        POST /orders (público), POST /orders/manual, GET/PATCH /orders/:id/status, etc.
  orders.service.ts           criação, confirmação, status, mapeamento PaymentMethod→TabPaymentMethod
  orders.module.ts
  orders.gateway.ts           Socket.IO — emite 'new_order' e 'order_updated'
  asaas-payment.service.ts    PIX via Asaas (QR code + polling)
  dto/create-order.dto.ts
  dto/create-manual-order.dto.ts
  dto/update-order-status.dto.ts
  dto/list-orders-query.dto.ts
```

**Migrations:**
- `20260504034839_orders_coupons_options` — `Order`, `OrderItem`, `Coupon`, enums `PaymentMethod`, `OrderStatus`, `DeliveryType`
- `20260504190000_add_order_pix_fields` — `Order.pixQrCode`, `Order.pixPaymentId` etc.
- `20260505010000_add_tracking_fields` — `Order.externalChannel`, `Order.externalOrderId`
- `20260505221002_add_order_origin` — enum `OrderOrigin`, `Order.origin`
- `20260511213000_013_drop_order_inline_fields` — remove campos inline substituídos por Tab/Payment

**Uso real:** Pedidos WEBSITE chegam de `/public/cardapio/:slug`; pedidos MANUAL do painel admin. 41 registros no banco (todos `origin=WEBSITE` ou `MANUAL`).

**Dependências:** `prisma` · `tabs` (Order.tabId FK) · `customers` · `coupons` · `delivery-zones` · `Socket.IO` · `asaas-payment` (PIX)

---

## A.9 — tabs / payments (Etapa 5)

**Commit origem:** untracked (Etapa 5)
**Status:** ATIVO — UNTRACKED

**Arquivos:**
```
src/tabs/
  tabs.controller.ts          GET/POST /tabs, PATCH /tabs/:id/close, PATCH /tabs/:id/cancel, etc.
  tabs.service.ts             abertura de comanda, adição de itens, fechamento com validação de saldo
  tabs.module.ts
  payments/
    payments.controller.ts    POST /tabs/:id/payments, POST /tabs/:id/payments/:pid/confirm, DELETE
    payments.service.ts       criação de Payment, confirm() (DINHEIRO abre CashMovement, FIADO cria FiadoTransaction)
```

**Migrations:**
- `20260511160000_011_add_tab_payment` — tabelas `Tab`, `Payment`; enums `TabStatus`, `TabTipo`, `TabPaymentMethod`, `TabPaymentStatus`
- `20260511200000_012_drop_comanda` — drop da tabela `Comanda` legada (substituída por Tab)
- `20260511213000_013_drop_order_inline_fields` — remove campos de pagamento inline de `Order`
- `20260512020000_016_payment_tabid_optional` — `Payment.tabId` de `INT NOT NULL` → `INT?` (para pagamentos standalone de fiado)

**Uso real:** Núcleo do fluxo de caixa. `confirm()` de DINHEIRO verifica sessão de caixa aberta e cria `CashMovement PAYMENT_CASH`. `confirm()` de FIADO cria `FiadoTransaction DEBITO` e atualiza `Customer.fiadoTotal`.

**Dependências:** `prisma` · `cash-register` (CashRegisterSession obrigatória para DINHEIRO) · `fiado` (FiadoTransaction) · `customers` · `tables` (Tab.tableId) · `orders` (Order.tabId)

---

## A.10 — cash-register (Etapa 5)

**Commit origem:** untracked (Etapa 5)
**Status:** ATIVO — UNTRACKED

**Arquivos:**
```
src/cash-register/
  cash-register.module.ts
  sessions/
    cash-register-sessions.controller.ts   POST /cash-register/sessions (abrir), PATCH /sessions/:id/close, GET
    cash-register-sessions.service.ts      criação de sessão, fechamento com valorEsperado/contado/diferença
    dto/open-cash-register-session.dto.ts
    dto/close-cash-register-session.dto.ts
    dto/query-cash-register-sessions.dto.ts
  movements/
    cash-movements.controller.ts           POST /cash-register/movements (suprimento/sangria manual)
    cash-movements.service.ts              valida combos válidos (MANUAL_SUPRIMENTO/MANUAL_SANGRIA), cria CashMovement
    dto/create-cash-movement.dto.ts
```

**Migrations:**
- `20260512010000_015_add_cash_register_fiado` — `CashRegisterSession`, `CashMovement`; enums `CashRegisterSessionStatus`, `CashMovementType`, `CashMovementOrigin (PAYMENT_CASH/FIADO_QUITACAO/MANUAL_SUPRIMENTO/MANUAL_SANGRIA)`; `Payment.cashRegisterSessionId` FK

**Uso real:** `CashRegisterSession` é checada dentro de `$transaction` em `payments.service.ts` (confirm DINHEIRO). `CashMovement` criado automaticamente em confirmações DINHEIRO e quitações FIADO.

**Dependências:** `prisma` · `auth` (openedByAccountId, closedByAccountId) · `tabs/payments` (Payment.cashRegisterSessionId)

---

## A.11 — fiado (Etapa 5)

**Commit origem:** untracked (Etapa 5)
**Status:** ATIVO — UNTRACKED

**Arquivos:**
```
src/fiado/
  fiado.controller.ts         GET /customers/:id/fiado, PATCH /customers/:id/fiado-limite,
                              GET /customers/:id/fiado-transactions, POST /customers/:id/fiado-payments
  fiado.service.ts            getFiado, updateFiadoLimite (OWNER/MANAGER only), getFiadoTransactions,
                              createFiadoPayment (valida valor ≤ fiadoTotal, cria Payment standalone,
                              FiadoTransaction CREDITO, CashMovement FIADO_QUITACAO se DINHEIRO),
                              getFiadoSummary (para /restaurants/me/fiado-summary)
  fiado.module.ts             exports: [FiadoService]
  dto/
    create-fiado-payment.dto.ts   métodos permitidos: DINHEIRO, PIX, CARTAO_DEBITO, CARTAO_CREDITO
    query-fiado-transactions.dto.ts
    update-fiado-limite.dto.ts
```

**Migrations:**
- `20260512010000_015_add_cash_register_fiado` — `FiadoTransaction`; `Customer.fiadoTotal`, `Customer.fiadoLimite` (Decimal)
- `20260512020000_016_payment_tabid_optional` — `Payment.tabId` nullable (para pagamentos de quitação sem Tab)

**Uso real:** `FiadoService` injetado em `RestaurantsController` (via FiadoModule) para o endpoint de summary. `FiadoController` registrado em `app.module.ts` (FiadoModule importado).

**Dependências:** `prisma` · `customers` (Customer.fiadoTotal/fiadoLimite) · `cash-register` (CashRegisterSession para quitação DINHEIRO) · `tabs` (Payment standalone com tabId=null) · `audit`

---

## A.12 — tables (mesas)

**Commit origem:** `0cce093`, `5c193fa`
**Status:** ATIVO

**Arquivos:**
```
src/tables/
  tables.controller.ts        CRUD /tables, PATCH /tables/:id/status
  tables.service.ts           gestão de mesas com status LIVRE/OCUPADA/RESERVADA, geração de qrCode
  tables.module.ts
```

**Migrations:**
- `20260506215629_add_fase_b_tables_agenda_combos_campaigns_audit_tags` — tabela `Table` (numero, nome, capacidade, ativa, qrCode)

**Uso real:** CRUD de mesas ativo. `Tab.tableId` FK aponta para `Table`. QR code gerado mas o fluxo "cliente escaneia → pedido" depende de `customer-auth` (ver B.10).

**Dependências:** `prisma` · `tabs` (Tab.tableId FK)

---

## A.13 — team (equipe)

**Commit origem:** `d52f2a0`
**Status:** ATIVO

**Arquivos:**
```
src/team/
  team.controller.ts          GET /team, POST /team/invite, PATCH /team/:id, DELETE /team/:id
  team.service.ts             convites por e-mail, gestão de Membership (roles), remoção de membro
  team.module.ts
```

**Migrations:**
- `20260507000543_add_option_group_tipo_and_team_members` — tabela `TeamMember` / `Membership` (role, ativo, lastLoginAt)
- `20260509184609_001_tenancy_phase_a` — `Membership` unificada com Account/Restaurant

**Uso real:** Painel de equipe ativo. Roles `OWNER/MANAGER/CASHIER/WAITER/KITCHEN` checados em guards (e.g., `fiado.service.ts` verifica OWNER/MANAGER para alterar limite).

**Dependências:** `prisma` · `auth` (Membership é lida pelo JwtStrategy)

---

## A.14 — delivery-zones + delivery-check

**Commit origem:** `d52f2a0`, `4189ec8`
**Status:** ATIVO (BAIRRO_LIST) / BLOQUEADO (RADIUS)

**Arquivos:**
```
src/delivery-zones/
  delivery-zones.controller.ts    CRUD /delivery-zones
  delivery-zones.service.ts       create/update/remove com validação por tipo;
                                  RADIUS lança 400 (TODO #1 — aguarda Google Geocoding)
  delivery-zones.module.ts
  delivery-check.service.ts       verifica se bairro do pedido cobre zona ativa (usado por public.service)
  dto/create-delivery-zone.dto.ts
  dto/update-delivery-zone.dto.ts
  utils/normalize-bairro.util.ts  lowercase + trim + remove acentos
```

**Migrations:**
- `20260511220000_014_add_delivery_marketplace` — tabela `DeliveryZone`; enum `ZoneType (BAIRRO_LIST/RADIUS)`; `Restaurant.cep/lat/lng`

**Uso real:** Zonas por BAIRRO_LIST funcionam em produção. `delivery-check.service.ts` chamado em `public.service.ts` para validar endereço no cardápio público. Após fix `4189ec8`, `tipo=RADIUS` lança `400` com mensagem clara.

**Dependências:** `prisma` · `audit` · `geocoding` (quando RADIUS for habilitado) · `public` (delivery-check)

---

## A.15 — audit

**Commit origem:** `0cce093`, `ba1d8fc`
**Status:** ATIVO

**Arquivos:**
```
src/audit/
  audit.controller.ts     GET /audit (listagem paginada de logs)
  audit.service.ts        log(restaurantId, action, entity, entityId, data, accountId)
  audit.module.ts
```

**Migrations:**
- `20260506215629_add_fase_b_tables_agenda_combos_campaigns_audit_tags` — tabela `AuditLog` (action, entity, entityId, data JSON, accountId, restaurantId, createdAt)

**Uso real:** Chamado por `delivery-zones`, `products`, `orders`, `fiado`, `cash-register`. Actions logadas: `DELIVERY_ZONE_CREATE/UPDATE/DELETE`, `PRODUCT_UPDATE`, `FIADO_PAYMENT`, `FIADO_LIMITE_UPDATE`, `CASH_REGISTER_OPEN/CLOSE`, etc.

**Dependências:** `prisma`

---

## A.16 — production-sectors (setores de produção)

**Commit origem:** `d52f2a0`
**Status:** ATIVO

**Arquivos:**
```
src/production-sectors/
  production-sectors.controller.ts    CRUD /production-sectors
  production-sectors.service.ts       setores com cor e ordem; nome único por restaurante
  production-sectors.module.ts
```

**Migrations:**
- `20260511110000_007_add_production_sector` — tabela `ProductionSector`; `Product.productionSectorId` FK

**Uso real:** CRUD ativo. Produtos podem ser associados a um setor (cozinha, bar). Sem lógica de roteamento automático implementada — roteamento manual por setor no frontend.

**Dependências:** `prisma` · `products`

---

## A.17 — prisma + mail (infraestrutura)

**Commit origem:** `434c198`, `e20b587`, `2d4d068`
**Status:** ATIVO

**Arquivos:**
```
src/prisma/
  prisma.service.ts       PrismaService extends PrismaClient (singleton, global)
  prisma.module.ts        @Global() — injetável sem import explícito
  prisma.service.spec.ts

src/mail/
  mail.service.ts         sendResetPassword (SMTP via nodemailer) + sendNewOrderNotification
  mail.module.ts
```

**Migrations:** schema.prisma evoluiu ao longo de 46 migrations (init → 016_payment_tabid_optional).

**Uso real:** `PrismaService` injetado em todos os serviços. `MailService.sendResetPassword` chamado por `auth.service.ts`. `sendNewOrderNotification` chamado por `orders.service.ts`.

**Dependências:** `@prisma/client` · `nodemailer` · `SMTP_*` envs (opcional; sem SMTP_HOST, mail é no-op)

---

---

# B — ÚTIL futuro

---

## B.1 — marketplace-connectors / marketplace-integrations

**Commit origem:** `2d4d068`, `d52f2a0`
**Status:** SKELETON (registry vazio) + PARCIAL (CRUD de integração funcional)

**Arquivos:**
```
src/marketplace-connectors/
  marketplace-connector.registry.ts      Map<string, IMarketplaceConnector> vazio — nenhum connector registrado
  marketplace-connectors.module.ts
  interfaces/marketplace-connector.interface.ts   interface com métodos fetchOrders(), acknowledgeOrder()

src/marketplace-integrations/
  marketplace-integrations.controller.ts  CRUD /marketplace-integrations
  marketplace-integrations.service.ts     cria/atualiza/deleta integração; usa EncryptionService para credenciais
  marketplace-integrations.module.ts
  dto/create-marketplace-integration.dto.ts
  dto/update-marketplace-integration.dto.ts
```

**Migrations:**
- `20260511220000_014_add_delivery_marketplace` — tabela `MarketplaceIntegration`; enum `MarketplaceProvider (IFOOD/NINETYNINEFOOD/KEETA)`

**Uso real:** 0 integrações ativas em nenhum restaurante. Endpoints de CRUD funcionam mas sem processamento de pedidos externos. `MarketplaceConnectorRegistry` registra connectors dinamicamente — atualmente vazio.

**Depende de:** `prisma` · `encryption` · `MARKETPLACE_ENCRYPTION_KEY` env

---

## B.2 — scheduler (cron jobs)

**Commit origem:** `2d4d068`, `4394002`
**Status:** PARCIAL — cron ativo, canal de notificação ausente

**Arquivos:**
```
src/scheduler/
  scheduler.service.ts    @Cron jobs: checkProductAvailability (muda status de produtos por horário),
                          sendCartAbandonmentNotifications (busca pedidos pendentes > X min)
  scheduler.module.ts     imports: [@nestjs/schedule]
```

**Migrations:** Nenhuma própria.

**Uso real:** `checkProductAvailability` roda e atualiza `Product.disponivel` baseado em horário. `sendCartAbandonmentNotifications` busca pedidos mas notificação é no-op (sem canal de envio).

**Depende de:** `prisma` · `@nestjs/schedule` · `loyalty` (integrado ao cron para processar expiração de pontos)

---

## B.3 — agenda (agendamentos)

**Commit origem:** `0cce093`
**Status:** ATIVO (CRUD completo, sem trigger automático)

**Arquivos:**
```
src/agenda/
  agenda.controller.ts    CRUD /agenda
  agenda.service.ts       agendamentos de pedido/reserva/encomenda com status lifecycle
  agenda.module.ts
```

**Migrations:**
- `20260506215629_add_fase_b` — tabela `Agendamento`; enums `AgendamentoTipo (PEDIDO/RESERVA/ENCOMENDA)`, `AgendamentoStatus (PENDENTE/CONFIRMADO/CANCELADO/CONCLUIDO)`

**Uso real:** CRUD funcional. Sem integração com cron para auto-confirmar/cancelar por prazo.

**Depende de:** `prisma`

---

## B.4 — geocoding

**Commit origem:** `d52f2a0`
**Status:** PARCIAL — BrasilAPI retorna coords vazias para maioria dos CEPs

**Arquivos:**
```
src/geocoding/
  geocoding.service.ts      consulta BrasilAPI v2 por CEP, retorna lat/lng
  geocoding.module.ts
  interfaces/...
  providers/...             abstração de provider (BrasilAPI implementado)
```

**Migrations:** Nenhuma própria. `Restaurant.cep/lat/lng` adicionados em `014_add_delivery_marketplace`.

**Uso real:** Chamado implicitamente por `delivery-zones` quando tipo=RADIUS — mas RADIUS está bloqueado (TODO #1). BrasilAPI retorna coordenadas nulas para a maioria dos CEPs brasileiros na prática.

**Depende de:** `delivery-zones` · fetch (BrasilAPI)
**Bloqueia:** RADIUS zones até Google Geocoding API ser integrado

---

## B.5 — delivery-attempts (rastreamento de entregas)

**Commit origem:** `d52f2a0`
**Status:** ATIVO (CRUD completo, sem app de entregador)

**Arquivos:**
```
src/delivery-attempts/
  delivery-attempts.controller.ts    CRUD /delivery-attempts
  delivery-attempts.service.ts       lifecycle de tentativas (PENDING→IN_TRANSIT→DELIVERED/FAILED/CANCELED)
  delivery-attempts.module.ts
  dto/...
```

**Migrations:**
- `20260511220000_014_add_delivery_marketplace` — tabela `DeliveryAttempt`; enum `DeliveryAttemptStatus`; `DeliveryAttempt.orderId`, `DeliveryAttempt.tabId`

**Uso real:** Endpoints funcionais para criar e atualizar tentativas. Sem integração com app mobile de entregador.

**Depende de:** `prisma` · `orders` · `tabs`

---

## B.6 — reports (relatórios)

**Commit origem:** `2d4d068`, `7bfb0ac`
**Status:** ATIVO

**Arquivos:**
```
src/reports/
  reports.controller.ts   GET /reports/orders (por período, com filtros), GET /reports/export (CSV)
  reports.service.ts      agregações de pedidos, receita, produtos mais vendidos
  reports.module.ts
```

**Migrations:** Nenhuma própria — lê dados de Order, OrderItem, Customer.

**Uso real:** Painel de relatórios ativo. Exportação CSV funcional.

**Depende de:** `prisma`

---

## B.7 — campaigns (campanhas de marketing)

**Commit origem:** `0cce093`
**Status:** ATIVO (CRUD) / PARCIAL (sem canal de envio)

**Arquivos:**
```
src/campaigns/
  campaigns.controller.ts   CRUD /campaigns
  campaigns.service.ts      criação de campanhas CUPOM/LINK/RETORNO com status lifecycle
  campaigns.module.ts
```

**Migrations:**
- `20260506215629_add_fase_b` — tabela `Campaign`; enums `CampaignTipo (CUPOM/LINK/RETORNO)`, `CampaignStatus (RASCUNHO/ATIVA/PAUSADA/ENCERRADA)`

**Uso real:** CRUD funcional. Sem disparo por WhatsApp/e-mail.

**Depende de:** `prisma`

---

## B.8 — promotions (promoções por agenda)

**Commit origem:** `d52f2a0`
**Status:** ATIVO — aplicação em OrderItem funcional

**Arquivos:**
```
src/promotions/
  promotions.controller.ts  CRUD /promotions
  promotions.service.ts     cria/atualiza promoções; nome único por restaurante; conflito detectado
  promotions.module.ts
```

**Migrations:**
- `20260511140000_010_add_promotional_schedule` — tabela `PromotionalSchedule`; enum `PromoDiscountType (PERCENTUAL/VALOR_FIXO/PRECO_FIXO)`; `OrderItem.appliedPromotionId` FK, `OrderItem.precoOriginal`

**Uso real:** CRUD funcional. `orders.service.ts` aplica promoção ativa no cálculo do item se `ProductionSector` estiver em período de promoção. `OrderItem.appliedPromotionId` registra qual promoção foi aplicada.

**Depende de:** `prisma` · `orders` (OrderItem FK)

---

## B.9 — upload / S3

**Commit origem:** `2d4d068`
**Status:** ATIVO em dev / PARCIAL em produção (requer AWS envs)

**Arquivos:**
```
src/upload/
  upload.controller.ts    POST /upload (multipart/form-data)
  upload.service.ts       multer local em dev; S3 PutObject em produção se AWS_* envs presentes
  upload.module.ts
```

**Migrations:** Nenhuma própria. `Product.imagem`, `Restaurant.logo/banner` são URLs de string.

**Uso real:** Upload de imagens de produto e logo funcionando em dev (salva em `./uploads/`). Em produção, requer `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`.

**Dependências:** `multer` · `@aws-sdk/client-s3`
**Atenção:** `@aws-sdk/lib-storage` está em `package.json` mas não é importado — dep desnecessária (ver D notes)

---

## B.10 — customer-auth (PIN de cliente)

**Commit origem:** `2d4d068`
**Status:** PARCIAL — PIN gerado, nunca entregue ao cliente

**Arquivos:**
```
src/customer-auth/
  customer-auth.controller.ts   POST /customer-auth/request-pin, POST /customer-auth/verify-pin
  customer-auth.service.ts      requestPin() — gera hash de PIN 4 dígitos, upsert CustomerAuth;
                                verifyPin() — compara bcrypt, emite JWT 30d com role=CUSTOMER;
                                getMe(), getOrders()
  customer-auth.module.ts
  customer.guard.ts             guard para rotas de cliente autenticado (role=CUSTOMER no JWT)
```

**Migrations:**
- `20260506195259_add_loyalty_nps_customer_auth` — tabela `CustomerAuth` (customerId, phone, restaurantId, pin hash, pinExpiry)

**Uso real:** Após fix de segurança (`c56c62c`), o PIN é gerado, salvo em `CustomerAuth.pin` como bcrypt hash, e `{ sent: true }` é retornado. **O PIN nunca é entregue ao cliente** — sem SMTP real ou SMS integrado. Feature inoperante em produção.

**Histórico de segurança:** Antes de `c56c62c`, o PIN era logado em plaintext via `console.log`. Commando `2d4d068` (produção) introduziu o vazamento. Fix aplicado em `c56c62c`.

**Depende de:** `prisma` · `jwt` · `mail` (TODO: entregar PIN via MailService/SMS)
**Bloqueia:** Fluxo completo de QR mesa (cliente escaneia → autentica → pede)

---

## B.11 — tracking / Meta Conversion API

**Commit origem:** `d52f2a0`
**Status:** PARCIAL — endpoint ativo, sem validação de token

**Arquivos:**
```
src/tracking/
  tracking.controller.ts      POST /tracking/meta/event
  tracking.module.ts
  meta-conversion.service.ts  envia eventos para Meta Conversions API (ViewContent, AddToCart, Purchase)
```

**Migrations:**
- `20260505010000_add_tracking_fields` — `Order.externalChannel`, `Order.externalOrderId`

**Uso real:** Endpoint ativo. Sem verificação de token de acesso do Meta — qualquer payload é aceito. `Purchase` event enviado quando pedido é confirmado.

**Depende de:** fetch (Meta API) · `META_ACCESS_TOKEN`, `META_PIXEL_ID` envs

---

## B.12 — encryption

**Commit origem:** `d52f2a0`
**Status:** ATIVO (mas requer env obrigatória no boot)

**Arquivos:**
```
src/encryption/
  encryption.service.ts   AES-256-GCM encrypt/decrypt; lança erro no boot se MARKETPLACE_ENCRYPTION_KEY ausente
  encryption.module.ts
```

**Migrations:** Nenhuma própria.

**Uso real:** Usado exclusivamente por `marketplace-integrations.service.ts` para criptografar credenciais de API do iFood/Rappi antes de salvar no banco.

**Depende de:** `node:crypto` · `MARKETPLACE_ENCRYPTION_KEY` env (64 hex chars)
**Atenção:** Se `MARKETPLACE_ENCRYPTION_KEY` não estiver no `.env`, o backend não sobe. Crítico para deploy.

---

---

# C — NÃO-RELACIONADO

---

## C.1 — loyalty (programa de fidelidade)

**Commit origem:** `2d4d068`, `7bfb0ac`
**Status:** ATIVO

**Arquivos:**
```
src/loyalty/
  loyalty.controller.ts   GET /loyalty/points/:customerId, POST /loyalty/redeem, GET /loyalty/transactions
  loyalty.service.ts      acúmulo de pontos por compra (loyaltyPointsPerBrl), resgate (loyaltyRedeemRate),
                          histórico de LoyaltyTransaction
  loyalty.module.ts
```

**Migrations:**
- `20260506195259_add_loyalty_nps_customer_auth` — tabelas `LoyaltyPoints`, `LoyaltyTransaction`; `Order.loyaltyPointsEarned/Used`; `User/Restaurant.loyaltyEnabled`, `loyaltyPointsPerBrl`, `loyaltyRedeemRate`

**Uso real:** Endpoints funcionais. `LoyaltyPoints` é lido em `customer-auth.service.ts/getMe()`. `scheduler.service.ts` processa expiração de pontos.

**Por que C:** Feature voltada ao cliente final (B2C), não ao operador. Adiciona 3 tabelas e lógica no fluxo de pedidos. Baixa prioridade para gestão de restaurante.

**Depende de:** `prisma` · `customers` · `orders` · `scheduler`

---

## C.2 — nps (avaliações NPS)

**Commit origem:** `2d4d068`, `7bfb0ac`
**Status:** ATIVO

**Arquivos:**
```
src/nps/
  nps.controller.ts   POST /nps/response, GET /nps/responses, PATCH /nps/responses/:id/reply
  nps.service.ts      armazenamento de NpsResponse com score/comment; resposta do restaurante
  nps.module.ts
```

**Migrations:**
- `20260506195259_add_loyalty_nps_customer_auth` — tabela `NpsResponse` (score, comment, orderId, customerId); `Order.npsRequested`; `Restaurant.npsEnabled`, `npsDaysAfterOrder`
- `20260506213805_add_nps_reply` — `NpsResponse.reply`, `NpsResponse.repliedAt`

**Uso real:** Endpoints funcionais. Sem trigger automático de envio de pesquisa ao cliente (depende de e-mail/WhatsApp).

**Por que C:** Feature de coleta de feedback B2C. Não impacta operação de caixa/pedidos.

**Depende de:** `prisma` · `customers` · `orders`

---

## C.3 — customers (perfil de cliente)

**Commit origem:** `a27f1f0`, `2d4d068`, `5c193fa`
**Status:** ATIVO — **não pode ser removido** (FK crítica)

**Arquivos:**
```
src/customers/
  customers.controller.ts   GET /customers, GET /customers/:id, PATCH /customers/:id, DELETE /customers/:id
  customers.service.ts      CRUD de Customer; busca por telefone/nome; tags
  customers.module.ts
```

**Migrations:**
- `20260504200000_add_customers` — tabela `Customer` (name, phone, document, lastOrderAt)
- `20260506195259_add_loyalty_nps_customer_auth` — `Customer.tags[]`, campos de loyalty
- Etapa 5 (migration 015) — `Customer.fiadoTotal`, `Customer.fiadoLimite`

**Uso real:** `Customer` é FK em `Order.customerId`, `Tab.customerId`, `FiadoTransaction.customerId`, `LoyaltyPoints.customerId`, `NpsResponse.customerId`. **Não é removível** sem migration abrangente.

**Classificação mista:** `Customer.fiadoTotal` e `Customer.fiadoLimite` são ESSENCIAIS (Etapa 5). O restante (tags, loyalty fields) é C.

**Depende de:** `prisma` · `loyalty` (implícito) · `fiado` (fiadoTotal/Limite)

---

## C.4 — billing (assinatura do restaurante no SaaS)

**Commit origem:** `2d4d068`, `da453c5`
**Status:** PARCIAL — integração Asaas funcional, webhook sem validação completa

**Arquivos:**
```
src/billing/
  billing.controller.ts           POST /billing/subscribe, POST /billing/webhook, GET /billing/status
  billing.service.ts              cria assinatura no Asaas, atualiza SubscriptionStatus
  billing.service.spec.ts
  asaas-billing.service.ts        HTTP client para Asaas API (criação de customer + subscription)
  billing.module.ts
  dto/create-subscription.dto.ts
```

**Migrations:**
- `20260504170000_add_subscription_status_enum` — enum `SubscriptionStatus (TRIAL/ACTIVE/OVERDUE/CANCELED)`; `Account.subscriptionStatus`
- `20260504183000_add_asaas_billing_fields` — `Account.asaasCustomerId`, `Account.asaasSubscriptionId`

**Uso real:** Endpoints funcionais. Webhook do Asaas recebido mas token de validação não verificado (risco de spoofing). Restaurantes em `TRIAL` por padrão — sem enforcement de bloqueio por overdue.

**Por que C:** Feature da *plataforma SaaS* (Cardápio SaaS cobrando restaurante), não do produto de gestão do restaurante. Relevante somente em modo comercial com múltiplos clientes pagantes.

**Depende de:** `prisma` · `@nestjs/config` (para ASAAS_API_KEY) · `ASAAS_API_KEY`, `ASAAS_BASE_URL`, `ASAAS_WEBHOOK_TOKEN` envs

---

## C.5 — admin (administração da plataforma)

**Commit origem:** `6ccf91f`
**Status:** ATIVO

**Arquivos:**
```
src/admin/
  admin.controller.ts   GET /admin/restaurants, GET /admin/accounts, POST /admin/impersonate/:id
  admin.service.ts      queries cross-tenant sem filtro de restaurantId
  admin.module.ts
  admin.guard.ts        verifica Account.isPlatformAdmin === true
```

**Migrations:**
- `20260504143000_add_admin_user_fields` — `Account.isPlatformAdmin` (boolean)

**Uso real:** Acessível apenas com `isPlatformAdmin=true`. Usado para suporte/debug de restaurantes em produção.

**Por que C:** Feature de operação da plataforma multi-tenant. Não usado por nenhum restaurante.

**Depende de:** `prisma` · `admin.guard` · `auth`

---

---

# D — CONTRADIZ escopo

---

## D.1 — OrderSource enum (redundância com OrderOrigin)

**Localização:** `prisma/schema.prisma` — `enum OrderSource { OWN IFOOD NINETYNINEFOOD KEETA }`
**Migration origem:** `20260511220000_014_add_delivery_marketplace`
**Uso real:** `Order.source DEFAULT 'OWN'` — 100% dos 41 registros no banco são `OWN`. Nunca setado para outro valor em código.

**Problema:**
- Duplica informação de `OrderOrigin` (WEBSITE/MANUAL/IFOOD/RAPPI_99/UBER_EATS)
- `NINETYNINEFOOD` e `KEETA` não têm correspondente em `OrderOrigin` — inconsistência de nomenclatura
- Se `OrderOrigin.RAPPI_99` for usado no futuro, qual `OrderSource` recebe? NINETYNINEFOOD? Não há mapeamento definido

**Ação recomendada:** Deprecar `OrderSource`; derivar fonte de `OrderOrigin`. Requer migration de remoção de coluna.

---

## D.2 — TabPaymentMethod.VOUCHER_REFEICAO e CORTESIA

**Localização:** `prisma/schema.prisma` — `enum TabPaymentMethod`
**Migration origem:** `20260511160000_011_add_tab_payment`
**Uso real:** 0 usos em código. Nenhum DTO aceita esses valores. 0 registros no banco.

**Problema:**
- `VOUCHER_REFEICAO`: requer integração com processadora de vale-refeição (Alelo, VR, Ticket) — não planejada, sem endpoint de processamento
- `CORTESIA`: requer fluxo de autorização específico (quem pode dar cortesia, qual limite) — sem definição e sem DTO
- Presença no enum cria falsa impressão de suporte; qualquer chamada com esses valores passaria validação de tipo mas não teria lógica

**Ação recomendada:** Remover do enum até fluxo ser definido. Requer migration de alteração de tipo.

---

## D.3 — OrderOrigin.RAPPI_99 e UBER_EATS

**Localização:** `prisma/schema.prisma` — `enum OrderOrigin`
**Migration origem:** `20260505221002_add_order_origin`
**Uso real:** 0 usos em código (nenhuma rota cria pedido com essas origens). 0 registros no banco.

**Problema:**
- `RAPPI_99`: nenhum connector existe (ver B.1 — `MarketplaceConnectorRegistry` vazio, somente iFood está na `MarketplaceProvider`)
- `UBER_EATS`: idem — sem stub, sem parceria, sem contrato
- Diferente de `IFOOD` (que tem connector stub em B.1), RAPPI e Uber Eats não têm nenhuma infraestrutura preparada

**Ação recomendada:** Remover do enum até connector ser iniciado. Requer migration.

---

## D.4 — OrderOrigin.WHATSAPP_BOT como origem ativa (sem bot)

**Localização:** `prisma/schema.prisma`, `orders.service.ts` (aceito em CreateOrderDto)
**Migration origem:** `20260505221002_add_order_origin`
**Uso real:** 0 registros no banco. DTO aceita o valor mas nenhuma rota externa envia pedidos via bot.

**Problema:**
- Listado como origem válida de pedidos, mas nenhuma integração de bot existe
- Qualquer pedido criado com `origin=WHATSAPP_BOT` seria inserido manualmente, contradizendo a semântica de "bot"
- Diferente dos outros valores de D, este tem alguma justificativa (planejamento futuro) — mas sem canal, é enganoso

**Ação recomendada:** Documentar como placeholder de B (integração futura) ou bloquear no DTO até integração real. Se bloqueado, adicionar TODO explícito.

---

---

# Resumo executivo

## Distribuição por bucket

| Bucket | Módulos | Tabelas DB | Migrations |
|--------|---------|-----------|-----------|
| A — ESSENCIAL | 17 | ~25 (Order, Tab, Payment, CashRegisterSession, CashMovement, FiadoTransaction, Product, Category, Option, OptionGroup, ProductComplement, Combo, Table, DeliveryZone, ProductionSector, PromotionalSchedule, AuditLog, Account, Restaurant, Membership, Agendamento...) | 32 de 46 |
| B — ÚTIL futuro | 12 | MarketplaceIntegration, DeliveryAttempt, CustomerAuth, Campaign | 6 de 46 |
| C — NÃO-RELACIONADO | 5 | LoyaltyPoints, LoyaltyTransaction, NpsResponse, Customer (parcial) | 5 de 46 |
| D — CONTRADIZ | 4 itens de enum | — | 3 de 46 (enums embutidos em migrations maiores) |

## Código untracked (Etapa 5 — commitar urgente)

Os módulos **A.9 (tabs/payments)**, **A.10 (cash-register)** e **A.11 (fiado)** são ESSENCIAIS e estão untracked. As migrations 015 e 016 estão commitadas, mas o código TypeScript não está.

## Top 3 riscos imediatos

1. **`encryption.module.ts` trava boot** se `MARKETPLACE_ENCRYPTION_KEY` não estiver no `.env` de produção
2. **`customer-auth` inoperante** — PIN nunca entregue ao cliente; sem MailService/SMS integrado
3. **Código Etapa 5 untracked** — caixa, tabs, fiado em produção sem histórico no git

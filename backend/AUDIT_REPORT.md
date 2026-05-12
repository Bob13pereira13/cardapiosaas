# AUDIT REPORT — Cardápio SaaS Backend
**Data:** 2026-05-12  
**Baseline:** build PASS | 14/14 tests | 68 lint errors | 13.621 linhas em src/

---

## 1. Top 20 maiores arquivos

| Arquivo | Linhas |
|---|---|
| `src/orders/orders.service.ts` | 1083 |
| `src/tabs/payments/payments.service.ts` | 418 |
| `src/users/users.service.ts` | 407 |
| `src/tabs/tabs.service.ts` | 347 |
| `src/reports/reports.service.ts` | 280 |
| `src/public/public.service.ts` | 275 |
| `src/products/products.service.ts` | 262 |
| `src/fiado/fiado.service.ts` | 257 |
| `src/delivery-attempts/delivery-attempts.service.ts` | 248 |
| `src/billing/billing.service.ts` | 248 |
| `src/cash-register/sessions/cash-register-sessions.service.ts` | 239 |
| `src/loyalty/loyalty.service.ts` | 238 |
| `src/delivery-zones/delivery-zones.service.ts` | 232 |
| `src/complementos/complementos.service.ts` | 231 |
| `src/admin/admin.service.ts` | 226 |
| `src/scheduler/scheduler.service.ts` | 224 |
| `src/restaurants/restaurants.service.ts` | 188 |
| `src/auth/auth.service.ts` | 180 |
| `src/customers/customers.service.ts` | 169 |
| `src/team/team.service.ts` | 159 |

**Total src/:** 13.621 linhas em arquivos .ts

---

## 2. Imports/exports não usados

ESLint reporta 68 erros totais (baseline). A análise abaixo é por inspeção direta:

### Depcheck — pacotes npm

| Pacote | Tipo | Status | Evidência |
|---|---|---|---|
| `@aws-sdk/lib-storage` | dependency | **UNUSED** | Código usa `@aws-sdk/client-s3` (não `lib-storage`) |
| `@nestjs/config` | dependency | **UNUSED** | Zero imports de `ConfigModule` ou `ConfigService` em src/ |
| `@eslint/eslintrc` | devDependency | provavelmente unused | Não encontrado em configs |
| `@nestjs/schematics` | devDependency | MANTER | Usado pelo CLI `nest generate` |
| `@types/jest` | devDependency | MANTER | Implícito nos test files |
| `source-map-support` | devDependency | MANTER | Pode ser referenciado por tsconfig/jest config |
| `ts-loader` | devDependency | suspeito | Webpack? nest usa swc/tsc |
| `tsconfig-paths` | devDependency | MANTER | Usado por jest para resolver paths |

**Pacotes missing (falso positivo depcheck):**
- `dotenv`, `express`, `multer` → presentes via peer/transitive deps, não precisam estar em package.json diretamente

**Candidatos seguros pra remover:** `@aws-sdk/lib-storage`, `@nestjs/config`  
**Suspeito pra investigar:** `ts-loader` (verificar webpack.config se existir)

---

## 3. Console.log e debug artifacts

| Arquivo | Linha | Conteúdo | Avaliação |
|---|---|---|---|
| `src/customer-auth/customer-auth.service.ts` | 42 | `console.log('[CustomerAuth] PIN ${pin} para ${phone}')` | **REMOVER** — expõe PIN em plaintext no log |
| `src/customer-auth/customer-auth.service.ts` | 44 | `console.log(...)` | **REMOVER** — mesmo bloco |
| `src/encryption/encryption.service.ts` | 17 | Texto dentro de string de erro contém "console.log(...)" | **FALSO POSITIVO** — é uma string de mensagem de erro, não chamada |
| `src/mail/mail.service.ts` | 46 | `console.log('[MAIL DEV] Para: ${to}...')` | **MANTER** — fallback intencional quando SMTP não configurado em dev |

**Ação recomendada:** remover apenas as 2 linhas em `customer-auth.service.ts` (risco de segurança — PIN em log).

---

## 4. TODOs categorizados

| Arquivo | Linha | Conteúdo | Categoria |
|---|---|---|---|
| `src/auth/auth.service.ts` | 57 | `// TODO: auto-select only when memberships.length === 1` | **STALE** — comportamento já implementado; código já faz auto-select quando length===1 |
| `src/delivery-zones/delivery-zones.service.ts` | 230 | `// TODO: hard delete quando Order.deliveryZoneId Int? for adicionado` | **RELEVANTE** — coluna ainda não existe, aguarda Etapa B+ |
| `src/orders/orders.service.ts` | 592 | `// TODO: persist pixQrCode/pixCopyPaste in Payment via additive migration` | **RELEVANTE** — feature de re-display Pix QR code planejada |

**Race conditions documentadas (NÃO são bloat):**
- `CashRegisterSession.open()` — two simultaneous POSTs → future: unique partial index
- `Payment FIADO` — concurrent over-limit → future: SELECT FOR UPDATE
- `FiadoTransaction` concorrência

**Ação recomendada:** remover apenas o TODO stale em `auth.service.ts:57`.

---

## 5. Dependencies npm não usadas

Ver seção 2 acima.

**Candidatos confirmados para remoção:**
1. `@aws-sdk/lib-storage` — código importa `@aws-sdk/client-s3` diretamente
2. `@nestjs/config` — zero referências em src/

---

## 6. Enum values — uso em código

### TabPaymentMethod (enum Prisma)

| Valor | Refs no código | Refs via string | Banco (COUNT) | Avaliação |
|---|---|---|---|---|
| `DINHEIRO` | 4 | + múltiplos `'DINHEIRO'` | 4 | ATIVO |
| `PIX` | 3 | + múltiplos `'PIX'` | 2 | ATIVO |
| `CARTAO_DEBITO` | 2 | 0 | 0 | ESQUELETO — sem fluxo completo |
| `CARTAO_CREDITO` | 2 | 0 | 0 | ESQUELETO — sem fluxo completo |
| `FIADO` | 0 (só string `'FIADO'`) | múltiplos | 0 | ATIVO (usado via string literal) |
| `VOUCHER_REFEICAO` | **0** | **0** | **0** | **MORTO** — sem fluxo, sem uso |
| `CORTESIA` | **0** | **0** | **0** | **MORTO** — sem fluxo, sem uso |

**Nota:** `CARTAO_DEBITO` e `CARTAO_CREDITO` aparecem 2x cada apenas nos DTOs de `CreateFiadoPaymentDto` (lista de métodos permitidos). Sem endpoint real que faça algo específico por tipo de cartão.

**Perguntas ao supervisor:**
- `VOUCHER_REFEICAO` (VR/VA): tem plano de implementar fluxo? Se não, remover.
- `CORTESIA`: existe algum fluxo (desconto 100% na Tab)? Se não, remover.
- `CARTAO_DEBITO` vs `CARTAO_CREDITO`: terminal físico vai distinguir? Ou coletar como `CARTAO` genérico?

### PaymentMethod (enum legado — ordersService público)

Enum schema: `PIX, CREDIT_CARD, DEBIT_CARD, CASH, ONLINE_PIX, ONLINE_CARD`

| Valor | Refs no código | Avaliação |
|---|---|---|
| `CASH` | 2 | ATIVO (maps to DINHEIRO em toTabPaymentMethod) |
| `PIX` | 4 | ATIVO |
| `ONLINE_PIX` | 3 | ATIVO (Asaas) |
| `CREDIT_CARD` | 2 | ATIVO |
| `DEBIT_CARD` | 2 | ATIVO |
| `ONLINE_CARD` | 0 | **SUSPEITO** — sem uso no código |

**Nota:** `toTabPaymentMethod()` só mapeia `CASH → DINHEIRO`, todos os demais → `PIX`. Isso significa que CREDIT_CARD/DEBIT_CARD em pedidos públicos viram `PIX` na Tab — provavelmente um placeholder até ter maquininha integrada.

### OrderOrigin

| Valor | Refs no código | Banco (COUNT) | Avaliação |
|---|---|---|---|
| `WEBSITE` | via `Object.values()` | 24 | ATIVO |
| `MANUAL` | 1 direto | 15 | ATIVO |
| `WHATSAPP_BOT` | 1 direto | 1 | SKELETON — `createFromBot()` existe mas bot não construído |
| `IFOOD` | via `Object.values()` | 1 | FUTURO — Etapa 4 planejada |
| `RAPPI_99` | **0** | **0** | **MORTO** — 99Food saiu do Brasil |
| `UBER_EATS` | **0** | **0** | **MORTO** — Uber Eats saiu do Brasil em 2022 |
| `OTHER` | **0** | **0** | Reserva sem uso |

### OrderSource

| Valor | Banco | Avaliação |
|---|---|---|
| `OWN` | 41 (100%) | Todos os pedidos |
| `IFOOD` | 0 | Schema preparado, sem uso real |
| `NINETYNINEFOOD` | 0 | Schema preparado, sem uso real |
| `KEETA` | 0 | Schema preparado, sem uso real |

**Observação crítica:** `OrderSource` é **quase sempre derivável** de `OrderOrigin`:
- `origin=WEBSITE|MANUAL|WHATSAPP_BOT → source=OWN`
- `origin=IFOOD → source=IFOOD`
- `origin=RAPPI_99 → source=NINETYNINEFOOD`

O campo `source` em `create-order.dto.ts` é `@IsOptional()` e só verificado uma vez (`isOwnSource`). **Redundância real** — mas remoção exige migration, não é cleanup simples.

---

## 7. Models — uso no código (via `prisma.<model>`)

> **Cuidado:** `prisma.x` não captura `tx.x` dentro de `$transaction`. Os números abaixo são mínimos.

| Model | prisma.x refs | Avaliação |
|---|---|---|
| `restaurant` | 46 | CORE |
| `order` | 23 | CORE |
| `customer` | 18 | CORE |
| `product` | 17 | CORE |
| `account` | 14 | CORE |
| `payment` | 12 | CORE |
| `membership` | 12 | CORE |
| `optionGroup` | 10 | ATIVO |
| `option` | 9 | ATIVO |
| `loyaltyPoints` | 9 | ATIVO |
| `table` | 8 | ATIVO |
| `promotionalSchedule` | 8 | ATIVO |
| `deliveryZone` | 8 | ATIVO |
| `cashRegisterSession` | 8 | ATIVO |
| `campaign` | 8 | ATIVO |
| `tab` | 7 | ATIVO |
| `productionSector` | 7 | ATIVO |
| `deliveryAttempt` | 7 | ATIVO |
| `coupon` | 7 | ATIVO |
| `combo` | 7 | ATIVO |
| `marketplaceIntegration` | 6 | SKELETON (sem connector registrado) |
| `npsResponse` | 5 | ATIVO |
| `category` | 5 | ATIVO |
| `agendamento` | 5 | ATIVO |
| `loyaltyTransaction` | 4 | ATIVO |
| `comboItem` | 4 | ATIVO |
| `productAvailability` | 3 | ATIVO |
| `fiadoTransaction` | 3 | ATIVO (subestimado — maioria via tx.) |
| `customerAuth` | 3 | ATIVO |
| `productComplement` | 2 | ATIVO |
| `cartAbandonment` | 2 | ATIVO |
| `orderStatusHistory` | 1 | SUBUSADO — só 1 direto, resto via include |
| `orderItem` | 1 | SUBUSADO — idem |
| `cashMovement` | 1 | SUBESTIMADO — maioria via tx. |
| `auditLog` | 1 | SUBESTIMADO — maioria via tx. |

**Nenhum model aparece com 0 uso direto.** Os valores baixos (auditLog, cashMovement) são undercount por uso dentro de `$transaction`.

---

## 8. Endpoints suspeitos

### Endpoints de teste/debug que podem ir para produção inadvertidamente

| Endpoint | Arquivo | Avaliação |
|---|---|---|
| `GET admin/test-asaas` | `admin.controller.ts:66` | Debug endpoint — sem proteção beyond AdminGuard |
| `GET admin/abc` (?) | aparece no grep | **INVESTIGAR** — nome genérico suspeito |

### Duplicações potenciais

| Par suspeito | Avaliação |
|---|---|
| `POST /public/orders/:slug` + `POST /public/orders/by-host` | Propósito diferente: slug é URL direta, by-host detecta restaurant pelo Host header. MANTER ambos |
| `GET /restaurants/me` + `GET /admin/settings` | Provavelmente retornam escopos diferentes (owner vs admin) |
| `GET /customers/summary` + `GET /restaurants/me/fiado-summary` | Escopos diferentes, OK |
| `PATCH /orders/:id/status` + `PATCH /admin/orders/:id/status` | **INVESTIGAR** — ambos atualizam status? |

---

## 9. Feature audit

### 9.1 MarketplaceConnectors

**Status:** Skeleton completo mas vazio.
- `IMarketplaceConnector` interface definida (4 métodos: testConnection, fetchOrders, confirmOrder, cancelOrder)
- `MarketplaceConnectorRegistry` funcional mas sem connectors registrados (Map vazia)
- `MarketplaceIntegrationsService` tem CRUD completo com criptografia de authData
- **Zero connectors concretos** implementados

**Perguntas ao supervisor:**
- iFood (Etapa 4): roadmap ativo ou foi adiado indefinidamente?
- RAPPI/99Food: fundiu, saiu do Brasil em escala. Manter `RAPPI_99` no enum?
- Uber Eats: saiu do Brasil 2022. Remover `UBER_EATS` do `OrderOrigin`?
- Se iFood vai entrar, o skeleton atual está bem dimensionado?

### 9.2 Asaas

**Status:** ATIVO para SaaS billing (não para pagamentos de pedido).

Asaas é usado em `billing/` para cobrar os **donos de restaurante** pela assinatura do SaaS:
- `AsaasBillingService` cria clientes e subscriptions no Asaas
- `BillingController` tem webhook `POST /webhook/asaas` para receber pagamentos
- `AdminController` tem `GET admin/test-asaas` para debug

**Não é o mesmo que** Tab/Payment system (Etapa 5). São flows independentes. **MANTER.**

### 9.3 Geocoding + BrasilAPI

**Status:** Funcionando mas limitado.

- `GeocodingService.lookupCep()` é chamado por `DeliveryCheckService` para zonas RADIUS
- BrasilAPI v2 retorna coordinates vazias (`{}`) para maioria dos CEPs brasileiros
- ViaCEP é fallback mas é address-only (sem lat/lng)
- **Consequência:** zonas do tipo RADIUS não funcionam na prática (sem lat/lng real)

**Opções propostas:**
1. **Manter** com TODO documentado — limitação conhecida, fix via Google Geocoding pago
2. **Simplificar** — remover BrasilAPI, deixar só ViaCEP + marcar RADIUS como "requer Google Maps"
3. **Curto prazo:** rejeitar criação de zona RADIUS no endpoint enquanto geocoding não tem lat/lng

### 9.4 createFromBot (WHATSAPP_BOT)

- Método `createFromBot()` em `orders.service.ts:917` existe com `origin: OrderOrigin.WHATSAPP_BOT`
- 1 registro no banco (provavelmente de teste)
- Bot em si **não está construído**
- O método é um receptor que aguarda o bot ser integrado

**Avaliação:** MANTER — é o receptor/hook. Remover seria mais trabalho que manter.

### 9.5 `@Get('abc')` endpoint — RESOLVIDO

`src/reports/reports.controller.ts:30` → método `abcCurve()`. É a **Curva ABC de produtos** (análise de Pareto de receita). Endpoint legítimo e ativo. **MANTER.**

---

## 10. Resumo — candidatos de cleanup por risco

### BAIXO RISCO (Fase 2 — aguarda aprovação)

| Item | Arquivo | Ação |
|---|---|---|
| `console.log` PIN | `customer-auth.service.ts:42,44` | REMOVER — risco de segurança |
| TODO stale | `auth.service.ts:57` | REMOVER comentário |
| `@aws-sdk/lib-storage` | `package.json` | `npm uninstall` |
| `@nestjs/config` | `package.json` | `npm uninstall` |

### MÉDIO RISCO (Fase 3-4 — requer decisão)

| Item | Decisão necessária |
|---|---|
| `TabPaymentMethod.VOUCHER_REFEICAO` | Tem plano de implementar? Se não → migration de remoção |
| `TabPaymentMethod.CORTESIA` | Idem |
| `OrderOrigin.RAPPI_99` | 99Food saiu → remover do enum? |
| `OrderOrigin.UBER_EATS` | Uber Eats saiu BR → remover? |
| `OrderOrigin.OTHER` | Algum uso futuro? |
| `ts-loader` devDep | Confirmar se algum webpack config usa |
| `@eslint/eslintrc` devDep | Confirmar se algum eslint config usa |

### ALTO RISCO (Fase 4-6 — análise profunda antes de qualquer ação)

| Item | Motivo |
|---|---|
| `OrderSource` enum inteiro | Derivável de origin; remover = migration + refactor |
| `PaymentMethod.CARTAO_DEBITO/CREDITO` (legado) | Duplica `DEBIT_CARD/CREDIT_CARD`? Verificar enum |
| `MarketplaceConnectors` skeleton | Depende de decisão sobre roadmap iFood |
| Geocoding BrasilAPI | Depende de decisão sobre RADIUS zones |
| `PATCH /admin/orders/:id/status` duplica? | Verificar antes de agir |

---

---

**STOP — aguarda supervisor revisar antes de qualquer ação.**

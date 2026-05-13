# Etapa 9 — Campaigns + Audiences + Z-API Integration

**Status:** FECHADA  
**Data:** 2026-05-12  
**Modo:** Mock Z-API (pronto para credenciais reais via env)

---

## Migrations criadas (5)

| # | Nome | Conteúdo |
|---|------|----------|
| 020 | add_audiences | Audience model, filtros Json |
| 021 | add_customer_denormalized_fields_backfill | Customer.lastOrderAt, totalSpent, firstOrderAt; backfill |
| 022 | add_campaigns | Campaign, CampaignDispatch, CampaignMessage + enums CampaignTipo/Channel/Status/AgendamentoTipo/DispatchStatus/MessageStatus |
| 023 | add_dispatch_read_count | CampaignMessage.readAt; CampaignDispatch.sentCount/failedCount |
| 024 | add_triggers | Customer.dataNascimento/firstOrderTriggered; TriggerType enum; TriggerSubscription model com UNIQUE(campaignId, triggerType) |

---

## Models criados (5 novos)

- **Audience** — segmentação de clientes por filtros JSON (DSL)
- **Campaign** — campanha com tipo, canal, agendamento, stats
- **CampaignDispatch** — instância de envio de uma campanha
- **CampaignMessage** — mensagem individual por cliente com status de delivery
- **TriggerSubscription** — vínculo campaign ↔ trigger automático com config

---

## Enums criados nesta etapa (7)

- `CampaignTipo`: MENSAGEM | CUPOM_GENERICO | CUPOM_UNICO
- `CampaignChannel`: WHATSAPP
- `CampaignStatus`: DRAFT | SENDING | COMPLETED | SCHEDULED | RECURRING
- `AgendamentoTipo`: IMMEDIATE | SCHEDULED | RECURRING | TRIGGER
- `DispatchStatus`: SCHEDULED | RUNNING | COMPLETED | FAILED
- `MessageStatus`: PENDING | SENT | DELIVERED | READ | FAILED | CONVERTED
- `TriggerType`: BIRTHDAY | NO_ORDER_X_DAYS | FIRST_ORDER_ANNIVERSARY | FIRST_ORDER_PLACED | FIADO_LIMIT_NEAR

---

## Endpoints adicionados (~27)

### Audiences (`/audiences`)
- POST /audiences
- GET /audiences
- GET /audiences/:id
- PATCH /audiences/:id
- DELETE /audiences/:id
- POST /audiences/:id/preview

### Campaigns (`/campaigns`)
- POST /campaigns
- GET /campaigns
- GET /campaigns/:id
- PATCH /campaigns/:id
- DELETE /campaigns/:id
- POST /campaigns/:id/send
- POST /campaigns/:id/cancel
- GET /campaigns/:id/messages
- GET /campaigns/:id/report
- POST /campaigns/run-scheduler (admin/test)
- POST /campaigns/:id/subscribe-trigger

### Trigger Subscriptions (`/trigger-subscriptions`)
- GET /trigger-subscriptions
- GET /trigger-subscriptions/:id
- PATCH /trigger-subscriptions/:id
- DELETE /trigger-subscriptions/:id
- POST /trigger-subscriptions/:id/run-now

### Z-API Webhook
- POST /zapi/webhook
- POST /zapi/simulate-event (dev/test only)

### Billing (Z-API)
- GET /billing/zapi-status

---

## Smokes executados (por fase)

| Fase | Descrição | Cenários |
|------|-----------|----------|
| A | Audiences CRUD + preview | 5 |
| B | Campaigns CRUD + dispatch manual | 6 |
| C | Agendamento + cron + recorrência | 8 |
| D | Z-API webhook + eventos delivery/read | 4 |
| E | Conversion tracking + ROI report | 6 |
| F.1 | 5 trigger handlers (unit) | 29 testes |
| F.2 | Engine + dispatchToCustomers (unit) | 6 testes |
| F.3 | Endpoints integrados (HTTP real) | 19/20* |

*F.8b: `dispatched=12` em vez de `===1` — outros customers com `firstOrderAt` recente existiam; comportamento correto confirmado por F.8c (V.firstOrderTriggered=true) e F.8d (segundo run=0).

---

## Arquitetura de triggers (Fase F)

```
CronJob 9h diário
  └── TriggerEngineService.processAllTriggers()
        └── prisma.triggerSubscription.findMany({ativo:true})
              └── for each sub:
                    handler.findMatches(restaurantId, config)
                    dispatch.dispatchToCustomers(campaignId, ids)
                    if FIRST_ORDER_PLACED: customer.updateMany({firstOrderTriggered:true})

POST /trigger-subscriptions/:id/run-now → mesma lógica single-sub (para teste)
```

**5 handlers:**
- `BirthdayHandler` — `$queryRaw` EXTRACT MONTH/DAY
- `NoOrderXDaysHandler` — `customer.findMany` com threshold date
- `FirstOrderAnniversaryHandler` — `$queryRaw` EXTRACT YEAR diff
- `FirstOrderPlacedHandler` — `customer.findMany` firstOrderAt >= 24h ago + firstOrderTriggered=false
- `FiadoLimitNearHandler` — `$queryRaw` fiadoTotal >= fiadoLimite * threshold / 100

---

## TODOs documentados (docs/TODOS_ETAPA_9.md)

1. **soft-delete em Customer** — quando implementar, adicionar `deletedAt: null` nos 2 handlers ORM e nas 3 raw queries
2. **phone vazio/inválido no dispatch** — normalizePhone retorna `'55'` para phone vazio; corrigir antes de plugar Z-API real

---

## Métricas finais

| Métrica | Valor |
|---------|-------|
| Test suites | **29 passed** |
| Tests | **168 passed** |
| Build errors | **0** |
| Lint errors | **71** (baseline pré-existente em products/public — não Etapa 9) |

## Commits da Etapa 9

| Hash | Fase | Descrição |
|------|------|-----------|
| (anterior) | A–D | Audiences, Campaigns, Z-API, Scheduler |
| 9d70de9 | E | Conversion tracking + ROI report |
| c766be4 | F.0 | Migration 024 triggers schema |
| cd151de | F.1 | 5 trigger handlers + specs |
| 01a1d30 | docs | TODO soft-delete |
| 063eb62 | F.2 | Engine + dispatchToCustomers |
| 399038d | F.3 | Endpoints + CRUD + run-now |

---

## Para produção

```bash
# Plugar Z-API real:
ZAPI_INSTANCE_ID=<seu-instance-id>
ZAPI_TOKEN=<seu-token>
# Remove ZAPI_MOCK_MODE ou seta ZAPI_MOCK_MODE=false
```

Todos os dispatches funcionam em mock mode. Quando as credenciais reais forem configuradas, o `ZApiClientService` automaticamente usa o endpoint real em vez do mock.

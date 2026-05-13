# Etapa 13 — Refator de /dashboard/pedidos

**Data:** 2026-05-13  
**Commits:** `c71c67f` (Fase A) · `1706902` (Fase B)

---

## Componentes novos

| Arquivo | Tipo | Descrição |
|---|---|---|
| `src/hooks/useActiveMarketplaces.ts` | Hook | Fetch de `/marketplace-integrations/active`; retorna `asMap: ActiveMarketplacesMap` para uso nos filtros |
| `src/app/dashboard/pedidos/components/OriginFilter.tsx` | Componente | Pills horizontais com scroll; sequência fixa + marketplaces condicionais; contadores em tempo real |
| `src/app/dashboard/pedidos/components/StatusFilter.tsx` | Componente | Botões pill com agrupamento de status; 5 grupos + "Todos" |
| `src/app/dashboard/pedidos/components/PeriodFilter.tsx` | Componente | shadcn `Select` com 4 opções de período |

---

## Arquivos modificados

| Arquivo | Antes | Depois |
|---|---|---|
| `page.tsx` | 618 linhas | ~375 linhas (diff: -192 / +262 no total com 4 arquivos) |
| `src/hooks/useOrderUpdates.ts` | Sem `connected`, sem `onWhatsappPrompt` | Retorna `{ connected }`, aceita `onWhatsappPrompt` |
| `src/lib/order-origin.ts` | RAPPI_99, UBER_EATS; getAllOrigins retornava 7 inc. OTHER | MESA, NINETYNINEFOOD, KEETA; getAllOrigins retorna 7 excluindo OTHER |

---

## Decisões de design

### 1. 5 tabs de status com agrupamento

| Label | Statuses cobertos |
|---|---|
| Pendentes | `PENDING` |
| Em preparo | `CONFIRMED`, `IN_PREPARATION`, `READY` |
| Saíram | `OUT_FOR_DELIVERY` |
| Concluídos | `DELIVERED` |
| Cancelados | `CANCELED` |

Agrupamento anterior (legado): PENDING+CONFIRMED juntos, IN_PREPARATION+READY juntos — não refletia o fluxo operacional real.

### 2. Sequência de origem fixa + condicionais

Sequência sempre visível: **Site → WhatsApp → Mesa → Balcão**  
Condicionais (só aparecem se integração ativa): **iFood · 99Food · Keeta**  
Nunca exibido: `OTHER`

A visibilidade dos condicionais é resolvida em runtime via `useActiveMarketplaces` → `GET /marketplace-integrations/active`.

### 3. Contagens client-side

Origin filter foi movido para client-side (era query param `?origin=X` no backend). O motivo: para exibir contadores por origem nos pills, precisamos de todos os pedidos do período em memória. Com filtro no backend, cada troca de origem recarregaria a lista sem acesso às contagens das outras origens.

Fluxo atual:
1. Backend retorna todos os pedidos do período (limit 500)
2. `originCounts` = useMemo sobre `orders` completo
3. `ordersByOrigin` = useMemo com filtro de origem
4. `statusCounts` = useMemo sobre `ordersByOrigin`
5. `filteredOrders` = `ordersByOrigin` filtrado por status + busca

### 4. Socket.IO → useOrderUpdates

O hook `useOrderUpdates` foi estendido para expor `{ connected }` e aceitar `onWhatsappPrompt`. O `page.tsx` não gerencia mais `socketRef` nem eventos de socket diretamente.

### 5. Limite 500 com alerta

`limit=500` (era 100). Se o backend retornar exatamente 500 registros, assumimos que há mais dados e exibimos:

> "Muitos pedidos no período. Refine o filtro de período ou peça paginação."

A lista é limpa (`setOrders([])`) para não exibir dados truncados silenciosamente.

---

## TODOs documentados

```typescript
// TODO: backend GET /orders/summary com agregações byOrigin/byStatus
// pra remover dependência de fetch full + cálculo client-side
```

Localização: `src/app/dashboard/pedidos/page.tsx`, linha 40.

Impacto atual: para restaurantes com alto volume (> 500 pedidos/dia), o período "Hoje" pode disparar o alerta de "muitos pedidos". O endpoint de summary resolveria isso retornando apenas agregações sem transferir todos os registros.

---

## Smokes planejados (B.1–B.7)

| Smoke | Descrição |
|---|---|
| B.1 | Página carrega: header + busca + tempo real + período + 5 contadores origem + 5 tabs status + lista |
| B.2 | Sem integração marketplace ativa: 5 contadores (Todos/Site/WhatsApp/Mesa/Balcão) |
| B.3 | Insere IFOOD ativa no DB → reload → "iFood" aparece como 6º contador |
| B.4 | Clica "Site" no OriginFilter → lista filtra; status counts recalculam para refletir só pedidos do Site |
| B.5 | Cria pedido público com tableId via cardápio → contador "Mesa" incrementa via Socket.IO sem reload |
| B.6 | Muda período Hoje → Última semana → counts e lista atualizam |
| B.7 | Nenhuma referência visual a "99/Rappi", "Uber Eats", "Outro" em lugar nenhum |

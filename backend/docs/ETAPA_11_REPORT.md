# Etapa 11 — Relatórios com Tendências

## Endpoints criados (5)

| Endpoint | Descrição |
|---|---|
| `GET /reports/trends/summary` | 4 cards de comparação (revenue, orders, avgTicket, newCustomers) vs período anterior |
| `GET /reports/trends/revenue` | Série temporal com zero-fill, granularity=day\|month |
| `GET /reports/trends/products/top` | Top N produtos por revenue ou quantidade, JOIN OrderItem+Order |
| `GET /reports/trends/origin` | Distribuição por origem (WEBSITE, MANUAL, etc.) com percentages |
| `GET /reports/trends/heatmap` | Matriz 7×24 (dia da semana × hora) com pedidos e receita |

Todos os endpoints: `@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)` + `@UseInterceptors(CacheInterceptor)`.

## Cache

`@nestjs/cache-manager` v3.1.2 + `cache-manager` v7.8 com TTL 5 min em memória.
Configurado em `ReportsModule` via `CacheModule.register({ ttl: 5 * 60 * 1000 })`.

## Períodos suportados

| Período | Usado em |
|---|---|
| `current_month`, `current_week`, `current_year` | summary, revenue (month), topProducts, origin |
| `last_7d`, `last_30d`, `last_90d` | revenue (day), topProducts, origin, heatmap |
| `last_12m`, `last_24m` | revenue (month), topProducts, origin |

## Migration

Nenhuma. O índice `@@index([restaurantId, createdAt])` já existia no model `Order`.

## Lógica de cada endpoint

### summary
- 4 queries Prisma em `Promise.all` (curOrders, prevOrders, curNewCustomers, prevNewCustomers)
- `safePercent(current, previous)`: retorna 0 se ambos zero, 100 se previous=0, senão `(cur-prev)/prev * 100` arredondado
- Pedidos CANCELED excluídos dos cálculos de revenue e contagem
- `getPreviousRange()`: mês anterior completo / semana anterior dom-sáb / ano anterior completo

### revenue
- `DATE_TRUNC(day|month, createdAt)` com GROUP BY
- Zero-fill via loop de cursor de `range.from` até `range.to` — todos os buckets emitidos mesmo sem pedidos
- Combinações válidas: `day → [last_7d, last_30d, last_90d]`, `month → [last_12m, last_24m, current_year]`

### products/top
- `JOIN "OrderItem" oi ON "Order" o`, GROUP BY `oi."productId"`
- `SUM(oi."itemTotal")` como revenue, `SUM(oi.quantity)` como quantity
- ORDER BY dinâmico via `Prisma.sql` (evita SQL injection na cláusula ORDER BY)
- LIMIT clamped entre 1–50
- Nome: `COALESCE(MAX(productNameSnapshot), '[Produto #ID]')` — protege contra produtos deletados

### origin
- GROUP BY `o.origin`, SUM revenue, COUNT orders
- Percentages calculadas em TypeScript: `round(revenue / totalRevenue * 10000) / 100`
- Soma de percentages ≈ 100 (diferença por arredondamento)

### heatmap
- `EXTRACT(DOW FROM createdAt)` → 0=Domingo, 6=Sábado
- `EXTRACT(HOUR FROM createdAt)` → 0–23
- Zero-fill completo: 7 dias × 24 horas via `Map<"dow:hour", cell>`
- Peak: célula com maior `orders` (null se matriz toda zero)
- `dayName` em PT: `['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']`
- Timezone: UTC do servidor — TODO: usar timezone do restaurante

## TODOs documentados

- **Timezone do restaurante**: heatmap e revenue usam UTC. Migrar para `AT TIME ZONE restaurant.timezone` quando o campo for adicionado ao model.
- **Cache em Redis**: substituir cache in-memory por Redis quando escalar horizontalmente.
- **Exportação CSV/PDF**: endpoints de download para relatórios (futuro).
- **Materialized view DailySummary**: quando o volume de pedidos crescer, criar view materializada para accelerar queries de revenue e summary.
- **productNameSnapshot fallback**: `MAX(productNameSnapshot)` usa ordem alfabética — melhorar para pegar o snapshot mais recente (por `MAX(orderId)` ou `DISTINCT ON`).

## Métricas finais

| Métrica | Valor |
|---|---|
| Testes totais | 181 (+13 da Etapa 11: T.1–T.13) |
| Lint baseline | 71 (estável) |
| Build errors | 0 |
| Migration | nenhuma |

## Commits

| Hash | Descrição |
|---|---|
| `33c3e13` | Fase A — summary cards + revenue chart with period comparison |
| `64361e5` | Fase B — top products + origin distribution |
| `fa67168` | Fase C — heatmap 7x24 by day-of-week + hour |

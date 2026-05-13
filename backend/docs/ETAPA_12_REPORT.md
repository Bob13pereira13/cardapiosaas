# Etapa 12 — Frontend: Dashboard de Relatórios com Tendências

## Objetivo

Refatorar `/dashboard/relatorios` para consumir os 5 endpoints da Etapa 11 (`/reports/trends/*`),
substituindo os gráficos de barras DIY por componentes React reutilizáveis com Recharts e shadcn/ui.

## Estrutura de pastas final

```
frontend/src/app/dashboard/relatorios/
├── avancado/
│   └── page.tsx               # Página legada (ABC / LTV / hora) — movida via git mv
├── components/
│   ├── PeriodSelector.tsx      # Select com 8 períodos + exibição de datas from/to
│   ├── SummaryCards.tsx        # 4 KPI cards com skeleton e badge ↑↓
│   ├── RevenueChart.tsx        # Recharts LineChart com tabs granularity/period
│   ├── TopProductsList.tsx     # Lista ranqueada com barra proporcional + toggle receita/qtd
│   ├── OriginChart.tsx         # Recharts donut PieChart com cores por origem
│   └── HeatmapChart.tsx        # CSS grid 7×24 com escala rgba(220,38,38) + tooltip hover
├── hooks/
│   └── useTrendsApi.ts         # 5 hooks + tipos TS + toSummaryPeriod()
└── page.tsx                    # Página principal — orquestra todos os componentes
```

## Hook: useTrendsApi.ts

Padrão genérico `useTrendsFetch<T>(url)` com `useCallback([url])` + `useEffect([fetchData])`.
Retorna `{ data, loading, error }` — sem Redux, sem React Query.

| Hook | Endpoint | Parâmetros |
|---|---|---|
| `useTrendsSummary` | `GET /reports/trends/summary` | `period: TrendPeriod` (mapeado via `toSummaryPeriod()`) |
| `useTrendsRevenue` | `GET /reports/trends/revenue` | `granularity: 'day'\|'month'`, `period: TrendPeriod` |
| `useTrendsTopProducts` | `GET /reports/trends/products/top` | `period`, `limit`, `orderBy` |
| `useTrendsOrigin` | `GET /reports/trends/origin` | `period: TrendPeriod` |
| `useTrendsHeatmap` | `GET /reports/trends/heatmap` | `period: 'last_7d'\|'last_30d'\|'last_90d'` |

`toSummaryPeriod()`: mapeia `last_7d → current_week`, `last_12m/last_24m → current_year`,
demais → `current_month` (summary endpoint só suporta `current_*`).

## Componentes

### PeriodSelector
- `Select` shadcn com até 8 opções (configurável via prop `periods`)
- Exibe faixa de datas `from – to` quando disponível (recebe das respostas da API)

### SummaryCards
- 4 cards: Receita, Pedidos, Ticket Médio, Novos Clientes
- Skeleton com `animate-pulse` (sem dependência de Skeleton component)
- `ChangeBadge` com `TrendingUp`/`TrendingDown` e cor verde/vermelho por sinal

### RevenueChart
- Recharts `LineChart` em `ResponsiveContainer` 220px
- Dois `Tabs` independentes: granularity (Por dia / Por mês) e period
- Ao trocar granularity, corrige period automaticamente para combo válido
- Tooltip com `formatCurrency`, eixo Y abreviado (1k, 2k…)

### TopProductsList
- Lista `<ol>` com rank numerado (1–8), nome truncado, valor e barra horizontal proporcional
- Barra `bg-red-600` com `width: pct%` calculado sobre o máximo da lista
- Toggle Receita / Qtd via Tabs; PeriodSelector independente

### OriginChart
- Recharts `PieChart` (donut: innerRadius=50, outerRadius=80)
- Mapa de cores fixo por origem:

| Origem | Cor |
|---|---|
| WEBSITE | `#dc2626` (brand red) |
| IFOOD | `#EA1D2C` |
| MANUAL | `#6B7280` |
| WHATSAPP_BOT | `#25D366` |
| RAPPI_99 | `#FF6600` |
| UBER_EATS | `#06C167` |
| Outros | paleta fallback (violeta, azul, verde, âmbar…) |

- Legenda manual: bullet colorido + nome + orders + porcentagem
- Footer: receita total

### HeatmapChart
- CSS `grid` com 25 colunas (44px label + 24×34px células)
- Altura de célula: 30px; gap: 3px
- Cor: `rgba(220, 38, 38, alpha)` onde `alpha = max(0.15, orders/maxOrders)`; zero = `#f3f4f6`
- Tooltip via `position:fixed` + state local (sem lib externa)
- Legenda de escala de cor abaixo do grid (6 swatches de 0→100%)
- Footer: "Pico: {dayName} às {hour}h ({orders} pedidos)" ou "Sem dados suficientes"
- Período: Tabs 7d / 30d / 90d
- Responsivo: `overflow-x-auto` em mobile

## Antes × Depois

| | Antes | Depois |
|---|---|---|
| Arquivo | 1 × `page.tsx` (246 linhas) | 9 arquivos, ≤ 170 linhas cada |
| Endpoints | `/reports/summary`, `/reports/abc`, `/reports/customer-ltv`, `/reports/revenue-by-hour` (antigos) | 5 endpoints Etapa 11: `trends/summary`, `trends/revenue`, `trends/products/top`, `trends/origin`, `trends/heatmap` |
| Gráficos | Barras DIY com `div` + `style.height` | Recharts LineChart + PieChart + CSS grid heatmap |
| Loading | Texto "Carregando…" único | Skeleton por card + spinner inline por seção |
| Legado | Mantido | Movido para `/dashboard/relatorios/avancado` |

## Build

`npm run build` PASS — 0 erros TypeScript, 0 erros de compilação.
Rotas no bundle: `/dashboard/relatorios` ƒ e `/dashboard/relatorios/avancado` ƒ.

## Commits

| Hash | Fase | Descrição |
|---|---|---|
| `6dda007` | A | `refactor(relatorios): move legacy page to /avancado + update title` |
| `ce1d051` | A | `feat(relatorios): hooks + PeriodSelector + SummaryCards + RevenueChart` |
| `ac675f6` | A | `feat(relatorios): new trends dashboard page (Etapa 12 Fase A)` |
| `1d3d81b` | B | `feat(relatorios): TopProductsList + OriginChart components (Fase B)` |
| `8f3e03b` | B | `feat(relatorios): wire TopProductsList + OriginChart into page grid` |
| `cc18f92` | C | `feat(frontend): hourly heatmap chart (Etapa 12 Fase C)` |

## TODOs documentados

- **Exportação CSV**: botão de download nas seções (disponível na página `/avancado` legada)
- **Timezone do restaurante**: heatmap usa UTC do servidor — mesma limitação do backend (ver `ETAPA_11_REPORT.md`)
- **Animação de entrada**: cells do heatmap e barras do TopProducts poderiam ter `transition` de largura/cor
- **Período compartilhado**: hoje cada seção tem seu próprio period state — considerar context global se UX pedir sincronismo

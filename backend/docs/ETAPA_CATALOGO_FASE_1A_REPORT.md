# Etapa Catálogo Profissional — Fase 1A: Backend Completo

**Data:** 2026-05-13  
**Branch:** main  
**Commits:** e2a1522 → fcad98e → 21c8139 → 7a2e738 → 0456d91  

---

## Resumo Executivo

Backend completamente refatorado para modelo profissional de catálogo:  
`Categoria → Produto → Complemento → Opção`  

Reuso bidirecional (1 Opção usada em N Complementos, 1 Complemento em N Produtos),  
soft delete em cascata, snapshots imutáveis em pedidos, e 19 endpoints novos.

---

## Migration

| # | Nome | Tipo |
|---|------|------|
| 026 | `catalog_profissional_redesign` | Destrutiva (banco vazio em produção no momento da aplicação) |

---

## Models Criados (7)

| Model | Descrição |
|-------|-----------|
| `Option` | Entidade independente reutilizável (nome, preço, estoque, codePdv, imagem) |
| `Complement` | Agregação de opções com regra de seleção e modo de preço |
| `ComplementOption` | Pivot M:N Complement↔Option com extraPrice, isLocked, isVisible, sortOrder |
| `ProductComplement` | Pivot M:N Product↔Complement com sortOrder (PK própria) |
| `ProductPrintArea` | Pivot M:N Product↔ProductionSector (substitui FK 1:1 removida) |
| `OrderItemComplement` | Snapshot imutável: complementNameSnapshot, selectionRuleSnapshot |
| `OrderItemOption` | Snapshot imutável: optionNameSnapshot, optionPriceSnapshot, quantity |

---

## Models Alterados

### Product (+17 campos profissionais)

| Grupo | Campos |
|-------|--------|
| Promoção avançada | `isPromotional`, `promoStartsAt`, `promoEndsAt`, `promoSchedule` |
| Custo | `costPrice`, `useTechSheet` |
| Identificação | `codePdv`, `internalCode` (auto-gerado) |
| Apresentação | `labelType` (enum ProductLabel) |
| Operacional | `unitOfMeasure`, `useCustomNameKds`, `customNameKds`, `hideObservations`, `hideQtyButtons`, `isNew`, `isAdult`, `isServiceFeeFree` |
| Disponibilidade | `orderTypes[]`, `availableLinks[]` |
| Soft delete | `deletedAt` |

### Category
- `+deletedAt` (soft delete pattern)

### OrderItem
- `+selectedComplements OrderItemComplement[]` (relation)
- `-selectedOptions Json` (campo removido — substituído por snapshots relacionais)

---

## Enums Novos (9)

| Enum | Valores |
|------|---------|
| `OptionStockStatus` | `ACTIVE`, `OUT_OF_STOCK`, `HIDDEN` |
| `ComplementSelectionRule` | `SINGLE`, `MULTI_NO_REPEAT`, `MULTI_REPEAT` |
| `ComplementLink` | `DELIVERY`, `PICKUP`, `DINE_IN` |
| `ComplementVisibility` | `VISIBLE`, `HIDDEN`, `COLLAPSED` |
| `ComplementPriceMode` | `SUM_OF_SELECTED`, `AVERAGE_OF_SELECTED`, `HIGHEST_SELECTED`, `LOWEST_SELECTED` |
| `ProductUnit` | `UNIT`, `KG`, `G`, `L`, `ML`, `M`, `CM` |
| `ProductOrderType` | `DELIVERY`, `PICKUP`, `DINE_IN` |
| `ProductLink` | `DELIVERY`, `PICKUP`, `DINE_IN`, `TABLE` |
| `ProductLabel` | `HIGHLIGHT`, `NEW`, `PROMO`, `SOLD_OUT` |

## Enums Removidos (2)

- `OptionGroupTipo` — substituído por `ComplementSelectionRule`
- `OptionPriceMode` — substituído por `ComplementPriceMode`

---

## Endpoints

### Options (6 endpoints)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/options` | Listagem paginada com busca, filtros e includeUsage |
| `GET` | `/options/:id` | Detalhe com complementos que usam a opção |
| `POST` | `/options` | Criar opção |
| `PATCH` | `/options/:id` | Atualizar campos |
| `DELETE` | `/options/:id` | Soft delete (bloqueia se em uso por complemento ativo) |
| `PATCH` | `/options/:id/stock-status` | Toggle estoque sem recarregar tudo |

### Complements (9 endpoints)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/complements` | Listagem com filtros e contagem de uso |
| `GET` | `/complements/:id` | Detalhe com produtos que usam |
| `POST` | `/complements` | Criar com opções iniciais em `$transaction` |
| `PATCH` | `/complements/:id` | Atualizar campos (sem options — gerenciadas por sub-rotas) |
| `DELETE` | `/complements/:id` | Soft delete (bloqueia se vinculado a produto ativo) |
| `POST` | `/complements/:id/options` | Adicionar opção ao complemento |
| `DELETE` | `/complements/:id/options/:optionId` | Remover opção do complemento |
| `PATCH` | `/complements/:id/options/:optionId` | Atualizar extraPrice/isLocked/isVisible/sortOrder |
| `POST` | `/complements/:id/reorder-options` | Reordenar opções (valida completude do array) |

### Products — Endpoints Novos (4)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/products/batch-update` | Atualização em massa com isolação de tenant |
| `POST` | `/products/:id/complements` | Vincular complemento ao produto |
| `DELETE` | `/products/:id/complements/:complementId` | Desvincular complemento do produto |
| `POST` | `/products/:id/reorder-complements` | Reordenar complementos vinculados |

### Endpoints Removidos

| Rota | Motivo |
|------|--------|
| `/complementos` | Módulo legacy deletado (era `src/complementos/`) |
| `/opcoes` | Subsumido em `/options` (entidade independente) |
| `/products/:id/option-groups` | Substituído por `/products/:id/complements` |

---

## Validações Implementadas

### Tenant Isolation
- Todos os `WHERE` incluem `restaurantId` do JWT
- Cross-entity: opção deve pertencer ao mesmo restaurant que o complemento
- Cross-entity: complemento deve pertencer ao mesmo restaurant que o produto

### Soft Delete com Bloqueio
- `Option.softDelete()`: bloqueia se usada por ≥1 `ComplementOption` ativo
- `Complement.softDelete()`: bloqueia se vinculada a ≥1 `Product` ativo via `ProductComplement`
- `Product.softDelete()`: apenas marca `deletedAt + disponivel=false`, sem bloquear

### Complement Validation (Orders)
- Ownership: `complementId` deve estar em `product.productComplements`
- `SINGLE`: exatamente 1 opção selecionada
- `MULTI_NO_REPEAT`: IDs únicos, sem repetição
- `MULTI_REPEAT`: qualquer quantidade permitida
- `minSelections` / `maxSelections` aplicados via contagem total de `quantity`
- Complementos com `minSelections > 0` são obrigatórios — pedido rejeitado se ausentes
- Option availability: `stockStatus === ACTIVE && isActive === true`

### Preço por `ComplementPriceMode`

| Modo | Cálculo |
|------|---------|
| `SUM_OF_SELECTED` | Σ(extraPrice × quantity) |
| `AVERAGE_OF_SELECTED` | Σ(extraPrice × qty) / Σ(qty) |
| `HIGHEST_SELECTED` | max(extraPrice) entre selecionadas |
| `LOWEST_SELECTED` | min(extraPrice) entre selecionadas |

### Product Validation
- `internalCode` auto-gerado: `INT-{restaurantId}-{timestamp}-{3digits}` — nunca alterado em update
- `isPromotional=true` requer `precoPromocional > 0`
- `promoEndsAt` deve ser posterior a `promoStartsAt`
- `printAreaIds` verificados por ownership antes de vincular
- `complementIds` verificados por ownership antes de vincular

---

## Snapshots em Pedidos

Quando um pedido é criado com complementos selecionados, o sistema:
1. Valida complemento + opções contra o estado atual do catálogo
2. Calcula o preço final via `calcComplementPrice(priceMode, options)`
3. Persiste `OrderItemComplement` + `OrderItemOption` na mesma `$transaction`
4. Os snapshots preservam `name`, `selectionRule`, `optionPrice` — imutáveis após criação

`createManualOrder()` não aceita complementos (pedido manual = preço fixo do produto).

---

## Métricas Finais

| Métrica | Antes | Depois |
|---------|-------|--------|
| Tests | 181 | **246** (+65) |
| TS errors (build) | 4 | **0** |
| Lint errors | 71 | **52** (-19 do módulo legacy deletado) |
| Endpoints catálogo | 12 | **31** (+19) |
| Models catálogo | 4 | **11** (+7) |
| Enums | 8 | **15** (+7 net) |

---

## Commits Fase 1A

| Hash | Fase | Descrição |
|------|------|-----------|
| `e2a1522` | 1A.0 | Migration 026 — catalog redesign destrutiva |
| `fcad98e` | 1A.2 | Options — entidade independente (11 testes) |
| `21c8139` | 1A.3 | Complements — módulo com pivot ComplementOption (18 testes) |
| `7a2e738` | 1A.4 | Products — 17 campos profissionais + complement endpoints (22 testes) |
| `0456d91` | 1A.5+6 | Orders snapshots + public.service adapt (13 testes) |

---

## Módulos Legados Removidos

- `src/complementos/` — **git rm -r** em 21c8139
- Referências `OptionGroup`, `OptionGroupTipo`, `OptionPriceMode` — zero matches em `src/`
- `ComplementosModule` — ausente do `AppModule`

---

## Arquitetura Atual do Catálogo

```
Restaurant
  └── Category (soft delete)
  └── Product (soft delete, 17 novos campos)
        └── ProductComplement (M:N, sortOrder)
              └── Complement (soft delete)
                    └── ComplementOption (M:N pivot)
                          └── Option (soft delete, estoque)
        └── ProductPrintArea (M:N)
              └── ProductionSector

Order
  └── OrderItem
        └── OrderItemComplement (snapshot)
              └── OrderItemOption (snapshot)
```

---

## TODOs Futuros (fora do escopo Fase 1A)

- Upload real de imagens (S3 ou armazenamento próprio) — URL string hoje
- Ficha técnica estruturada (`TechSheetItem` com insumos e quantidades)
- Custo automático calculado via ficha técnica
- IA para melhoria de descrição (integração OpenAI/Claude API)
- Etiquetas dietéticas (Vegano, Sem Glúten, etc.) como enum separado
- `promoSchedule` mais estruturado (schema JSON tipado vs `Json` livre)
- OpenAPI/Swagger atualizado para os novos endpoints

---

## Próximas Fases (Frontend)

| Fase | Escopo |
|------|--------|
| **2** | Aba Opções no painel + Modal Criar/Editar Opção |
| **3** | Aba Complementos + Modal multi-seção (opções vinculadas) |
| **4** | Aba Produtos renovada + Modal multi-aba (info, complementos, disponibilidade) |
| **5** | Edição em massa (batch-update: categoria, disponível, destaque) |
| **6** | Cardápio público adaptado (complementos no pedido com seleção interativa) |

# Etapa Catálogo · Fase 3 — Frontend Aba Complementos

**Data de conclusão:** 2026-05-14  
**Branch:** main

---

## Resumo executivo

Aba Complementos completa e em produção. Modal multi-seção com add/remove/reorder de opções, autocomplete cross-entity, drag-and-drop acessível via mouse/teclado/touch, 4 modos de cálculo de preço, e configurações avançadas em accordion expansível.

---

## Sub-fases e commits

| Sub-fase | Hash | Descrição |
|----------|------|-----------|
| 3.1 | `77d1038` | Tipos + hook + listagem + card + empty state |
| 3.2 | `91e2800` | Modal criar/editar/excluir complemento |
| 3.2 fix | `f8aeaa7` | Fix deps: `@radix-ui/react-radio-group` ausente no lock |
| 3.3 | `612bf6e` | Opções com autocomplete + cross-modal criar opção |
| 3.4 | `7494c21` | Drag-and-drop @dnd-kit/sortable |
| 3.5 | *(este)* | priceMode + polish + a11y + relatório |

---

## Componentes criados (7)

| Arquivo | Descrição |
|---------|-----------|
| `ComplementoCard.tsx` | Card na listagem: regra, preview opções, badge uso/ativo |
| `ComplementosEmpty.tsx` | Estado vazio com CTA |
| `ComplementoFormModal.tsx` | Modal multi-seção create/edit (7 seções) |
| `ComplementoOptionsSection.tsx` | Lista de opções drag-and-drop com add/remove/update |
| `OptionAutocomplete.tsx` | Autocomplete de opções com "criar nova" |
| `ComplementoConfigsAvancadas.tsx` | Accordion priceMode com 4 radio cards |
| `ConfirmDeleteComplementDialog.tsx` | Dialog de confirmação delete |

## Hooks criados (2)

| Arquivo | Descrição |
|---------|-----------|
| `hooks/useComplements.ts` | GET paginado com search, refetch via tick counter |
| `hooks/useComplementMutations.ts` | addOption, removeOption, updateOption, reorderOptions |

## Componentes existentes estendidos

- `OpcaoFormModal.tsx` — prop `initialName?: string` + `onSaved: (newOptionId?: number) => void` para fluxo cross-modal

## Dependências adicionadas

- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- `@radix-ui/react-radio-group` (shadcn radio-group)
- `@radix-ui/react-accordion` (shadcn accordion)

---

## Endpoints consumidos

```
GET  /complements                              listagem paginada + search
GET  /complements/:id                          detalhe + options
POST /complements                              criar (+ options[])
PATCH /complements/:id                         editar (+ priceMode)
DELETE /complements/:id                        excluir

POST   /complements/:id/options                addOption (otimístico)
PATCH  /complements/:id/options/:optionId      updateOption (extraPrice, isVisible)
DELETE /complements/:id/options/:optionId      removeOption
POST   /complements/:id/reorder-options        reorderOptions { optionIds[] }

GET /options?search=X&limit=10                 autocomplete de opções
```

---

## Funcionalidades entregues

### Listagem
- Search com debounce 300ms
- Skeleton 6 cards durante carregamento
- Grid responsivo 1/2/3 colunas
- Empty state com CTA "Novo complemento"
- Empty state com pesquisa ativa
- `CatalogoErrorBoundary` envolve o grid

### Card de complemento
- Rótulo de regra dinâmico: "(obrigatória)", "(mín. X, máx. Y)"
- Preview das primeiras 3 opções + "+N mais"
- Badge "Usado em N produtos" (emerald) / "Não vinculado" (cinza)
- Badge "Inativo" (amber) quando `isActive === false`
- Menu kebab: Editar / Excluir

### Modal criar/editar (7 seções)
1. **Informações** — Nome (max 200) + Descrição (max 2000, contador)
2. **Links disponíveis** — 5 chips multi-select com `aria-pressed` + `aria-label`
3. **Regra de seleção** — 3 radio cards (Único / Múltiplo sem repetição / Múltiplo com repetição)
4. **Obrigatório** — Switch que ajusta `minSelections` automaticamente
5. **Quantidade** — Grid min/max (oculto em SINGLE), stacka em mobile
6. **Opções** — `ComplementoOptionsSection` completa
7. **Configurações avançadas** — Accordion expansível com 4 radio cards de `priceMode`

### Seção de opções
- Autocomplete com debounce 250ms, filtro de já-adicionadas (`excludeOptionIds`)
- "Criar nova opção '...'" quando não há match exato → abre `OpcaoFormModal` cross-modal
- `OptionRow` com: drag handle, imagem lazy, nome, preço extra (debounce 500ms), switch visível, remover
- Otimistic UI em add/remove/update com rollback automático em erro

### Drag-and-drop (Fase 3.4)
- `PointerSensor` com `activationConstraint: { distance: 5 }` — sem drag acidental em click
- `KeyboardSensor` com `sortableKeyboardCoordinates` — Tab + Espaço + setas
- `touch-none` no handle — drag em mobile não conflita com scroll de página
- Visual feedback: `opacity: 0.5` + `border-brand-red shadow-lg` no item arrastado
- Edit mode: `POST /complements/:id/reorder-options` com `optionIds` na nova ordem
- Create mode: só atualiza `sortOrder` local (enviado no POST final de criação)
- IDs negativos (temp/não-persistidos) filtrados antes de enviar ao backend

### Configurações avançadas (Fase 3.5)
- 4 modos de cálculo de preço: Soma / Média / Maior / Menor
- Accordion fechado por padrão (não polui UX para casos simples)
- `priceMode` incluído nos payloads POST e PATCH
- Hidratado do GET response em modo edição

### Acessibilidade
- `autoFocus` no input Nome ao abrir modal
- `aria-pressed` + `aria-label` nos chips de links
- `aria-describedby` + `role="alert"` em erros de campo
- Keyboard drag: Tab → handle → Espaço → setas → Espaço
- `Esc` fecha modal (quando não `submitting`)

### Mobile
- DialogContent: `w-full max-h-[90vh] overflow-y-auto sm:max-w-2xl`
- Chips de links em `flex-wrap`
- Grid min/max: `grid-cols-1 sm:grid-cols-2`
- `touch-none` no drag handle

---

## Bugs e limitações conhecidas

*(Nenhum bug aberto.)*

### ✅ Auditoria softDelete cross-entity (pós Fase 3, commit cb818c9)

Diagnóstico completo revelou que o relatório original continha um falso positivo:

- **Complement.softDelete**: retorna 422 corretamente desde a Fase 1A.3. O smoke da Fase 3 testou um complement sem vínculos (cleanup), não um complement em uso.
- **Option.softDelete**: retornava 400 (BadRequestException) em vez de 422 (UnprocessableEntityException) — inconsistência de semântica HTTP, não um bug funcional. Corrigida em `cb818c9`.
- **Product.softDelete**: sem bloqueio (comportamento correto — snapshots de pedidos preservam histórico).

---

## TODOs futuros (fora do escopo Fase 3)

- Badge "já em uso em X complementos" no autocomplete de opções
- Importar opções em lote (CSV/JSON)
- Drag-reorder de complementos entre cards do grid (UX nice-to-have)
- Atalhos de teclado: `/` para focar autocomplete, `Ctrl+K` para abrir criar opção
- Etiqueta visual por opção (campo no schema ainda não existe)

---

## Próximas fases

| Fase | ETA | Escopo |
|------|-----|--------|
| 4A | 3 dias | Backend: upload de imagem para Produto (clone do fluxo de Opção) |
| 4B | 2 semanas | Frontend: Aba Produtos completa (sidebar Categorias + grid + modal 3 tabs: Informações / Complementos / Disponibilidade) |
| 5 | 3-5 dias | Edição em massa + drag-drop reorder de categorias |
| 6 | 1.5 semanas | Cardápio público redesign |

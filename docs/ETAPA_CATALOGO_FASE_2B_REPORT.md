# Etapa Catálogo — Fase 2B: Frontend Opções

**Data:** 2026-05-14  
**Branch:** main  
**Tag:** v0-catalog-frontend-2b  

---

## Resumo

Implementação completa do módulo de Opções no frontend (tab `/dashboard/catalogo/opcoes`), com CRUD completo, upload de imagem para R2 via XHR com progresso, validação, acessibilidade e polish mobile.

---

## Sub-fases concluídas

### 2B.1 — Estrutura de Tabs e Layout
- `CatalogoLayout` (`layout.tsx`) com `PageHeader` + `CatalogoTabs`
- `CatalogoTabs.tsx`: tabs Produtos / Complementos / Opções com active state via `usePathname`
- `catalogo/page.tsx`: redirect automático para `/dashboard/catalogo/produtos`
- `src/lib/option-types.ts`: tipos `OptionDto`, `OptionStockStatus`, `PaginatedOptions`, `CreateOptionInput`, `UpdateOptionInput`
- `catalogo/produtos/page.tsx` e `catalogo/complementos/page.tsx`: placeholders
- Deprecation: `page.tsx.deprecated` → `git rm` na Fase 2B.5

### 2B.2 — Hook useOptions + Listagem
- `hooks/useOptions.ts`: fetch `GET /options` com filtros (`search`, `includeUsage`), `useCallback` com `JSON.stringify(params)` para deps estáveis, retorna `{ data, total, page, totalPages, loading, error, refetch }`
- `components/OpcaoCard.tsx`: card com status badge, dropdown de ações, fallback ImageIcon
- `components/OpcoesEmpty.tsx`: empty state com botão criar
- `opcoes/page.tsx`: search input com debounce 300ms, skeleton loading (6 itens), empty state condicional, grid responsivo

### 2B.3 — Modal CRUD
- `components/OpcaoFormModal.tsx`: Dialog com FormState, validação inline, fetch `GET /options/:id` para editar, `POST /options` para criar, `PATCH /options/:id` para atualizar
- `components/ConfirmDeleteDialog.tsx`: AlertDialog, `DELETE /options/:id`, mensagem de erro do servidor para opções em uso

### 2B.4 — ImageUploader + Upload R2
- `hooks/useUploadOptionImage.ts`: XHR com `onprogress`, mapa de STATUS_MESSAGES para erros 401/413/415, resolve `{ imageUrl: json.url }` (backend retorna `.url`)
- `components/ImageUploader.tsx`: controlado (parent decide quando subir), drag-drop, preview via `URL.createObjectURL`, fallback HEIC (browsers não renderizam nativamente), progress overlay `Progress` + %, AlertDialog de confirmação para remoção
- Fluxo de criação: `POST /options` → upload imagem; edição: upload primeiro → `PATCH /options/:id`
- Bloqueio de fechamento do modal durante upload (`submitting || uploading`)

### 2B.5 — Polish + Cleanup + Acessibilidade
- **OpcaoCard**: `loading="lazy" decoding="async"` na img; skeleton `animate-pulse` enquanto carrega; `aria-label="Opções de {name}"` no trigger; `Loader2` spinner durante toggle de estoque; prop `onToggleStock` tipada como `Promise<void> | void`
- **OpcaoFormModal**: `max-h-[90vh] overflow-y-auto` para mobile; `autoFocus` no campo Nome; `autoComplete="off"` nos inputs; `aria-describedby` + `role="alert"` nos erros inline
- **ImageUploader**: `role="button" tabIndex={0}` na zona vazia; `aria-label` na zona; `onKeyDown` Enter/Space aciona o picker; botões de ação sempre visíveis em mobile (`opacity-100 sm:opacity-0 sm:group-hover:opacity-100`)
- **ConfirmDeleteDialog**: `autoFocus` no botão Cancelar
- **CatalogoErrorBoundary**: class component com `getDerivedStateFromError`, botão "Tentar novamente"
- **opcoes/page.tsx**: grid envolvido com `<CatalogoErrorBoundary>`
- `git rm` do arquivo `page.tsx.deprecated`

---

## Endpoints consumidos

| Método | Path | Uso |
|--------|------|-----|
| GET | `/options` | Listar opções (search, includeUsage) |
| GET | `/options/:id` | Carregar dados para edição |
| POST | `/options` | Criar nova opção |
| PATCH | `/options/:id` | Atualizar opção |
| DELETE | `/options/:id` | Excluir opção |
| POST | `/options/:id/upload-image` | Upload imagem → R2 |
| DELETE | `/options/:id/image` | Remover imagem do R2 |
| PATCH | `/options/:id/stock-status` | Alternar disponibilidade |

---

## Build & Lint

- `npm run build`: **PASS** (Next.js 16, TypeScript OK, 0 erros de compilação)
- `npm run lint`: 55 erros / 21 warnings pré-existentes (todos em outros módulos); nenhum erro novo introduzido pela Fase 2B

---

## Decisões técnicas

- **Sem SWR/React Query**: `useState` + `fetch` + `useEffect` conforme padrão do projeto
- **XHR para upload**: `fetch` não expõe progresso — XHR com `onprogress` necessário
- **Componente controlado**: `ImageUploader` não faz upload; apenas preview/validação. O parent decide quando e como subir
- **HEIC fallback**: browsers não suportam HEIC nativamente — exibe ícone + nome do arquivo em vez de `<img>` quebrada
- **`JSON.stringify(params)` como dep do useCallback**: evita re-render infinito quando o objeto de params muda de referência a cada render
- **Dois passos no fluxo de criação**: cria opção (sem imagem) → faz upload; permite ter o `id` disponível para o endpoint de upload
- **brand-red**: toda coloração primária usa `bg-brand-red`, `text-brand-red`, `hover:bg-brand-red/90` — nunca `red-500`/`red-600`

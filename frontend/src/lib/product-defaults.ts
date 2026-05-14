/**
 * Defaults TEMPORÁRIOS pra orderTypes e availableLinks ao salvar produto.
 *
 * Backend Fase 1A.4 tornou esses campos required com mínimo 1 elemento.
 * Frontend legacy (rotas /dashboard/produtos/novo e /dashboard/produtos/[id]/editar)
 * não tem UI pra esses campos.
 *
 * Solução definitiva: Fase 4B redesenha a aba Produtos em /catalogo/produtos
 * com UI completa pra esses campos.
 *
 * Até lá, defaults razoáveis garantem que o produto seja salvável em todos
 * os canais de venda comuns.
 */

export type ProductOrderType = 'DELIVERY' | 'PICKUP' | 'DINE_IN';
export type ProductLink = 'DELIVERY' | 'MESA_PUBLIC' | 'MESA_INTERNAL' | 'BALCAO' | 'PREVIEW';

export const DEFAULT_PRODUCT_ORDER_TYPES: readonly ProductOrderType[] = [
  'DELIVERY',
  'PICKUP',
  'DINE_IN',
] as const;

export const DEFAULT_PRODUCT_AVAILABLE_LINKS: readonly ProductLink[] = [
  'DELIVERY',
  'MESA_PUBLIC',
  'MESA_INTERNAL',
  'BALCAO',
  // PREVIEW omitido propositalmente — é canal de visualização, não venda
] as const;

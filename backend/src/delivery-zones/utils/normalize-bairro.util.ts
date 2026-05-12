/**
 * Normaliza nome de bairro para comparação uniforme.
 * Regras: trim → NFD → remove combining marks (acentos, cedilha) → lowercase.
 * Exemplos: "São Paulo" → "sao paulo", "  Vila MARIANA  " → "vila mariana", "Ç" → "c"
 */
export function normalizeBairro(input: string): string {
  return input.trim().normalize('NFD').replace(/[̀-ͯ]/gu, '').toLowerCase();
}

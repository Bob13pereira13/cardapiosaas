'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { getToken, handleUnauthorized } from '@/lib/auth';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Period = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';
type Summary = {
  dailySeries: { date: string; orders: number; revenue: number }[];
  topProducts: { nome: string; count: number; revenue: number }[];
  paymentMethods: { method: string; count: number; total: number }[];
};
type Abc = { nome?: string; revenue: number; class?: string };
type Ltv = { name?: string; phone?: string; ltv?: number; totalSpent?: number; ordersCount?: number };
type Hour = { hour: number; revenue?: number };

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function exportCsv(filename: string, headers: string[], rows: string[][]) {
  const lines = [headers, ...rows].map((row) =>
    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  );
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RelatoriosPage() {
  const [period, setPeriod] = useState<Period>('MONTH');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [abc, setAbc] = useState<Abc[]>([]);
  const [ltv, setLtv] = useState<Ltv[]>([]);
  const [hours, setHours] = useState<Hour[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) { window.location.href = '/login'; return; }
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    const params = new URLSearchParams({ period });
    if (period === 'CUSTOM' && dateFrom) params.set('dateFrom', dateFrom);
    if (period === 'CUSTOM' && dateTo) params.set('dateTo', dateTo);
    const [sRes, aRes, lRes, hRes] = await Promise.all([
      fetch(`${API_URL}/reports/summary?${params}`, { headers }),
      fetch(`${API_URL}/reports/abc?${params}`, { headers }),
      fetch(`${API_URL}/reports/customer-ltv`, { headers }),
      fetch(`${API_URL}/reports/revenue-by-hour?${params}`, { headers }),
    ]);
    if (handleUnauthorized(sRes)) return;
    if (sRes.ok) setSummary(await sRes.json());
    if (aRes.ok) setAbc(await aRes.json());
    if (lRes.ok) setLtv(await lRes.json());
    if (hRes.ok) setHours(await hRes.json());
    setLoading(false);
  }, [period, dateFrom, dateTo]);

  useEffect(() => { void load(); }, [load]);

  const maxDaily = useMemo(() => Math.max(1, ...(summary?.dailySeries?.map((d) => d.revenue) ?? [1])), [summary]);
  const maxHour = useMemo(() => Math.max(1, ...hours.map((h) => h.revenue ?? 0)), [hours]);

  const periodLabel: Record<Period, string> = { TODAY: 'Hoje', WEEK: '7 dias', MONTH: '30 dias', CUSTOM: 'Personalizado' };

  return (
    <div className="space-y-5">
      <PageHeader title="Relatorios" description="Analise vendas, produtos, clientes e horarios." />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(periodLabel) as Period[]).map((p) => (
                <SelectItem key={p} value={p}>{periodLabel[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {period === 'CUSTOM' && (
          <>
            <Input type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </>
        )}
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? 'Carregando...' : 'Aplicar'}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-sm text-zinc-500">Carregando...</span>
        </div>
      ) : (
        <Tabs defaultValue="resumo" className="space-y-4">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="abc">Curva ABC</TabsTrigger>
            <TabsTrigger value="ltv">Clientes LTV</TabsTrigger>
            <TabsTrigger value="horarios">Horarios</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="space-y-5">
            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Vendas diarias</h2>
              <div className="mt-5 flex h-56 items-end gap-3">
                {(summary?.dailySeries ?? []).map((item) => (
                  <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="w-full rounded-t bg-brand-red" style={{ height: `${Math.max(8, (item.revenue / maxDaily) * 180)}px` }} />
                    <span className="truncate text-[11px] text-zinc-500">{new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            </section>
            <div className="grid gap-5 lg:grid-cols-2">
              <SimpleList
                title="Top produtos"
                rows={(summary?.topProducts ?? []).map((p) => [p.nome, `${p.count} vendas - ${fmt(p.revenue)}`])}
                onExport={() => exportCsv('top-produtos.csv', ['Produto', 'Vendas', 'Receita'],
                  (summary?.topProducts ?? []).map((p) => [p.nome, String(p.count), String(p.revenue)]))}
              />
              <SimpleList
                title="Pagamentos"
                rows={(summary?.paymentMethods ?? []).map((p) => [p.method, `${p.count} pedidos - ${fmt(p.total)}`])}
                onExport={() => exportCsv('pagamentos.csv', ['Metodo', 'Pedidos', 'Total'],
                  (summary?.paymentMethods ?? []).map((p) => [p.method, String(p.count), String(p.total)]))}
              />
            </div>
          </TabsContent>

          <TabsContent value="abc">
            <div className="mb-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => exportCsv('curva-abc.csv', ['Produto', 'Receita', 'Classe'],
                abc.map((item) => [item.nome ?? '', fmt(item.revenue), item.class ?? '']))}>
                <Download className="mr-1 h-3.5 w-3.5" /> Exportar CSV
              </Button>
            </div>
            <DataTable
              headers={['Produto', 'Receita', 'Classe']}
              rows={abc.map((item) => [item.nome ?? '-', fmt(item.revenue), item.class ?? '-'])}
            />
          </TabsContent>

          <TabsContent value="ltv">
            <div className="mb-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => exportCsv('clientes-ltv.csv', ['Cliente', 'Telefone', 'Pedidos', 'LTV'],
                ltv.map((item) => [item.name ?? '', item.phone ?? '', String(item.ordersCount ?? 0), String(item.ltv ?? 0)]))}>
                <Download className="mr-1 h-3.5 w-3.5" /> Exportar CSV
              </Button>
            </div>
            <DataTable
              headers={['Cliente', 'Telefone', 'Pedidos', 'LTV']}
              rows={ltv.slice(0, 50).map((item) => [item.name ?? '-', item.phone ?? '-', String(item.ordersCount ?? '-'), fmt(item.ltv ?? item.totalSpent ?? 0)])}
            />
          </TabsContent>

          <TabsContent value="horarios">
            <div className="mb-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => exportCsv('horarios.csv', ['Hora', 'Receita'],
                hours.map((h) => [String(h.hour) + 'h', String(h.revenue ?? 0)]))}>
                <Download className="mr-1 h-3.5 w-3.5" /> Exportar CSV
              </Button>
            </div>
            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Receita por hora</h2>
              <div className="mt-5 flex h-64 items-end gap-2">
                {hours.map((item) => {
                  const value = item.revenue ?? 0;
                  return (
                    <div key={item.hour} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <div className="w-full rounded-t bg-brand-red" style={{ height: `${Math.max(8, (value / maxHour) * 210)}px` }} />
                      <span className="text-[11px] text-zinc-500">{String(item.hour).padStart(2, '0')}h</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function SimpleList({ title, rows, onExport }: { title: string; rows: string[][]; onExport?: () => void }) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {onExport && (
          <Button variant="ghost" size="sm" onClick={onExport}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">Nenhum dado.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(([left, right], i) => (
            <div key={i} className="flex justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm">
              <span>{left}</span><strong>{right}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (rows.length === 0) return (
    <div className="rounded-lg border border-dashed py-16 text-center text-sm text-zinc-500">Nenhum dado encontrado.</div>
  );
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
          <tr>{headers.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-zinc-50">
              {row.map((cell, j) => <td key={j} className="px-4 py-3">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

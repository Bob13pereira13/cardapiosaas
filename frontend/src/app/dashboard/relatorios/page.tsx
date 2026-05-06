'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_URL } from '@/lib/config';
import { getToken, handleUnauthorized } from '@/lib/auth';
import { PageHeader } from '@/components/admin/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Summary = {
  dailySeries: { date: string; orders: number; revenue: number }[];
  topProducts: { nome: string; count: number; revenue: number }[];
  paymentMethods: { method: string; count: number; total: number }[];
};
type Abc = { productName?: string; nome?: string; revenue: number; classification?: string; class?: string };
type Ltv = { customerName?: string; name?: string; phone?: string; ltv?: number; totalSpent?: number; ordersCount?: number };
type Hour = { hour: number; revenue?: number; total?: number; orders?: number };

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function RelatoriosPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [abc, setAbc] = useState<Abc[]>([]);
  const [ltv, setLtv] = useState<Ltv[]>([]);
  const [hours, setHours] = useState<Hour[]>([]);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const [summaryRes, abcRes, ltvRes, hoursRes] = await Promise.all([
      fetch(`${API_URL}/reports/summary?period=MONTH`, { headers }),
      fetch(`${API_URL}/reports/abc?period=MONTH`, { headers }),
      fetch(`${API_URL}/reports/customer-ltv`, { headers }),
      fetch(`${API_URL}/reports/revenue-by-hour?period=MONTH`, { headers }),
    ]);
    if (handleUnauthorized(summaryRes)) return;
    if (summaryRes.ok) setSummary(await summaryRes.json());
    if (abcRes.ok) setAbc(await abcRes.json());
    if (ltvRes.ok) setLtv(await ltvRes.json());
    if (hoursRes.ok) setHours(await hoursRes.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const maxDaily = useMemo(() => Math.max(1, ...(summary?.dailySeries?.map((item) => item.revenue) ?? [1])), [summary]);
  const maxHour = useMemo(() => Math.max(1, ...hours.map((item) => item.revenue ?? item.total ?? 0)), [hours]);

  return (
    <div className="space-y-5">
      <PageHeader title="Relatorios" description="Analise vendas, produtos, clientes e horarios." />
      <Tabs defaultValue="resumo" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="abc">Curva ABC</TabsTrigger>
          <TabsTrigger value="ltv">Clientes LTV</TabsTrigger>
          <TabsTrigger value="horarios">Horarios</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="space-y-5">
          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">Vendas diarias</h2>
            <div className="mt-5 flex h-56 items-end gap-3">
              {(summary?.dailySeries ?? []).map((item) => (
                <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-t bg-brand-red" style={{ height: `${Math.max(8, (item.revenue / maxDaily) * 180)}px` }} />
                  <span className="truncate text-[11px] text-zinc-500">{new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </section>
          <div className="grid gap-5 lg:grid-cols-2">
            <SimpleList title="Top produtos" rows={(summary?.topProducts ?? []).map((p) => [p.nome, `${p.count} vendas - ${fmt(p.revenue)}`])} />
            <SimpleList title="Pagamentos" rows={(summary?.paymentMethods ?? []).map((p) => [p.method, `${p.count} pedidos - ${fmt(p.total)}`])} />
          </div>
        </TabsContent>

        <TabsContent value="abc">
          <DataTable headers={['Produto', 'Receita', 'Classe']} rows={abc.map((item) => [item.productName ?? item.nome ?? '-', fmt(item.revenue), item.classification ?? item.class ?? '-'])} />
        </TabsContent>

        <TabsContent value="ltv">
          <DataTable headers={['Cliente', 'Telefone', 'Pedidos', 'LTV']} rows={ltv.slice(0, 50).map((item) => [item.customerName ?? item.name ?? '-', item.phone ?? '-', String(item.ordersCount ?? '-'), fmt(item.ltv ?? item.totalSpent ?? 0)])} />
        </TabsContent>

        <TabsContent value="horarios">
          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">Receita por hora</h2>
            <div className="mt-5 flex h-64 items-end gap-2">
              {hours.map((item) => {
                const value = item.revenue ?? item.total ?? 0;
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
    </div>
  );
}

function SimpleList({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="rounded-lg border bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900">{title}</h2>
      <div className="space-y-2">
        {rows.map(([left, right]) => (
          <div key={`${left}-${right}`} className="flex justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm">
            <span>{left}</span><strong>{right}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
          <tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`} className="px-4 py-3">{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

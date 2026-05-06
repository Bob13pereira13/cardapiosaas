'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { API_URL } from '@/lib/config';
import { getToken, handleUnauthorized } from '@/lib/auth';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

type Settings = { loyaltyEnabled: boolean; loyaltyPointsPerBrl: number; loyaltyRedeemRate: number };
type Overview = { totalCustomers: number; totalPointsIssued: number; totalRedeemed: number; activeParticipants: number };
type Customer = { id: number; customerId: number; points: number; totalEarned: number; totalSpent: number; customer: { name: string; phone: string } };

export default function FidelidadePage() {
  const [settings, setSettings] = useState<Settings>({ loyaltyEnabled: false, loyaltyPointsPerBrl: 1, loyaltyRedeemRate: 100 });
  const [overview, setOverview] = useState<Overview | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [redeemTarget, setRedeemTarget] = useState<Customer | null>(null);
  const [redeemPoints, setRedeemPoints] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) { window.location.href = '/login'; return; }
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    const [sRes, oRes, cRes] = await Promise.all([
      fetch(`${API_URL}/loyalty/settings`, { headers }),
      fetch(`${API_URL}/loyalty/overview`, { headers }),
      fetch(`${API_URL}/loyalty/top-customers`, { headers }),
    ]);
    if (handleUnauthorized(sRes)) return;
    if (sRes.ok) setSettings(await sRes.json());
    if (oRes.ok) setOverview(await oRes.json());
    if (cRes.ok) setCustomers(await cRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/loyalty/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      });
      if (handleUnauthorized(res)) return;
      if (res.ok) { setSettings(await res.json()); toast.success('Configuracoes salvas.'); }
      else toast.error('Erro ao salvar.');
    } finally { setSaving(false); }
  }

  async function redeem() {
    if (!redeemTarget) return;
    const pts = Number(redeemPoints);
    if (!pts || pts <= 0) { toast.error('Informe uma quantidade valida de pontos.'); return; }
    const token = getToken();
    if (!token) return;
    setRedeeming(true);
    try {
      const res = await fetch(`${API_URL}/loyalty/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ customerId: redeemTarget.customerId, points: pts }),
      });
      if (handleUnauthorized(res)) return;
      if (res.ok) {
        const data = await res.json();
        toast.success(`Cupom ${data.coupon?.code} gerado — desconto de R$ ${data.discountValue?.toFixed(2)}`);
        setRedeemTarget(null);
        setRedeemPoints('');
        void load();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message ?? 'Erro ao resgatar.');
      }
    } finally { setRedeeming(false); }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Fidelidade" description="Configure o programa de pontos e acompanhe os clientes participantes." />

      {overview && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Clientes participantes', value: overview.activeParticipants },
            { label: 'Total de clientes', value: overview.totalCustomers },
            { label: 'Pontos emitidos', value: overview.totalPointsIssued.toLocaleString('pt-BR') },
            { label: 'Pontos resgatados', value: overview.totalRedeemed.toLocaleString('pt-BR') },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{stat.label}</p>
                <p className="mt-1 text-3xl font-extrabold text-zinc-950">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Configuracoes do programa</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={saveSettings}>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Programa ativo</Label>
                <p className="text-xs text-zinc-500">Clientes acumulam pontos ao fazer pedidos entregues</p>
              </div>
              <Switch
                checked={settings.loyaltyEnabled}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, loyaltyEnabled: v }))}
              />
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Pontos por R$ 1,00</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={settings.loyaltyPointsPerBrl}
                  onChange={(e) => setSettings((s) => ({ ...s, loyaltyPointsPerBrl: Number(e.target.value) }))}
                />
                <p className="text-xs text-zinc-400">Quantos pontos o cliente ganha por cada R$1 gasto</p>
              </div>
              <div className="space-y-1.5">
                <Label>Pontos para R$ 1,00 de desconto</Label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={settings.loyaltyRedeemRate}
                  onChange={(e) => setSettings((s) => ({ ...s, loyaltyRedeemRate: Number(e.target.value) }))}
                />
                <p className="text-xs text-zinc-400">Quantos pontos equivalem a R$1 de desconto no resgate</p>
              </div>
            </div>
            <Button disabled={saving} className="bg-brand-red hover:bg-brand-red/90">
              {saving ? 'Salvando...' : 'Salvar configuracoes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Clientes com pontos</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><span className="text-sm text-zinc-500">Carregando...</span></div>
          ) : customers.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-500">Nenhum cliente com pontos ainda.</div>
          ) : (
            <div className="divide-y">
              {customers.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-950">{c.customer.name}</p>
                    <p className="text-xs text-zinc-500">{c.customer.phone}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge variant="secondary" className="text-sm font-bold">{c.points.toLocaleString('pt-BR')} pts</Badge>
                      <p className="mt-0.5 text-xs text-zinc-400">{c.totalEarned} ganhos · {c.totalSpent} resgatados</p>
                    </div>
                    <Button size="sm" variant="outline" disabled={c.points === 0} onClick={() => { setRedeemTarget(c); setRedeemPoints(''); }}>
                      Resgatar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!redeemTarget} onOpenChange={(open) => !open && setRedeemTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resgatar pontos — {redeemTarget?.customer.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-zinc-600">
              Saldo disponivel: <strong>{redeemTarget?.points.toLocaleString('pt-BR')} pontos</strong>
              {' '}(equivale a{' '}
              <strong>R$ {((redeemTarget?.points ?? 0) / settings.loyaltyRedeemRate).toFixed(2)}</strong> em desconto)
            </p>
            <div className="space-y-1.5">
              <Label>Pontos a resgatar</Label>
              <Input
                type="number"
                min={1}
                max={redeemTarget?.points}
                placeholder={`Max: ${redeemTarget?.points}`}
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(e.target.value)}
              />
              {redeemPoints && Number(redeemPoints) > 0 && (
                <p className="text-xs text-zinc-500">
                  Gera cupom de desconto de R$ {(Number(redeemPoints) / settings.loyaltyRedeemRate).toFixed(2)}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRedeemTarget(null)}>Cancelar</Button>
              <Button disabled={redeeming || !redeemPoints} className="bg-brand-red hover:bg-brand-red/90" onClick={redeem}>
                {redeeming ? 'Gerando cupom...' : 'Gerar cupom'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

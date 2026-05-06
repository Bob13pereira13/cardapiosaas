'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { getToken, handleUnauthorized } from '@/lib/auth';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

type Settings = { gtmId?: string; ga4MeasurementId?: string; metaPixelId?: string; metaAccessToken?: string };

const DELIVERY_PARTNERS = [
  { key: 'ifood', name: 'iFood', logo: '🟥', status: 'Em breve' },
  { key: '99food', name: '99 Food', logo: '🟧', status: 'Em breve' },
  { key: 'uber', name: 'Uber Eats', logo: '⬛', status: 'Em breve' },
];

export default function IntegracoesPage() {
  const [form, setForm] = useState<Settings>({});
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { window.location.href = '/login'; return; }
    fetch(`${API_URL}/integrations`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => { if (handleUnauthorized(res)) return null; return res.json(); })
      .then((data) => data && setForm(data))
      .catch(() => undefined);
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/integrations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (handleUnauthorized(res)) return;
      if (res.ok) {
        setForm(await res.json());
        toast.success('Integracoes salvas.');
      } else {
        toast.error('Erro ao salvar.');
      }
    } finally {
      setSaving(false);
    }
  }

  const trackingFields: Array<[keyof Settings, string, string]> = [
    ['gtmId', 'GTM ID', 'GTM-XXXXXXX'],
    ['ga4MeasurementId', 'GA4 Measurement ID', 'G-XXXXXXXXXX'],
    ['metaPixelId', 'Meta Pixel ID', '000000000000000'],
    ['metaAccessToken', 'Meta Access Token', 'Token da API de Conversoes'],
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Integracoes" description="Configure rastreamento de marketing e plataformas de delivery parceiras." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rastreamento e Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={save}>
            {trackingFields.map(([key, label, placeholder]) => (
              <div key={key} className="grid gap-2 md:grid-cols-[220px_1fr_auto] md:items-center">
                <Label>{label}</Label>
                <div className="relative">
                  <Input
                    type={key === 'metaAccessToken' && !showToken ? 'password' : 'text'}
                    placeholder={placeholder}
                    value={form[key] ?? ''}
                    onChange={(e) => setForm((curr) => ({ ...curr, [key]: e.target.value }))}
                  />
                  {key === 'metaAccessToken' && (
                    <button
                      type="button"
                      className="absolute right-2 top-2.5 text-zinc-500"
                      onClick={() => setShowToken((v) => !v)}
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                <Badge variant={form[key] ? 'default' : 'outline'} className={form[key] ? 'bg-emerald-600 text-white' : ''}>
                  {form[key] ? 'Configurado' : 'Nao configurado'}
                </Badge>
              </div>
            ))}
            <Button disabled={saving} className="bg-brand-red hover:bg-brand-red/90">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <div>
        <p className="mb-1 text-sm font-semibold text-zinc-950">Delivery Parceiros</p>
        <p className="mb-4 text-sm text-zinc-500">Conecte sua loja a plataformas de delivery. As integracoes estao em desenvolvimento.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {DELIVERY_PARTNERS.map((partner) => (
            <Card key={partner.key}>
              <CardContent className="flex items-center gap-4 p-4">
                <span className="text-3xl">{partner.logo}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-zinc-950">{partner.name}</p>
                  <Badge variant="outline" className="mt-1 text-xs text-zinc-500">
                    {partner.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

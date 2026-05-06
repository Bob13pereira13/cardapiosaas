'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { getToken, handleUnauthorized } from '@/lib/auth';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Settings = { gtmId?: string; ga4MeasurementId?: string; metaPixelId?: string; metaAccessToken?: string };

export default function IntegracoesPage() {
  const [form, setForm] = useState<Settings>({});
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${API_URL}/integrations`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (handleUnauthorized(response)) return null;
        return response.json();
      })
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
      if (!handleUnauthorized(res) && res.ok) setForm(await res.json());
    } finally {
      setSaving(false);
    }
  }

  const fields: Array<[keyof Settings, string]> = [
    ['gtmId', 'GTM ID'],
    ['ga4MeasurementId', 'GA4 Measurement ID'],
    ['metaPixelId', 'Meta Pixel ID'],
    ['metaAccessToken', 'Meta Access Token'],
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Integracoes" description="Configure tags de marketing e mensuracao." />
      <Card>
        <CardContent className="p-6">
          <form className="space-y-4" onSubmit={save}>
            {fields.map(([key, label]) => (
              <div key={key} className="grid gap-2 md:grid-cols-[220px_1fr_auto] md:items-center">
                <Label>{label}</Label>
                <div className="relative">
                  <Input
                    type={key === 'metaAccessToken' && !showToken ? 'password' : 'text'}
                    value={form[key] ?? ''}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  />
                  {key === 'metaAccessToken' && (
                    <button type="button" className="absolute right-2 top-2 text-zinc-500" onClick={() => setShowToken((value) => !value)}>
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                <Badge variant={form[key] ? 'default' : 'outline'} className={form[key] ? 'bg-emerald-600' : ''}>
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
    </div>
  );
}

'use client';

import { FormEvent, useState } from 'react';
import { API_URL } from '@/lib/config';
import { getToken, handleUnauthorized } from '@/lib/auth';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Record<string, string | boolean | number>>({
    nome: '',
    slug: '',
    whatsapp: '',
    logo: '',
    banner: '',
    aceitaEntrega: true,
    taxaEntrega: 0,
  });

  async function save(event: FormEvent) {
    event.preventDefault();
    const token = getToken();
    if (!token) return;
    const payload =
      step === 1
        ? { nome: form.nome, slug: form.slug, whatsapp: form.whatsapp }
        : step === 2
          ? { logo: form.logo, banner: form.banner }
          : { aceitaEntrega: form.aceitaEntrega, taxaEntrega: Number(form.taxaEntrega) };

    const res = await fetch(`${API_URL}/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (handleUnauthorized(res) || !res.ok) return;
    if (step < 3) setStep((value) => value + 1);
    else window.location.href = '/dashboard';
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Onboarding" description={`Passo ${step} de 3`} />
      <Card>
        <CardContent className="p-6">
          <form className="space-y-4" onSubmit={save}>
            {step === 1 && (
              <>
                <div className="space-y-2"><Label>Nome</Label><Input value={String(form.nome)} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Slug</Label><Input value={String(form.slug)} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></div>
                <div className="space-y-2"><Label>WhatsApp</Label><Input value={String(form.whatsapp)} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} required /></div>
              </>
            )}
            {step === 2 && (
              <>
                <div className="space-y-2"><Label>Logo</Label><Input value={String(form.logo)} onChange={(e) => setForm({ ...form, logo: e.target.value })} placeholder="URL da logo" /></div>
                <div className="space-y-2"><Label>Banner</Label><Input value={String(form.banner)} onChange={(e) => setForm({ ...form, banner: e.target.value })} placeholder="URL do banner" /></div>
              </>
            )}
            {step === 3 && (
              <>
                <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={Boolean(form.aceitaEntrega)} onChange={(e) => setForm({ ...form, aceitaEntrega: e.target.checked })} /> Aceita entrega</label>
                <div className="space-y-2"><Label>Taxa de entrega</Label><Input type="number" step="0.01" value={Number(form.taxaEntrega)} onChange={(e) => setForm({ ...form, taxaEntrega: e.target.value })} /></div>
              </>
            )}
            <Button className="bg-brand-red hover:bg-brand-red/90">{step < 3 ? 'Salvar e continuar' : 'Finalizar'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

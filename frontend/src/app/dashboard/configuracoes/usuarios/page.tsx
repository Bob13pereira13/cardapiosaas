'use client';

import { FormEvent, useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';
import { API_URL } from '@/lib/config';
import { getToken, handleUnauthorized } from '@/lib/auth';
import { PageHeader } from '@/components/admin/PageHeader';
import { SettingsTabs } from '@/components/admin/SettingsTabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function UsuariosPage() {
  const [form, setForm] = useState({ nome: '', email: '', currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (handleUnauthorized(response)) return null;
        return response.json();
      })
      .then((data) => data && setForm((current) => ({ ...current, nome: data.nome ?? '', email: data.email ?? '' })))
      .catch(() => undefined);
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const payload: Record<string, string> = { nome: form.nome, email: form.email };
      if (form.newPassword) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
      }
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (handleUnauthorized(res)) return;
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message ?? 'Erro ao salvar usuario.');
        return;
      }
      toast.success('Usuario atualizado.');
      setForm((current) => ({ ...current, currentPassword: '', newPassword: '' }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-right" />
      <PageHeader title="Usuarios" description="Gerencie seus dados de acesso." />
      <SettingsTabs />
      <Card>
        <CardHeader><CardTitle>Usuario atual</CardTitle></CardHeader>
        <CardContent>
          <form className="max-w-xl space-y-4" onSubmit={save}>
            <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2"><Label>Senha atual</Label><Input type="password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} /></div>
              <div className="space-y-2"><Label>Nova senha</Label><Input type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} /></div>
            </div>
            <Button disabled={saving} className="bg-brand-red hover:bg-brand-red/90">{saving ? 'Salvando...' : 'Salvar alteracoes'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { API_URL } from '@/lib/config';
import { getToken, handleUnauthorized } from '@/lib/auth';
import { PageHeader } from '@/components/admin/PageHeader';
import { SettingsTabs } from '@/components/admin/SettingsTabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Role = 'OWNER' | 'MANAGER' | 'ATTENDANT' | 'KITCHEN' | 'CASHIER';
type Member = {
  id: number;
  nome: string;
  email: string;
  cargo: Role;
  ativo: boolean;
  lastLoginAt?: string | null;
};

const roleLabels: Record<Role, string> = {
  OWNER: 'Proprietario',
  MANAGER: 'Gerente',
  ATTENDANT: 'Atendente',
  KITCHEN: 'Cozinha',
  CASHIER: 'Caixa',
};

export default function UsuariosPage() {
  const [form, setForm] = useState({ nome: '', email: '', currentPassword: '', newPassword: '' });
  const [memberForm, setMemberForm] = useState({ nome: '', email: '', senha: '', cargo: 'ATTENDANT' as Role });
  const [members, setMembers] = useState<Member[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  const loadMembers = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoadingMembers(true);
    try {
      const res = await fetch(`${API_URL}/team`, { headers: { Authorization: `Bearer ${token}` } });
      if (handleUnauthorized(res)) return;
      if (res.ok) setMembers(await res.json());
    } finally {
      setLoadingMembers(false);
    }
  }, []);

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
    void loadMembers();
  }, [loadMembers]);

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

  async function createMember(event: FormEvent) {
    event.preventDefault();
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${API_URL}/team`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(memberForm),
    });
    if (handleUnauthorized(res)) return;
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.message ?? 'Erro ao adicionar membro.');
      return;
    }
    toast.success('Membro adicionado.');
    setDialogOpen(false);
    setMemberForm({ nome: '', email: '', senha: '', cargo: 'ATTENDANT' });
    await loadMembers();
  }

  async function updateMember(id: number, body: Partial<Member>) {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${API_URL}/team/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (handleUnauthorized(res)) return;
    if (res.ok) await loadMembers();
  }

  async function removeMember() {
    if (!deleteTarget) return;
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${API_URL}/team/${deleteTarget.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (handleUnauthorized(res)) return;
    if (res.ok) {
      toast.success('Membro removido.');
      setDeleteTarget(null);
      await loadMembers();
    }
  }

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-right" />
      <PageHeader title="Usuarios" description="Gerencie seu perfil e a equipe do restaurante." />
      <SettingsTabs />

      <Tabs defaultValue="perfil" className="space-y-4">
        <TabsList>
          <TabsTrigger value="perfil">Meu perfil</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
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
        </TabsContent>

        <TabsContent value="equipe">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Equipe</CardTitle>
              <Button className="gap-2 bg-brand-red hover:bg-brand-red/90" onClick={() => setDialogOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Adicionar membro
              </Button>
            </CardHeader>
            <CardContent>
              {loadingMembers ? (
                <div className="h-24 animate-pulse rounded-lg bg-zinc-100" />
              ) : members.length === 0 ? (
                <p className="rounded-lg border bg-zinc-50 p-6 text-center text-sm text-zinc-500">Nenhum membro de equipe cadastrado.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                      <tr>
                        <th className="px-4 py-3">Nome</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Cargo</th>
                        <th className="px-4 py-3">Ultimo acesso</th>
                        <th className="px-4 py-3">Ativo</th>
                        <th className="px-4 py-3 text-right">Acoes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {members.map((member) => (
                        <tr key={member.id}>
                          <td className="px-4 py-3 font-medium text-zinc-950">{member.nome}</td>
                          <td className="px-4 py-3 text-zinc-700">{member.email}</td>
                          <td className="px-4 py-3"><Badge variant="outline">{roleLabels[member.cargo]}</Badge></td>
                          <td className="px-4 py-3 text-zinc-500">{member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString('pt-BR') : '-'}</td>
                          <td className="px-4 py-3"><Switch checked={member.ativo} onCheckedChange={(ativo) => updateMember(member.id, { ativo })} /></td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(member)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar membro</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={createMember}>
            <div className="space-y-2"><Label>Nome</Label><Input value={memberForm.nome} onChange={(e) => setMemberForm({ ...memberForm, nome: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Senha temporaria</Label><Input type="password" value={memberForm.senha} onChange={(e) => setMemberForm({ ...memberForm, senha: e.target.value })} required /></div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select value={memberForm.cargo} onValueChange={(cargo) => setMemberForm({ ...memberForm, cargo: cargo as Role })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-brand-red hover:bg-brand-red/90">Adicionar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir membro?</DialogTitle></DialogHeader>
          <p className="text-sm text-zinc-600">Esta acao remove o acesso de {deleteTarget?.nome}.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={removeMember}>Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

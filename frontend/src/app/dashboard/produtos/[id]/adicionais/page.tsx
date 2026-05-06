'use client';

import { FormEvent, useCallback, useEffect, useState, use } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { getToken, handleUnauthorized } from '@/lib/auth';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Option = { id: number; nome: string; priceModifier: number; available: boolean };
type Group = {
  id: number;
  nome: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  priceMode: 'SUM' | 'MAX';
  options: Option[];
};

export default function AdicionaisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupForm, setGroupForm] = useState({ nome: '', required: false, minSelections: 0, maxSelections: 1, priceMode: 'SUM' as 'SUM' | 'MAX' });

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${API_URL}/products/${id}/option-groups`, { headers: { Authorization: `Bearer ${token}` } });
    if (!handleUnauthorized(res) && res.ok) setGroups(await res.json());
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createGroup(event: FormEvent) {
    event.preventDefault();
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${API_URL}/products/${id}/option-groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(groupForm),
    });
    if (res.ok) {
      setGroupForm({ nome: '', required: false, minSelections: 0, maxSelections: 1, priceMode: 'SUM' });
      await load();
    }
  }

  async function patchGroup(groupId: number, patch: Partial<Group>) {
    const token = getToken();
    if (!token) return;
    await fetch(`${API_URL}/products/${id}/option-groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    await load();
  }

  async function deleteGroup(groupId: number) {
    const token = getToken();
    if (!token) return;
    await fetch(`${API_URL}/products/${id}/option-groups/${groupId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await load();
  }

  async function createOption(groupId: number, form: HTMLFormElement) {
    const token = getToken();
    if (!token) return;
    const data = new FormData(form);
    await fetch(`${API_URL}/products/${id}/option-groups/${groupId}/options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        nome: data.get('nome'),
        priceModifier: Number(data.get('priceModifier') ?? 0),
        available: true,
      }),
    });
    form.reset();
    await load();
  }

  async function deleteOption(groupId: number, optionId: number) {
    const token = getToken();
    if (!token) return;
    await fetch(`${API_URL}/products/${id}/option-groups/${groupId}/options/${optionId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await load();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Adicionais" description="Configure grupos e opcoes deste produto." />
      <Card>
        <CardHeader><CardTitle>Novo grupo</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_120px_120px_140px_auto] md:items-end" onSubmit={createGroup}>
            <div className="space-y-2"><Label>Nome</Label><Input value={groupForm.nome} onChange={(e) => setGroupForm({ ...groupForm, nome: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Min.</Label><Input type="number" value={groupForm.minSelections} onChange={(e) => setGroupForm({ ...groupForm, minSelections: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Max.</Label><Input type="number" value={groupForm.maxSelections} onChange={(e) => setGroupForm({ ...groupForm, maxSelections: Number(e.target.value) })} /></div>
            <select className="h-10 rounded-md border px-3 text-sm" value={groupForm.priceMode} onChange={(e) => setGroupForm({ ...groupForm, priceMode: e.target.value as 'SUM' | 'MAX' })}>
              <option value="SUM">Somar</option>
              <option value="MAX">Maior preco</option>
            </select>
            <Button className="bg-brand-red hover:bg-brand-red/90"><Plus className="h-4 w-4" /> Criar</Button>
            <label className="text-sm"><input type="checkbox" checked={groupForm.required} onChange={(e) => setGroupForm({ ...groupForm, required: e.target.checked })} /> Obrigatorio</label>
          </form>
        </CardContent>
      </Card>

      {groups.map((group) => (
        <Card key={group.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{group.nome}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => deleteGroup(group.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-5">
              <Input value={group.nome} onChange={(e) => patchGroup(group.id, { nome: e.target.value })} />
              <Input type="number" value={group.minSelections} onChange={(e) => patchGroup(group.id, { minSelections: Number(e.target.value) })} />
              <Input type="number" value={group.maxSelections} onChange={(e) => patchGroup(group.id, { maxSelections: Number(e.target.value) })} />
              <select className="h-10 rounded-md border px-3 text-sm" value={group.priceMode} onChange={(e) => patchGroup(group.id, { priceMode: e.target.value as 'SUM' | 'MAX' })}>
                <option value="SUM">Somar</option>
                <option value="MAX">Maior preco</option>
              </select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={group.required} onChange={(e) => patchGroup(group.id, { required: e.target.checked })} /> Obrigatorio</label>
            </div>
            <div className="space-y-2">
              {group.options.map((option) => (
                <div key={option.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{option.nome} - {option.priceModifier.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  <Button variant="ghost" size="icon" onClick={() => deleteOption(group.id, option.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                </div>
              ))}
            </div>
            <form className="grid gap-2 md:grid-cols-[1fr_140px_auto]" onSubmit={(event) => { event.preventDefault(); void createOption(group.id, event.currentTarget); }}>
              <Input name="nome" placeholder="Nome da opcao" required />
              <Input name="priceModifier" type="number" step="0.01" placeholder="Preco" />
              <Button variant="outline">Adicionar opcao</Button>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

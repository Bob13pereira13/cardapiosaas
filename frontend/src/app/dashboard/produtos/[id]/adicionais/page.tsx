'use client';

import { FormEvent, useCallback, useEffect, useState, use } from 'react';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { API_URL } from '@/lib/config';
import { getToken, handleUnauthorized } from '@/lib/auth';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type OptionGroupTipo = 'COMPLEMENTO' | 'OPCAO' | 'ADICIONAL' | 'VARIACAO';
type PriceMode = 'SUM' | 'HIGHEST' | 'FIXED_TOTAL';

type Option = { id: number; nome: string; priceModifier: number; available: boolean };
type Group = {
  id: number;
  nome: string;
  tipo: OptionGroupTipo;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  priceMode: PriceMode;
  options: Option[];
};

const TABS: { tipo: OptionGroupTipo; label: string }[] = [
  { tipo: 'COMPLEMENTO', label: 'Complementos' },
  { tipo: 'OPCAO', label: 'Opções' },
  { tipo: 'ADICIONAL', label: 'Adicionais' },
  { tipo: 'VARIACAO', label: 'Variações' },
];

const defaultForm = (tipo: OptionGroupTipo) => ({
  nome: '',
  tipo,
  required: false,
  minSelections: 0,
  maxSelections: 1,
  priceMode: (tipo === 'VARIACAO' ? 'FIXED_TOTAL' : 'SUM') as PriceMode,
});

async function apiFetch(path: string, options?: RequestInit) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options?.headers ?? {}) },
  });
  if (handleUnauthorized(res)) return null;
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message ?? 'Erro'); }
  if (res.status === 204) return null;
  return res.json();
}

export default function AdicionaisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeTab, setActiveTab] = useState<OptionGroupTipo>('COMPLEMENTO');
  const [groupForm, setGroupForm] = useState(defaultForm('COMPLEMENTO'));

  const load = useCallback(async () => {
    try {
      const data = await apiFetch(`/products/${id}/option-groups`);
      if (data) setGroups(data);
    } catch { toast.error('Erro ao carregar grupos'); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  function onTabChange(tipo: OptionGroupTipo) {
    setActiveTab(tipo);
    setGroupForm(defaultForm(tipo));
  }

  async function createGroup(event: FormEvent) {
    event.preventDefault();
    try {
      await apiFetch(`/products/${id}/option-groups`, { method: 'POST', body: JSON.stringify(groupForm) });
      toast.success('Grupo criado');
      setGroupForm(defaultForm(activeTab));
      await load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro'); }
  }

  async function patchGroup(groupId: number, patch: Partial<Group>) {
    try {
      await apiFetch(`/products/${id}/option-groups/${groupId}`, { method: 'PATCH', body: JSON.stringify(patch) });
      await load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro'); }
  }

  async function deleteGroup(groupId: number) {
    if (!confirm('Excluir grupo e todas as opções?')) return;
    try {
      await apiFetch(`/products/${id}/option-groups/${groupId}`, { method: 'DELETE' });
      toast.success('Grupo excluído');
      await load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro'); }
  }

  async function createOption(groupId: number, form: HTMLFormElement) {
    const data = new FormData(form);
    try {
      await apiFetch(`/products/${id}/option-groups/${groupId}/options`, {
        method: 'POST',
        body: JSON.stringify({ nome: data.get('nome'), priceModifier: Number(data.get('priceModifier') ?? 0), available: true }),
      });
      form.reset();
      await load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro'); }
  }

  async function deleteOption(groupId: number, optionId: number) {
    try {
      await apiFetch(`/products/${id}/option-groups/${groupId}/options/${optionId}`, { method: 'DELETE' });
      await load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro'); }
  }

  const tabGroups = groups.filter((g) => g.tipo === activeTab);

  return (
    <div className="space-y-5">
      <Toaster richColors />
      <PageHeader title="Adicionais & Variações" description="Configure grupos e opções deste produto." />

      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as OptionGroupTipo)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.tipo} value={t.tipo}>
              {t.label}
              {groups.filter((g) => g.tipo === t.tipo).length > 0 && (
                <span className="ml-1.5 rounded-full bg-brand-red px-1.5 py-0.5 text-[10px] text-white leading-none">
                  {groups.filter((g) => g.tipo === t.tipo).length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.tipo} value={tab.tipo} className="space-y-5 mt-4">
            {tab.tipo === 'VARIACAO' && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Variações substituem o preço base</p>
                  <p className="mt-0.5 text-amber-700">Use <strong>FIXED_TOTAL</strong> para que cada variação defina o preço final do item (ex: P/M/G com preços diferentes). O preço base do produto é ignorado.</p>
                </div>
              </div>
            )}

            <Card>
              <CardHeader><CardTitle>Novo grupo de {tab.label.toLowerCase()}</CardTitle></CardHeader>
              <CardContent>
                <form
                  className="grid gap-3 md:grid-cols-[1fr_120px_120px_160px_auto] md:items-end"
                  onSubmit={createGroup}
                >
                  <div className="space-y-1.5">
                    <Label>Nome</Label>
                    <Input
                      value={groupForm.nome}
                      onChange={(e) => setGroupForm({ ...groupForm, nome: e.target.value })}
                      placeholder={tab.tipo === 'VARIACAO' ? 'Ex: Tamanho' : 'Ex: Molhos extras'}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mín.</Label>
                    <Input type="number" min={0} value={groupForm.minSelections} onChange={(e) => setGroupForm({ ...groupForm, minSelections: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Máx.</Label>
                    <Input type="number" min={1} value={groupForm.maxSelections} onChange={(e) => setGroupForm({ ...groupForm, maxSelections: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Modo de preço</Label>
                    <select
                      className="h-10 w-full rounded-md border px-3 text-sm bg-background"
                      value={groupForm.priceMode}
                      onChange={(e) => setGroupForm({ ...groupForm, priceMode: e.target.value as PriceMode })}
                    >
                      <option value="SUM">Somar</option>
                      <option value="HIGHEST">Maior preço</option>
                      <option value="FIXED_TOTAL">Preço fixo</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={groupForm.required} onChange={(e) => setGroupForm({ ...groupForm, required: e.target.checked })} />
                      Obrigatório
                    </label>
                    <Button type="submit" className="bg-brand-red hover:bg-brand-red/90">
                      <Plus className="h-4 w-4 mr-1" /> Criar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {tabGroups.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum grupo de {tab.label.toLowerCase()} criado ainda.</p>
            )}

            {tabGroups.map((group) => (
              <Card key={group.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base">{group.nome}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {group.minSelections}–{group.maxSelections} seleções · {group.priceMode === 'SUM' ? 'Somar' : group.priceMode === 'HIGHEST' ? 'Maior preço' : 'Preço fixo'}{group.required ? ' · Obrigatório' : ''}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteGroup(group.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_120px_120px_160px_auto]">
                    <Input
                      defaultValue={group.nome}
                      onBlur={(e) => { if (e.target.value !== group.nome) patchGroup(group.id, { nome: e.target.value }); }}
                    />
                    <Input type="number" min={0} defaultValue={group.minSelections} onBlur={(e) => { if (Number(e.target.value) !== group.minSelections) patchGroup(group.id, { minSelections: Number(e.target.value) }); }} />
                    <Input type="number" min={1} defaultValue={group.maxSelections} onBlur={(e) => { if (Number(e.target.value) !== group.maxSelections) patchGroup(group.id, { maxSelections: Number(e.target.value) }); }} />
                    <select
                      className="h-10 rounded-md border px-3 text-sm bg-background"
                      defaultValue={group.priceMode}
                      onBlur={(e) => { if (e.target.value !== group.priceMode) patchGroup(group.id, { priceMode: e.target.value as PriceMode }); }}
                    >
                      <option value="SUM">Somar</option>
                      <option value="HIGHEST">Maior preço</option>
                      <option value="FIXED_TOTAL">Preço fixo</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm cursor-pointer self-center">
                      <input type="checkbox" defaultChecked={group.required} onChange={(e) => patchGroup(group.id, { required: e.target.checked })} />
                      Obrigatório
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    {group.options.length === 0 && (
                      <p className="text-xs text-muted-foreground">Nenhuma opção. Adicione abaixo.</p>
                    )}
                    {group.options.map((option) => (
                      <div key={option.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <span>
                          {option.nome}
                          {option.priceModifier !== 0 && (
                            <span className="ml-2 text-muted-foreground">
                              {group.priceMode === 'FIXED_TOTAL' ? '= ' : '+ '}
                              {option.priceModifier.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          )}
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => deleteOption(group.id, option.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <form
                    className="flex gap-2"
                    onSubmit={(event) => { event.preventDefault(); void createOption(group.id, event.currentTarget); }}
                  >
                    <Input name="nome" placeholder={tab.tipo === 'VARIACAO' ? 'Ex: Grande' : 'Ex: Queijo extra'} required className="flex-1" />
                    <Input name="priceModifier" type="number" step="0.01" placeholder={group.priceMode === 'FIXED_TOTAL' ? 'Preço total' : 'Acréscimo'} className="w-32" />
                    <Button type="submit" variant="outline">
                      <Plus className="h-4 w-4 mr-1" /> Opção
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

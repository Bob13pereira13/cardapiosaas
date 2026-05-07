'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Package, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '@/lib/config';
import { getToken, handleUnauthorized } from '@/lib/auth';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Complemento = {
  id: number;
  nome: string;
  descricao?: string | null;
  obrigatorio: boolean;
  multiplaEscolha: boolean;
  minSelecoes: number;
  maxSelecoes: number;
  ativo: boolean;
  opcoes?: Opcao[];
  produtos?: Array<{ id: number; nome: string }>;
};

type Opcao = {
  id: number;
  complementoId: number;
  nome: string;
  descricao?: string | null;
  preco: number;
  ativo: boolean;
  estoque?: number | null;
  complemento?: { id: number; nome: string };
};

type Product = { id: number; nome: string; preco: number; disponivel: boolean; category?: { nome: string } };

async function apiFetch(path: string, options?: RequestInit) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options?.headers ?? {}) },
  });
  if (handleUnauthorized(res)) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Erro inesperado');
  }
  return res.status === 204 ? null : res.json();
}

export default function CatalogoPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [complementos, setComplementos] = useState<Complemento[]>([]);
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [complementoForm, setComplementoForm] = useState({ nome: '', obrigatorio: false, multiplaEscolha: false, minSelecoes: 0, maxSelecoes: 1 });
  const [opcaoForm, setOpcaoForm] = useState({ complementoId: '', nome: '', preco: '0' });

  const load = useCallback(async () => {
    try {
      const [productsData, complementosData, opcoesData] = await Promise.all([
        apiFetch('/products?page=1&limit=200'),
        apiFetch('/complementos'),
        apiFetch('/opcoes'),
      ]);
      setProducts(productsData?.data ?? []);
      setComplementos(complementosData ?? []);
      setOpcoes(opcoesData ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar catalogo');
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.nome.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? product.disponivel : !product.disponivel);
      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  async function createComplemento(event: FormEvent) {
    event.preventDefault();
    try {
      await apiFetch('/complementos', { method: 'POST', body: JSON.stringify(complementoForm) });
      setComplementoForm({ nome: '', obrigatorio: false, multiplaEscolha: false, minSelecoes: 0, maxSelecoes: 1 });
      toast.success('Complemento criado');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar complemento');
    }
  }

  async function createOpcao(event: FormEvent) {
    event.preventDefault();
    try {
      await apiFetch('/opcoes', {
        method: 'POST',
        body: JSON.stringify({ complementoId: Number(opcaoForm.complementoId), nome: opcaoForm.nome, preco: Number(opcaoForm.preco) }),
      });
      setOpcaoForm({ complementoId: '', nome: '', preco: '0' });
      toast.success('Opcao criada');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar opcao');
    }
  }

  async function toggleComplemento(item: Complemento) {
    await apiFetch(`/complementos/${item.id}/toggle`, { method: 'PATCH' });
    await load();
  }

  async function toggleOpcao(item: Opcao) {
    await apiFetch(`/opcoes/${item.id}/toggle`, { method: 'PATCH' });
    await load();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Catalogo"
        description="Produtos, complementos, opcoes e filtros avancados."
        actions={<Button asChild className="bg-brand-red hover:bg-brand-red/90"><Link href="/dashboard/produtos/novo"><Plus className="h-4 w-4" /> Novo produto</Link></Button>}
      />

      <Tabs defaultValue="produtos" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="complementos">Complementos</TabsTrigger>
          <TabsTrigger value="opcoes">Opcoes</TabsTrigger>
          <TabsTrigger value="filtros">Filtros avancados</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos">
          <Card>
            <CardHeader><CardTitle>Produtos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {filteredProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-semibold text-zinc-950">{product.nome}</p>
                    <p className="text-sm text-zinc-500">{product.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={product.disponivel ? 'default' : 'outline'} className={product.disponivel ? 'bg-brand-red' : ''}>{product.disponivel ? 'Ativo' : 'Oculto'}</Badge>
                    <Button asChild variant="outline" size="sm"><Link href={`/dashboard/produtos/${product.id}/editar`}>Editar</Link></Button>
                    <Button asChild variant="outline" size="sm"><Link href={`/dashboard/produtos/${product.id}/adicionais`}>Complementos</Link></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="complementos" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Novo complemento</CardTitle></CardHeader>
            <CardContent>
              <form className="grid gap-3 md:grid-cols-[1fr_120px_120px_auto]" onSubmit={createComplemento}>
                <Input placeholder="Nome do complemento" value={complementoForm.nome} onChange={(e) => setComplementoForm({ ...complementoForm, nome: e.target.value })} required />
                <Input type="number" min={0} value={complementoForm.minSelecoes} onChange={(e) => setComplementoForm({ ...complementoForm, minSelecoes: Number(e.target.value) })} />
                <Input type="number" min={1} value={complementoForm.maxSelecoes} onChange={(e) => setComplementoForm({ ...complementoForm, maxSelecoes: Number(e.target.value), multiplaEscolha: Number(e.target.value) > 1 })} />
                <Button className="bg-brand-red hover:bg-brand-red/90">Criar</Button>
                <label className="flex items-center gap-2 text-sm"><Switch checked={complementoForm.obrigatorio} onCheckedChange={(obrigatorio) => setComplementoForm({ ...complementoForm, obrigatorio })} /> Obrigatorio</label>
              </form>
            </CardContent>
          </Card>
          {complementos.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-zinc-950">{item.nome}</p>
                  <p className="text-sm text-zinc-500">{item.opcoes?.length ?? 0} opcoes · min {item.minSelecoes} / max {item.maxSelecoes}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={item.obrigatorio ? 'default' : 'outline'} className={item.obrigatorio ? 'bg-brand-red' : ''}>{item.obrigatorio ? 'Obrigatorio' : 'Opcional'}</Badge>
                  <Switch checked={item.ativo} onCheckedChange={() => toggleComplemento(item)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="opcoes" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Nova opcao</CardTitle></CardHeader>
            <CardContent>
              <form className="grid gap-3 md:grid-cols-[1fr_1fr_120px_auto]" onSubmit={createOpcao}>
                <Select value={opcaoForm.complementoId} onValueChange={(complementoId) => setOpcaoForm({ ...opcaoForm, complementoId })}>
                  <SelectTrigger><SelectValue placeholder="Complemento" /></SelectTrigger>
                  <SelectContent>{complementos.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.nome}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Nome da opcao" value={opcaoForm.nome} onChange={(e) => setOpcaoForm({ ...opcaoForm, nome: e.target.value })} required />
                <Input type="number" step="0.01" value={opcaoForm.preco} onChange={(e) => setOpcaoForm({ ...opcaoForm, preco: e.target.value })} />
                <Button className="bg-brand-red hover:bg-brand-red/90">Criar</Button>
              </form>
            </CardContent>
          </Card>
          {opcoes.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border bg-white p-3">
              <div>
                <p className="font-semibold text-zinc-950">{item.nome}</p>
                <p className="text-sm text-zinc-500">{item.complemento?.nome} · {item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={item.ativo} onCheckedChange={() => toggleOpcao(item)} />
                <Button variant="ghost" size="icon" onClick={() => apiFetch(`/opcoes/${item.id}`, { method: 'DELETE' }).then(load)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="filtros">
          <Card>
            <CardHeader><CardTitle>Filtros avancados</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <Input className="pl-9" placeholder="Buscar produto" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="ACTIVE">Ativos</SelectItem>
                  <SelectItem value="HIDDEN">Ocultos</SelectItem>
                </SelectContent>
              </Select>
              <Button asChild variant="outline"><Link href="/dashboard/produtos"><Package className="h-4 w-4" /> Abrir produtos</Link></Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

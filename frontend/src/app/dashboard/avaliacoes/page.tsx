'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Star } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { getToken, handleUnauthorized } from '@/lib/auth';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type Period = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';
type Summary = { averageScore: number; totalResponses: number; distribution: Record<string, number> };
type NpsItem = {
  id: number;
  score: number;
  comment?: string;
  reply?: string;
  repliedAt?: string;
  createdAt: string;
  customer?: { name: string; phone: string };
};

function StarRow({ score }: { score: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < score ? 'fill-amber-400 text-amber-400' : 'text-zinc-200'}`} />
      ))}
    </span>
  );
}

const PERIOD_LABELS: Record<Period, string> = { TODAY: 'Hoje', WEEK: '7 dias', MONTH: '30 dias', CUSTOM: 'Personalizado' };

export default function AvaliacoesPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [responses, setResponses] = useState<NpsItem[]>([]);
  const [period, setPeriod] = useState<Period>('MONTH');
  const [filterScore, setFilterScore] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyTarget, setReplyTarget] = useState<NpsItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) { window.location.href = '/login'; return; }
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    const params = new URLSearchParams({ period });
    if (filterScore) params.set('score', filterScore);
    const [sRes, rRes] = await Promise.all([
      fetch(`${API_URL}/nps/summary`, { headers }),
      fetch(`${API_URL}/nps/responses?${params}`, { headers }),
    ]);
    if (handleUnauthorized(sRes)) return;
    if (sRes.ok) setSummary(await sRes.json());
    if (rRes.ok) setResponses(await rRes.json());
    setLoading(false);
  }, [period, filterScore]);

  useEffect(() => { void load(); }, [load]);

  async function submitReply() {
    if (!replyTarget || !replyText.trim()) return;
    const token = getToken();
    if (!token) return;
    setReplying(true);
    try {
      const res = await fetch(`${API_URL}/nps/responses/${replyTarget.id}/reply`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reply: replyText }),
      });
      if (handleUnauthorized(res)) return;
      if (res.ok) {
        toast.success('Resposta enviada.');
        setReplyTarget(null);
        setReplyText('');
        void load();
      }
    } finally {
      setReplying(false);
    }
  }

  const maxDist = Math.max(1, ...Object.values(summary?.distribution ?? {}).map(Number));

  return (
    <div className="space-y-5">
      <PageHeader title="Avaliacoes" description="Acompanhe o NPS e responda os clientes." />

      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Nota media</p>
              <p className="mt-1 text-4xl font-extrabold text-zinc-950">{summary.averageScore.toFixed(1)}</p>
              <StarRow score={Math.round(summary.averageScore / 2)} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Total de avaliacoes</p>
              <p className="mt-1 text-4xl font-extrabold text-zinc-950">{summary.totalResponses}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Distribuicao</CardTitle></CardHeader>
            <CardContent className="space-y-1 pb-4">
              {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => {
                const count = summary.distribution[n] ?? 0;
                return (
                  <div key={n} className="flex items-center gap-2 text-xs">
                    <span className="w-4 text-right text-zinc-500">{n}</span>
                    <div className="h-2 flex-1 rounded bg-zinc-100">
                      <div className="h-2 rounded bg-brand-red" style={{ width: `${(count / maxDist) * 100}%` }} />
                    </div>
                    <span className="w-5 text-zinc-500">{count}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterScore || 'all'} onValueChange={(v) => setFilterScore(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Todas as notas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as notas</SelectItem>
            {[10,9,8,7,6,5,4,3,2,1].map((n) => <SelectItem key={n} value={String(n)}>Nota {n}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><span className="text-sm text-zinc-500">Carregando...</span></div>
      ) : responses.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-zinc-500">Nenhuma avaliacao encontrada.</div>
      ) : (
        <div className="space-y-3">
          {responses.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-red-soft text-sm font-bold text-brand-red">
                        {(item.customer?.name?.[0] ?? '?').toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-950">{item.customer?.name ?? 'Anonimo'}</p>
                        <p className="text-xs text-zinc-500">{item.customer?.phone}</p>
                      </div>
                      <StarRow score={Math.round(item.score / 2)} />
                      <Badge variant={item.score >= 9 ? 'default' : item.score >= 7 ? 'secondary' : 'destructive'}
                        className={item.score >= 9 ? 'bg-emerald-600 text-white' : ''}>
                        {item.score}/10
                      </Badge>
                    </div>
                    {item.comment && <p className="mt-2 text-sm text-zinc-700">{item.comment}</p>}
                    {item.reply && (
                      <div className="mt-2 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                        <MessageSquare className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
                        <span className="font-medium">Sua resposta:</span> {item.reply}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className="text-xs text-zinc-400">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</p>
                    {!item.reply && (
                      <Button size="sm" variant="outline" onClick={() => { setReplyTarget(item); setReplyText(''); }}>
                        Responder
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!replyTarget} onOpenChange={(open) => !open && setReplyTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder avaliacao de {replyTarget?.customer?.name ?? 'cliente'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            {replyTarget?.comment && (
              <p className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-600">&ldquo;{replyTarget.comment}&rdquo;</p>
            )}
            <Textarea
              rows={3}
              placeholder="Digite sua resposta..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReplyTarget(null)}>Cancelar</Button>
              <Button disabled={replying || !replyText.trim()} className="bg-brand-red hover:bg-brand-red/90" onClick={submitReply}>
                {replying ? 'Enviando...' : 'Enviar resposta'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

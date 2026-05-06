'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast, Toaster } from 'sonner'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { PageHeader } from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AuditLog = {
  id: number
  action: string
  entity: string
  entityId?: number
  meta?: any
  createdAt: string
}

async function apiFetch(path: string) {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) { handleUnauthorized(res); return null }
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message ?? 'Erro') }
  return res.json()
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  STATUS_CHANGE: 'bg-yellow-100 text-yellow-700',
}

function actionColor(action: string) {
  const key = Object.keys(ACTION_COLORS).find((k) => action.toUpperCase().includes(k))
  return key ? ACTION_COLORS[key] : 'bg-zinc-100 text-zinc-700'
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const PAGE_SIZE = 50

  const load = useCallback(async (reset = true) => {
    const currentSkip = reset ? 0 : skip
    if (reset) { setLoading(true); setSkip(0) }
    try {
      const params = new URLSearchParams({ skip: String(currentSkip) })
      if (actionFilter) params.set('action', actionFilter)
      const data = await apiFetch(`/logs?${params}`)
      if (data) {
        if (reset) {
          setLogs(data)
        } else {
          setLogs((prev) => [...prev, ...data])
        }
        setHasMore(data.length === PAGE_SIZE)
        if (!reset) setSkip(currentSkip + data.length)
      }
    } catch { toast.error('Erro ao carregar logs') } finally { setLoading(false) }
  }, [actionFilter, skip])

  useEffect(() => { load(true) }, [actionFilter]) // eslint-disable-line

  const loadMore = () => {
    load(false)
  }

  return (
    <div className="p-6 space-y-6">
      <Toaster richColors />
      <PageHeader title="Logs de Auditoria" description="Histórico de ações no painel" />

      <div className="flex gap-3 items-end">
        <div className="space-y-1">
          <Label>Filtrar por ação</Label>
          <Input
            className="w-56"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="Ex: ORDER, PRODUCT..."
          />
        </div>
        <Button variant="outline" onClick={() => load(true)}>Buscar</Button>
        {actionFilter && <Button variant="ghost" onClick={() => { setActionFilter(''); }}>Limpar</Button>}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : logs.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum log encontrado.</p>
      ) : (
        <>
          <div className="space-y-1.5">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 bg-muted/30 rounded px-4 py-2.5 text-sm">
                <span className={`text-xs font-medium rounded px-1.5 py-0.5 whitespace-nowrap ${actionColor(log.action)}`}>
                  {log.action}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{log.entity}</span>
                  {log.entityId != null && <span className="text-muted-foreground"> #{log.entityId}</span>}
                  {log.meta && (
                    <pre className="text-xs text-muted-foreground mt-0.5 truncate max-w-full">
                      {typeof log.meta === 'string' ? log.meta : JSON.stringify(log.meta)}
                    </pre>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>

          {hasMore && (
            <Button variant="outline" className="w-full" onClick={loadMore}>
              Carregar mais
            </Button>
          )}
        </>
      )}
    </div>
  )
}

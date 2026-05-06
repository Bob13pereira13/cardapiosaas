'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { MessageCircle, RotateCcw, Send } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { PageHeader } from '@/components/admin/PageHeader'
import { SettingsTabs } from '@/components/admin/SettingsTabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'
import { cn } from '@/lib/utils'

const DEFAULT_MESSAGES = {
  wppMsgPedido: 'Olá {cliente}, recebemos seu pedido #{numero} no valor de {total}.',
  wppMsgConfirmado: 'Seu pedido #{numero} foi confirmado e já entrou na fila de preparo.',
  wppMsgPronto: 'Seu pedido #{numero} está pronto para retirada.',
  wppMsgSaiu: 'Seu pedido #{numero} saiu para entrega.',
}

type MessageKey = keyof typeof DEFAULT_MESSAGES

const MESSAGE_CARDS: Array<{ key: MessageKey; title: string; helper: string }> = [
  { key: 'wppMsgPedido', title: 'Novo pedido recebido', helper: 'Variáveis: {numero}, {cliente}, {total}' },
  { key: 'wppMsgConfirmado', title: 'Pedido confirmado', helper: 'Enviado quando o pedido é aceito.' },
  { key: 'wppMsgPronto', title: 'Pedido pronto para retirada', helper: 'Enviado para pedidos de retirada.' },
  { key: 'wppMsgSaiu', title: 'Saiu para entrega', helper: 'Enviado quando o pedido vai para entrega.' },
]

export default function WhatsappPage() {
  const [whatsapp, setWhatsapp] = useState('')
  const [wppEnvioAutomatico, setWppEnvioAutomatico] = useState(false)
  const [messages, setMessages] = useState(DEFAULT_MESSAGES)
  const [saving, setSaving] = useState(false)
  const cleanNumber = whatsapp.replace(/\D/g, '')
  const preview = useMemo(() => `https://wa.me/55${cleanNumber || '11999999999'}`, [cleanNumber])

  useEffect(() => {
    async function load() {
      const token = getToken()
      if (!token) {
        window.location.href = '/login'
        return
      }
      const response = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (handleUnauthorized(response)) return
      if (response.ok) {
        const data = await response.json()
        setWhatsapp(data.whatsapp ?? '')
        setWppEnvioAutomatico(Boolean(data.wppEnvioAutomatico))
        setMessages({
          wppMsgPedido: data.wppMsgPedido ?? DEFAULT_MESSAGES.wppMsgPedido,
          wppMsgConfirmado: data.wppMsgConfirmado ?? DEFAULT_MESSAGES.wppMsgConfirmado,
          wppMsgPronto: data.wppMsgPronto ?? DEFAULT_MESSAGES.wppMsgPronto,
          wppMsgSaiu: data.wppMsgSaiu ?? DEFAULT_MESSAGES.wppMsgSaiu,
        })
      }
    }
    void load()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = getToken()
    if (!token) return
    setSaving(true)
    try {
      const response = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ whatsapp, wppEnvioAutomatico, ...messages }),
      })
      if (handleUnauthorized(response)) return
      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { message?: string }
        toast.error(error.message || 'Erro ao salvar WhatsApp.')
        return
      }
      toast.success('WhatsApp salvo')
    } finally {
      setSaving(false)
    }
  }

  function testWhatsApp() {
    if (!cleanNumber) {
      toast.error('Informe um número de WhatsApp.')
      return
    }
    window.open(`https://wa.me/55${cleanNumber}?text=${encodeURIComponent('Olá, estou testando')}`, '_blank')
  }

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-right" />
      <PageHeader title="WhatsApp" description="Configuracoes / WhatsApp" />
      <SettingsTabs />

      <form onSubmit={submit} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5 text-brand-red" />
              Atendimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Número do WhatsApp</Label>
              <Input placeholder="11999999999" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} />
              <p className="text-xs text-zinc-500">Preview: {preview}</p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border bg-zinc-50 p-4">
              <div>
                <p className="text-sm font-semibold text-zinc-950">Envio automático de mensagens</p>
                <p className="text-xs text-zinc-500">Use os textos abaixo para padronizar mensagens transacionais.</p>
              </div>
              <button
                type="button"
                onClick={() => setWppEnvioAutomatico((value) => !value)}
                className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', wppEnvioAutomatico ? 'bg-brand-red' : 'bg-zinc-300')}
              >
                <span className={cn('h-4 w-4 rounded-full bg-white shadow transition-transform', wppEnvioAutomatico ? 'translate-x-6' : 'translate-x-1')} />
              </button>
            </div>

            <Button type="button" variant="outline" className="gap-2" onClick={testWhatsApp}>
              <Send className="h-4 w-4" />
              Testar WhatsApp
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          {MESSAGE_CARDS.map((card) => (
            <Card key={card.key}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  {card.title}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => setMessages((current) => ({ ...current, [card.key]: DEFAULT_MESSAGES[card.key] }))}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restaurar padrão
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  rows={4}
                  value={messages[card.key]}
                  onChange={(event) => setMessages((current) => ({ ...current, [card.key]: event.target.value }))}
                />
                <p className="text-xs text-zinc-500">{card.helper}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end">
          <Button disabled={saving} className="bg-brand-red hover:bg-brand-red/90">
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </div>
  )
}

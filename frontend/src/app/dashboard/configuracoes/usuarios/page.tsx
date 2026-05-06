'use client'

import { useState } from 'react'
import { Mail, Plus, Users } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { SettingsTabs } from '@/components/admin/SettingsTabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const users = [
  { name: 'Dono do restaurante', email: 'demo@cardapiopedeai.com.br', role: 'Proprietario', current: true },
]

export default function UsuariosPage() {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Usuarios"
        description="Configuracoes / Usuarios"
        actions={
          <Button className="gap-2 bg-brand-red hover:bg-brand-red/90" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Convidar usuario
          </Button>
        }
      />
      <SettingsTabs />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-brand-red" />
            Acesso ao painel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.map((user) => (
            <div key={user.email} className="flex items-center justify-between gap-4 rounded-lg border bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-red-soft font-black text-brand-red">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-zinc-950">{user.name}</p>
                  <p className="flex items-center gap-1 text-sm text-zinc-500">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{user.role}</Badge>
                {user.current && <Badge className="bg-brand-red text-white">Voce</Badge>}
              </div>
            </div>
          ))}
          <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500">
            Em breve: multiplos usuarios disponiveis no plano Pro.
          </p>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input placeholder="gerente@restaurante.com.br" />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option>Gerente</option>
                <option>Atendente</option>
              </select>
            </div>
            <Button className="w-full bg-brand-red hover:bg-brand-red/90" onClick={() => setOpen(false)}>
              Enviar convite
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

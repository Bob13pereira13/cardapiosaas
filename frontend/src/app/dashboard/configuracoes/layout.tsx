'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard/configuracoes/perfil',     label: 'Perfil' },
  { href: '/dashboard/configuracoes/cardapio',   label: 'Cardápio' },
  { href: '/dashboard/configuracoes/horarios',   label: 'Horários' },
  { href: '/dashboard/configuracoes/entrega',    label: 'Entrega' },
  { href: '/dashboard/configuracoes/pagamentos', label: 'Pagamentos' },
  { href: '/dashboard/configuracoes/tracking',   label: 'Tracking' },
  { href: '/dashboard/configuracoes/dominio',    label: 'Domínio' },
  { href: '/dashboard/configuracoes/whatsapp',   label: 'WhatsApp' },
  { href: '/dashboard/configuracoes/usuarios',   label: 'Usuários' },
]

export default function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-950">Configurações</h1>
        <p className="text-sm text-zinc-500">Gerencie as configurações do seu restaurante.</p>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              pathname === tab.href
                ? 'border-brand-red text-brand-red'
                : 'border-transparent text-zinc-500 hover:text-zinc-800',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}

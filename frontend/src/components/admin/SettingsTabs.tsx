'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard/configuracoes/perfil', label: 'Perfil' },
  { href: '/dashboard/configuracoes/cardapio', label: 'Cardapio' },
  { href: '/dashboard/configuracoes/entrega', label: 'Entrega' },
  { href: '/dashboard/configuracoes/horarios', label: 'Horarios' },
  { href: '/dashboard/configuracoes/pagamentos', label: 'Pagamentos' },
  { href: '/dashboard/configuracoes/tracking', label: 'Tracking' },
  { href: '/dashboard/configuracoes/dominio', label: 'Dominio' },
  { href: '/dashboard/configuracoes/whatsapp', label: 'WhatsApp' },
  { href: '/dashboard/configuracoes/usuarios', label: 'Usuarios' },
]

export function SettingsTabs() {
  const pathname = usePathname()

  return (
    <div className="mb-5 overflow-x-auto border-b">
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-zinc-500 transition hover:text-zinc-950',
                active && 'border-brand-red text-brand-red',
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

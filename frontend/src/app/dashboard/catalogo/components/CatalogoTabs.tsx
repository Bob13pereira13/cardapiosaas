'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Produtos', href: '/dashboard/catalogo/produtos' },
  { label: 'Complementos', href: '/dashboard/catalogo/complementos' },
  { label: 'Opções', href: '/dashboard/catalogo/opcoes' },
]

export function CatalogoTabs() {
  const pathname = usePathname()

  return (
    <div className="mb-6 flex border-b border-gray-200">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'px-4 py-2 text-sm transition-colors',
              isActive
                ? '-mb-px border-b-2 border-brand-red font-semibold text-zinc-950'
                : 'font-medium text-gray-500 hover:text-zinc-700',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}

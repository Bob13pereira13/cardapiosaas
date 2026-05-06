'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart2,
  Bell,
  CalendarDays,
  ChefHat,
  ClipboardList,
  CreditCard,
  ExternalLink,
  LayoutGrid,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Package,
  Plug,
  QrCode,
  ScrollText,
  Search,
  SlidersHorizontal,
  Star,
  Store,
  Table2,
  Ticket,
  UtensilsCrossed,
  Users,
  Utensils,
  Wallet,
  X,
} from 'lucide-react'
import { ReactNode, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: typeof ClipboardList
  soon?: boolean
}

type NavSection = {
  label: string
  items: NavItem[]
}

type DashboardShellProps = {
  children: ReactNode
  slug: string | null
  subscriptionStatus: string | null
  onLogout: () => void
}

const navSections: NavSection[] = [
  {
    label: 'Operacao',
    items: [
      { href: '/dashboard/inicio', label: 'Inicio', icon: Store },
      { href: '/dashboard/pedidos', label: 'Pedidos', icon: ClipboardList },
      { href: '/dashboard/kds', label: 'KDS', icon: ChefHat },
      { href: '/dashboard/mesas', label: 'Mesas', icon: Table2 },
      { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays },
    ],
  },
  {
    label: 'Catalogo',
    items: [
      { href: '/dashboard/produtos', label: 'Produtos', icon: Package },
      { href: '/dashboard/categorias', label: 'Categorias', icon: LayoutGrid },
      { href: '/dashboard/combos', label: 'Combos', icon: UtensilsCrossed },
      { href: '/dashboard/cupons', label: 'Cupons', icon: Ticket },
      { href: '/dashboard/qrcode', label: 'QR Code', icon: QrCode },
    ],
  },
  {
    label: 'Clientes',
    items: [
      { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
      { href: '/dashboard/fidelidade', label: 'Fidelidade', icon: Star },
      { href: '/dashboard/avaliacoes', label: 'Avaliacoes', icon: MessageSquare },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/dashboard/marketing', label: 'Campanhas', icon: Megaphone },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { href: '/dashboard/relatorios', label: 'Relatorios', icon: BarChart2 },
      { href: '/dashboard/financeiro', label: 'Financeiro', icon: Wallet },
    ],
  },
  {
    label: 'Conta',
    items: [
      { href: '/dashboard/configuracoes', label: 'Configuracoes', icon: SlidersHorizontal },
      { href: '/dashboard/integracoes', label: 'Integracoes', icon: Plug },
      { href: '/dashboard/assinatura', label: 'Assinatura', icon: CreditCard },
      { href: '/dashboard/logs', label: 'Logs', icon: ScrollText },
    ],
  },
]

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

function Logo() {
  return (
    <Link href="/dashboard/inicio" className="flex items-center gap-2 text-zinc-950">
      <Utensils className="h-5 w-5 text-brand-red" />
      <span className="text-lg font-extrabold leading-none">
        cardapio<span className="text-brand-red">.</span>pede<span className="text-brand-red">.</span>ai
      </span>
    </Link>
  )
}

function Sidebar({
  pathname,
  onLogout,
  onNavigate,
  onClose,
}: {
  pathname: string
  onLogout: () => void
  onNavigate?: () => void
  onClose?: () => void
}) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col overflow-hidden border-r border-border bg-card">
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <Logo />
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {section.label}
            </p>
            <div className="flex flex-col gap-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isActive(pathname, item.href) && !item.soon

                return (
                  <Link
                    key={`${section.label}-${item.label}`}
                    href={item.href}
                    aria-disabled={item.soon}
                    onClick={(event) => {
                      if (item.soon) event.preventDefault()
                      onNavigate?.()
                    }}
                    className={cn(
                      'flex min-h-10 items-center gap-3 rounded-md border-l-4 border-transparent px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-muted',
                      active && 'border-brand-red bg-brand-red-soft text-brand-red',
                      item.soon && 'cursor-not-allowed opacity-45 hover:bg-transparent',
                    )}
                    title={item.soon ? 'Em breve' : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.soon && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        Breve
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={onLogout}
          className="mt-auto flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-700 transition hover:bg-muted"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </nav>

      <div className="flex items-center justify-between border-t border-border px-5 py-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          Loja aberta
        </span>
        <span className="font-mono">v1.0</span>
      </div>
    </aside>
  )
}

export function DashboardShell({ children, slug, subscriptionStatus, onLogout }: DashboardShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const initials = useMemo(() => {
    if (!slug) return 'CS'
    return slug
      .split('-')
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
  }, [slug])

  const blocked = subscriptionStatus === 'CANCELED'

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <div className="hidden md:flex">
        <Sidebar pathname={pathname} onLogout={onLogout} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/40"
            type="button"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[280px] bg-card shadow-lg">
            <Sidebar
              pathname={pathname}
              onLogout={onLogout}
              onNavigate={() => setMobileOpen(false)}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden items-center gap-3 md:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-red-soft text-sm font-bold text-brand-red">
                {initials}
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-semibold text-zinc-950">Cardapio SaaS</p>
                <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  {slug ? `Aberto - /cardapio/${slug}` : 'Carregando restaurante'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {slug && (
              <Button asChild variant="outline" size="sm" className="hidden gap-2 sm:inline-flex">
                <Link href={`/cardapio/${slug}`} target="_blank" rel="noreferrer">
                  <Store className="h-4 w-4" />
                  Ver cardapio
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="icon" aria-label="Buscar">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notificacoes">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-card bg-brand-red" />
            </Button>
            <div className="ml-1 h-9 w-9 rounded-full bg-brand-red-soft text-center text-sm font-bold leading-9 text-brand-red">
              {initials}
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
          {blocked ? (
            <section className="mx-auto max-w-5xl rounded-lg border border-red-200 bg-red-50 p-6 text-red-900 shadow-sm">
              <h1 className="text-xl font-bold">Assinatura cancelada</h1>
              <p className="mt-2 text-sm text-red-800">
                O acesso ao dashboard esta bloqueado. Entre em contato com o suporte para reativar.
              </p>
            </section>
          ) : (
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          )}
        </main>
      </div>
    </div>
  )
}

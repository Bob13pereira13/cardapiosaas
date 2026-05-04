'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { API_URL } from '@/lib/config'
import { getToken } from '@/lib/auth'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [slug, setSlug] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) { window.location.href = '/login'; return }

    fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setSlug(data.slug ?? null))
      .catch(() => {})
  }, [])

  function logout() {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  return (
    <div style={styles.root}>
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <span style={styles.brand}>Cardápio SaaS</span>
          <a
            href="/dashboard"
            style={{ ...styles.link, ...(pathname === '/dashboard' ? styles.linkActive : {}) }}
          >
            Produtos
          </a>
          <a
            href="/dashboard/configuracoes"
            style={{ ...styles.link, ...(pathname === '/dashboard/configuracoes' ? styles.linkActive : {}) }}
          >
            Configurações
          </a>
        </div>

        <div style={styles.navRight}>
          {slug && (
            <a
              href={`/cardapio/${slug}`}
              target="_blank"
              rel="noreferrer"
              style={styles.viewLink}
            >
              Ver meu cardápio ↗
            </a>
          )}
          <button onClick={logout} style={styles.logoutBtn}>
            Sair
          </button>
        </div>
      </nav>

      <main style={styles.content}>{children}</main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: '#f3f4f6',
    fontFamily: 'Arial, sans-serif',
  },
  nav: {
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
    padding: '0 24px',
    height: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  brand: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#16a34a',
    marginRight: 8,
  },
  link: {
    color: '#6b7280',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: '500',
    padding: '4px 0',
  },
  linkActive: {
    color: '#111827',
    borderBottom: '2px solid #16a34a',
  },
  viewLink: {
    color: '#16a34a',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 'bold',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 14,
    color: '#6b7280',
  },
  content: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '28px 16px',
  },
}

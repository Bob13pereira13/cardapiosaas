'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { API_URL } from '@/lib/config'
import { getAdminToken } from '@/lib/auth'

type LoginResponse = {
  access_token: string
  user: {
    role?: string
  }
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (getAdminToken()) router.replace('/admin/dashboard')
  }, [router])

  async function handleLogin() {
    if (!email || !password) {
      return alert('Preencha email e senha.')
    }

    try {
      setLoading(true)

      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) throw new Error('Login invalido')

      const data = (await res.json()) as LoginResponse

      if (data.user.role !== 'ADMIN') {
        alert('Usuario sem permissao de administrador.')
        return
      }

      localStorage.setItem('adminToken', data.access_token)
      router.replace('/admin/dashboard')
    } catch (error) {
      console.error(error)
      alert('Email ou senha invalidos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <h1 style={styles.title}>Admin</h1>
        <p style={styles.subtitle}>Acesse o painel interno do SaaS</p>

        <input
          style={styles.input}
          placeholder="Email administrador"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <button type="button" onClick={handleLogin} style={styles.button}>
          {loading ? 'Entrando...' : 'Entrar no admin'}
        </button>
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#111827',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Arial, sans-serif',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: '#fff',
    borderRadius: 16,
    padding: 28,
    boxShadow: '0 20px 50px rgba(0,0,0,0.24)',
  },
  title: { margin: 0, fontSize: 28, color: '#111827' },
  subtitle: { margin: '6px 0 20px', color: '#6b7280' },
  input: {
    width: '100%',
    padding: '13px 14px',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    fontSize: 15,
    marginBottom: 12,
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    border: 0,
    background: '#111827',
    color: '#fff',
    padding: 14,
    borderRadius: 10,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
}

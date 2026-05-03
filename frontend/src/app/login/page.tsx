'use client'

import { useState } from 'react'
import { API_URL } from '@/lib/config'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) {
      return alert('Preencha email e senha.')
    }

    try {
      setLoading(true)

      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      if (!res.ok) {
        throw new Error('Login inválido')
      }

      const data = await res.json()

      // 🔥 SALVA TOKEN
      localStorage.setItem('token', data.access_token)

      // 🚀 REDIRECIONA
      window.location.href = '/dashboard'
    } catch (error) {
      console.error(error)
      alert('Email ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <h1 style={styles.title}>Entrar</h1>
        <p style={styles.subtitle}>Acesse seu painel do restaurante</p>

        <input
          style={styles.input}
          placeholder="Seu email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleLogin} style={styles.button}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f3f4f6',
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
    borderRadius: 24,
    padding: 28,
    boxShadow: '0 20px 50px rgba(0,0,0,0.12)',
  },
  title: {
    margin: 0,
    fontSize: 28,
    color: '#111827',
  },
  subtitle: {
    margin: '6px 0 20px',
    color: '#6b7280',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 14,
    border: '1px solid #d1d5db',
    fontSize: 15,
    marginBottom: 12,
    outline: 'none',
  },
  button: {
    width: '100%',
    border: 0,
    background: '#16a34a',
    color: '#fff',
    padding: '14px',
    borderRadius: 999,
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: 8,
  },
}

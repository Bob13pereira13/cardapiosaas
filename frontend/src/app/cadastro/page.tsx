'use client'

import { useState } from 'react'
import { API_URL } from '@/lib/config'
import { getToken } from '@/lib/auth'

export default function CadastroPage() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  if (typeof window !== 'undefined' && getToken()) {
    window.location.href = '/dashboard'
  }

  async function handleCadastro() {
    if (!nome || !email || !password) {
      return alert('Preencha todos os campos.')
    }

    if (password.length < 6) {
      return alert('Senha deve ter no mínimo 6 caracteres.')
    }

    try {
      setLoading(true)

      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg = data?.message
        if (Array.isArray(msg)) throw new Error(msg.join('\n'))
        throw new Error(msg || 'Erro ao criar conta.')
      }

      alert('Conta criada com sucesso! Faça login para continuar.')
      window.location.href = '/login'
    } catch (error: any) {
      alert(error.message || 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <h1 style={styles.title}>Criar conta</h1>
        <p style={styles.subtitle}>Crie seu cardápio digital em minutos</p>

        <input
          style={styles.input}
          placeholder="Nome do restaurante"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        <input
          style={styles.input}
          type="email"
          placeholder="Seu email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Senha (mínimo 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleCadastro} style={styles.button}>
          {loading ? 'Criando conta...' : 'Criar conta grátis'}
        </button>

        <p style={styles.loginRow}>
          Já tem conta?{' '}
          <a href="/login" style={styles.loginLink}>
            Entrar
          </a>
        </p>
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
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    border: 0,
    background: '#16a34a',
    color: '#fff',
    padding: '14px',
    borderRadius: 999,
    fontWeight: 'bold',
    fontSize: 15,
    cursor: 'pointer',
    marginTop: 8,
  },
  loginRow: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: '#6b7280',
  },
  loginLink: {
    color: '#16a34a',
    fontWeight: 'bold',
    textDecoration: 'none',
  },
}

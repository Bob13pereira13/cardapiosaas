'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL } from '@/lib/config'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) window.location.href = '/login'
  }, [token])

  async function handleSubmit() {
    if (!password || !confirm) return alert('Preencha todos os campos.')
    if (password.length < 6) return alert('Senha deve ter no mínimo 6 caracteres.')
    if (password !== confirm) return alert('As senhas não coincidem.')

    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) return alert(data.message || 'Erro ao redefinir senha.')

      setDone(true)
    } catch {
      alert('Erro ao redefinir senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={styles.card}>
      <h1 style={styles.title}>Nova senha</h1>

      {done ? (
        <>
          <p style={styles.success}>Senha redefinida com sucesso!</p>
          <a href="/login" style={styles.link}>Ir para o login</a>
        </>
      ) : (
        <>
          <p style={styles.subtitle}>Escolha uma nova senha para sua conta.</p>
          <input
            style={styles.input}
            type="password"
            placeholder="Nova senha (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Confirmar senha"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button onClick={handleSubmit} style={styles.button}>
            {loading ? 'Salvando...' : 'Redefinir senha'}
          </button>
        </>
      )}
    </section>
  )
}

export default function ResetPasswordPage() {
  return (
    <main style={styles.page}>
      <Suspense fallback={<p style={{ color: '#6b7280' }}>Carregando...</p>}>
        <ResetPasswordForm />
      </Suspense>
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
  title: { margin: 0, fontSize: 26, color: '#111827' },
  subtitle: { margin: '10px 0 20px', color: '#6b7280' },
  success: { margin: '14px 0', color: '#166534', background: '#dcfce7', padding: 14, borderRadius: 12 },
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
  },
  link: {
    display: 'block',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
    textDecoration: 'none',
    marginTop: 14,
  },
}

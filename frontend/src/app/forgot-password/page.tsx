'use client'

import { useState } from 'react'
import { API_URL } from '@/lib/config'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit() {
    if (!email) return alert('Digite seu e-mail.')

    try {
      setLoading(true)
      await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } catch {
      alert('Erro ao enviar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <h1 style={styles.title}>Recuperar senha</h1>

        {sent ? (
          <>
            <p style={styles.success}>
              Se este e-mail estiver cadastrado, você receberá as instruções em breve.
            </p>
            <a href="/login" style={styles.link}>Voltar para o login</a>
          </>
        ) : (
          <>
            <p style={styles.subtitle}>
              Digite seu e-mail e enviaremos um link para redefinir sua senha.
            </p>
            <input
              style={styles.input}
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button onClick={handleSubmit} style={styles.button}>
              {loading ? 'Enviando...' : 'Enviar link'}
            </button>
            <a href="/login" style={styles.link}>Voltar para o login</a>
          </>
        )}
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
    marginBottom: 14,
  },
  link: {
    display: 'block',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
    textDecoration: 'none',
  },
}

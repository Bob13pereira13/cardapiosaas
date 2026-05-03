'use client'

import { useEffect, useState } from 'react'

type UserConfig = {
  id: number
  nome: string
  email: string
  whatsapp: string | null
  slug: string
  logo: string | null
  banner?: string | null
  aberto?: boolean
  horarioAbertura?: string | null
  horarioFechamento?: string | null
  corPrimaria?: string | null
}

export default function ConfiguracoesPage() {
  const [user, setUser] = useState<UserConfig | null>(null)
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [slug, setSlug] = useState('')
  const [logo, setLogo] = useState('')
  const [banner, setBanner] = useState('')
  const [aberto, setAberto] = useState(true)
  const [horarioAbertura, setHorarioAbertura] = useState('')
  const [horarioFechamento, setHorarioFechamento] = useState('')
  const [corPrimaria, setCorPrimaria] = useState('#16a34a')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  async function carregarUsuario() {
    const token = localStorage.getItem('token')

    if (!token) {
      alert('Você precisa estar logado.')
      window.location.href = '/login'
      return
    }

    try {
      const res = await fetch('http://localhost:3000/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.message || 'Erro ao buscar usuário')
        return
      }

      setUser(data)
      setNome(data.nome || '')
      setWhatsapp(data.whatsapp || '')
      setSlug(data.slug || '')
      setLogo(data.logo || '')
      setBanner(data.banner || '')
      setAberto(data.aberto ?? true)
      setHorarioAbertura(data.horarioAbertura || '')
      setHorarioFechamento(data.horarioFechamento || '')
      setCorPrimaria(data.corPrimaria || '#16a34a')
    } catch (error) {
      console.error(error)
      alert('Erro ao carregar configurações.')
    } finally {
      setLoading(false)
    }
  }

  async function handleUploadLogo(file: File) {
    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.message || 'Erro ao enviar logo')
        return
      }

      setLogo(data.url)
    } catch (error) {
      console.error(error)
      alert('Erro ao enviar logo.')
    } finally {
      setUploading(false)
    }
  }

  async function handleUploadBanner(file: File) {
    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.message || 'Erro ao enviar banner')
        return
      }

      setBanner(data.url)
    } catch (error) {
      console.error(error)
      alert('Erro ao enviar banner.')
    } finally {
      setUploading(false)
    }
  }

  async function salvarConfiguracoes() {
    const token = localStorage.getItem('token')

    if (!token) {
      alert('Você precisa estar logado.')
      window.location.href = '/login'
      return
    }

    if (!nome || !slug) {
      return alert('Nome e slug são obrigatórios.')
    }

    try {
      setSaving(true)

      const res = await fetch('http://localhost:3000/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome,
          whatsapp,
          slug,
          logo,
          banner,
          aberto,
          horarioAbertura,
          horarioFechamento,
          corPrimaria,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.message || 'Erro ao salvar configurações')
        return
      }

      setUser(data)
      setNome(data.nome || '')
      setWhatsapp(data.whatsapp || '')
      setSlug(data.slug || '')
      setLogo(data.logo || '')
      setBanner(data.banner || '')
      setAberto(data.aberto ?? true)
      setHorarioAbertura(data.horarioAbertura || '')
      setHorarioFechamento(data.horarioFechamento || '')
      setCorPrimaria(data.corPrimaria || '#16a34a')

      alert('Configurações salvas com sucesso!')
    } catch (error) {
      console.error(error)
      alert('Erro ao salvar configurações.')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    carregarUsuario()
  }, [])

  if (loading) {
    return (
      <main style={styles.page}>
        <p style={styles.loading}>Carregando configurações...</p>
      </main>
    )
  }

  return (
    <main style={styles.page}>
      <aside style={styles.sidebar}>
        <h2 style={styles.logo}>Cardápio SaaS</h2>

        <nav style={styles.nav}>
          <a href="/dashboard" style={styles.navItem}>Dashboard</a>
          <a href="/dashboard" style={styles.navItem}>Produtos</a>
          <a href="/dashboard" style={styles.navItem}>Categorias</a>
          <a href="/dashboard/configuracoes" style={{ ...styles.navItemActive, background: corPrimaria }}>Configurações</a>
        </nav>
      </aside>

      <section style={styles.content}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Configurações</h1>
            <p style={styles.subtitle}>
              Gerencie os dados públicos do seu restaurante.
            </p>
          </div>

          {user?.slug && (
            <a href={`/cardapio/${user.slug}`} target="_blank" style={styles.publicButton}>
              Ver cardápio
            </a>
          )}
        </header>

        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Dados do restaurante</h2>

          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Nome do restaurante</label>
              <input style={styles.input} value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>

            <div>
              <label style={styles.label}>WhatsApp</label>
              <input style={styles.input} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>

            <div>
              <label style={styles.label}>Slug do cardápio</label>
              <input style={styles.input} value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
          </div>

          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Cor principal</label>
              <input
                type="color"
                style={styles.colorInput}
                value={corPrimaria}
                onChange={(e) => setCorPrimaria(e.target.value)}
              />
            </div>
          </div>

          {/* MELHORIA VISUAL */}
          <div style={styles.previewCard}>
            <strong>Preview do restaurante</strong>

            <div style={styles.previewContent}>
              {logo ? (
                <img src={logo} style={styles.previewLogo} />
              ) : (
                <div style={styles.previewLogoFallback}>
                  {nome ? nome.charAt(0).toUpperCase() : 'L'}
                </div>
              )}

              <div>
                <h3 style={{ margin: 0 }}>{nome || 'Seu restaurante'}</h3>
                <p style={{ margin: 0, color: aberto ? corPrimaria : '#991b1b' }}>
                  {aberto ? 'Aberto' : 'Fechado'}
                </p>
              </div>
            </div>
          </div>

          <div style={styles.logoBox}>
            <div>
              <label style={styles.label}>Logo do restaurante</label>

              <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUploadLogo(file)
              }} />

              {uploading && <p style={styles.helpText}>Enviando logo...</p>}
            </div>

            {logo ? (
              <img src={logo} style={styles.logoPreview} />
            ) : (
              <div style={styles.logoFallback}>
                {nome ? nome.charAt(0).toUpperCase() : 'L'}
              </div>
            )}
          </div>

          <div style={styles.logoBox}>
            <div>
              <label style={styles.label}>Banner do restaurante</label>

              <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUploadBanner(file)
              }} />

              {uploading && <p style={styles.helpText}>Enviando banner...</p>}
            </div>

            {banner && (
              <img src={banner} style={{ width: 220, height: 120, objectFit: 'cover', borderRadius: 12 }} />
            )}
          </div>

          <div style={styles.statusBox}>
            <div>
              <label style={styles.label}>Status do restaurante</label>

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={aberto}
                  onChange={(e) => setAberto(e.target.checked)}
                />
                Restaurante aberto
              </label>
            </div>
          </div>

          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Horário de abertura</label>
              <input type="time" style={styles.input} value={horarioAbertura} onChange={(e) => setHorarioAbertura(e.target.value)} />
            </div>

            <div>
              <label style={styles.label}>Horário de fechamento</label>
              <input type="time" style={styles.input} value={horarioFechamento} onChange={(e) => setHorarioFechamento(e.target.value)} />
            </div>
          </div>

          <div style={styles.previewBox}>
            <strong>Link público:</strong>
            <p style={{ ...styles.linkText, color: corPrimaria }}>
              http://localhost:3001/cardapio/{slug || 'seu-slug'}
            </p>
          </div>

          <button type="button" onClick={salvarConfiguracoes} style={{ ...styles.primaryButton, background: corPrimaria }}>
            {saving ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </section>
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', background: '#f3f4f6' },
  sidebar: { width: 260, background: '#111827', color: '#fff', padding: 24 },
  logo: { margin: 0, fontSize: 22 },
  nav: { marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 },
  navItem: { padding: 12, borderRadius: 12, background: '#1f2937', color: '#fff', textDecoration: 'none' },
  navItemActive: { padding: 12, borderRadius: 12, background: '#16a34a', color: '#fff', textDecoration: 'none' },
  content: { flex: 1, padding: 32 },
  header: { display: 'flex', justifyContent: 'space-between' },
  title: { margin: 0 },
  subtitle: { color: '#6b7280' },
  panel: { background: '#fff', padding: 24, borderRadius: 16, marginTop: 20 },
  panelTitle: { margin: 0 },
  formGrid: { display: 'grid', gap: 12, marginTop: 20 },
  label: { fontWeight: 'bold' },
  input: { padding: 10, borderRadius: 8, border: '1px solid #ccc' },
  colorInput: { width: 80, height: 42, padding: 4, borderRadius: 8, border: '1px solid #ccc' },
  logoBox: { marginTop: 20, display: 'flex', justifyContent: 'space-between' },
  statusBox: { marginTop: 20, display: 'flex', justifyContent: 'space-between' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 },
  logoPreview: { width: 100, height: 100, objectFit: 'cover' },
  logoFallback: { width: 100, height: 100, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  helpText: { fontSize: 12 },

  previewCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    background: '#f9fafb',
  },

  previewContent: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    marginTop: 10,
  },

  previewLogo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    objectFit: 'cover',
  },

  previewLogoFallback: {
    width: 60,
    height: 60,
    borderRadius: 12,
    background: '#ddd',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
  },

  previewBox: { marginTop: 20 },
  linkText: { color: '#16a34a' },
  primaryButton: { marginTop: 20, padding: 12, background: '#16a34a', color: '#fff', border: 0 },
  loading: { padding: 40 },
}
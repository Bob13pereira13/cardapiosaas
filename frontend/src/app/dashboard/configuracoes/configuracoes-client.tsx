'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { API_URL, APP_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'

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
  gtmId?: string | null
  ga4MeasurementId?: string | null
  metaPixelId?: string | null
  metaAccessTokenConfigured?: boolean
  customDomain?: string | null
  customDomainVerified?: boolean
  customDomainStatus?: string | null
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
  const [gtmId, setGtmId] = useState('')
  const [ga4MeasurementId, setGa4MeasurementId] = useState('')
  const [metaPixelId, setMetaPixelId] = useState('')
  const [metaAccessToken, setMetaAccessToken] = useState('')
  const [metaAccessTokenConfigured, setMetaAccessTokenConfigured] = useState(false)
  const [customDomain, setCustomDomain] = useState('')
  const [customDomainVerified, setCustomDomainVerified] = useState(false)
  const [customDomainStatus, setCustomDomainStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const carregarUsuario = useCallback(async () => {
    const token = getToken()

    if (!token) {
      window.location.href = '/login'
      return
    }

    try {
      const res = await fetch(`${API_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (handleUnauthorized(res)) return

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
      setGtmId(data.gtmId || '')
      setGa4MeasurementId(data.ga4MeasurementId || '')
      setMetaPixelId(data.metaPixelId || '')
      setMetaAccessToken('')
      setMetaAccessTokenConfigured(Boolean(data.metaAccessTokenConfigured))
      setCustomDomain(data.customDomain || '')
      setCustomDomainVerified(Boolean(data.customDomainVerified))
      setCustomDomainStatus(data.customDomainStatus || null)
    } catch (error) {
      console.error(error)
      alert('Erro ao carregar configurações.')
    } finally {
      setLoading(false)
    }
  }, [])

  async function handleUploadLogo(file: File) {
    try {
      setUploading(true)

      const token = getToken()
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
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

      const token = getToken()
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
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
    const token = getToken()

    if (!token) {
      window.location.href = '/login'
      return
    }

    if (!nome || !slug) {
      return alert('Nome e slug são obrigatórios.')
    }

    if (gtmId && !/^GTM-[A-Z0-9]+$/i.test(gtmId)) {
      return alert('GTM ID deve estar no formato GTM-XXXX.')
    }

    if (ga4MeasurementId && !/^G-[A-Z0-9]+$/i.test(ga4MeasurementId)) {
      return alert('GA4 Measurement ID deve estar no formato G-XXXX.')
    }

    if (metaPixelId && !/^\d+$/.test(metaPixelId)) {
      return alert('Meta Pixel ID deve conter apenas numeros.')
    }

    if (
      customDomain &&
      !/^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i.test(customDomain)
    ) {
      return alert('Dominio deve ser um hostname valido, como loja.seudominio.com.')
    }

    try {
      setSaving(true)
      const trackingPayload = metaAccessToken.trim()
        ? { metaAccessToken: metaAccessToken.trim() }
        : {}

      const res = await fetch(`${API_URL}/users/me`, {
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
          gtmId: gtmId.trim(),
          ga4MeasurementId: ga4MeasurementId.trim(),
          metaPixelId: metaPixelId.trim(),
          customDomain: customDomain.trim().toLowerCase(),
          ...trackingPayload,
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
      setGtmId(data.gtmId || '')
      setGa4MeasurementId(data.ga4MeasurementId || '')
      setMetaPixelId(data.metaPixelId || '')
      setMetaAccessToken('')
      setMetaAccessTokenConfigured(Boolean(data.metaAccessTokenConfigured))
      setCustomDomain(data.customDomain || '')
      setCustomDomainVerified(Boolean(data.customDomainVerified))
      setCustomDomainStatus(data.customDomainStatus || null)

      alert('Configurações salvas com sucesso!')
    } catch (error) {
      console.error(error)
      alert('Erro ao salvar configurações.')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void carregarUsuario()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [carregarUsuario])

  if (loading) {
    return (
      <p style={{ padding: 40, color: '#9ca3af' }}>Carregando configurações...</p>
    )
  }

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Configurações</h1>
          <p style={styles.subtitle}>Gerencie os dados públicos do seu restaurante.</p>
        </div>
        {user?.slug && (
          <a href={`/cardapio/${user.slug}`} target="_blank" style={{ ...styles.publicButton, background: corPrimaria }}>
            Ver cardápio ↗
          </a>
        )}
      </div>

      <section style={styles.panel}>
        <h2 style={styles.panelTitle}>Dados do restaurante</h2>

        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>Nome do restaurante</label>
            <input style={styles.input} value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>WhatsApp</label>
            <input style={styles.input} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+5511999999999" />
          </div>
          <div>
            <label style={styles.label}>Slug do cardápio</label>
            <input style={styles.input} value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Cor principal</label>
            <input type="color" style={styles.colorInput} value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} />
          </div>
        </div>

        <div style={styles.previewBox}>
          <strong style={{ fontSize: 13, color: '#6b7280' }}>Link público:</strong>
          <p style={{ margin: '4px 0 0', color: corPrimaria, fontWeight: '500' }}>
            {APP_URL}/cardapio/{slug || 'seu-slug'}
          </p>
        </div>

        <div style={styles.statusBox}>
          <label style={styles.label}>Status do restaurante</label>
          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={aberto} onChange={(e) => setAberto(e.target.checked)} style={{ marginRight: 8 }} />
            Restaurante aberto
          </label>
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
      </section>

      <section style={styles.panel}>
        <h2 style={styles.panelTitle}>Dominio proprio</h2>

        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>Dominio</label>
            <input
              style={styles.input}
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="cardapio.seudominio.com"
            />
          </div>
          <div>
            <label style={styles.label}>Status</label>
            <div style={styles.statusPill}>
              {customDomain
                ? customDomainVerified
                  ? 'Verificado'
                  : customDomainStatus || 'PENDING'
                : 'Nao configurado'}
            </div>
          </div>
        </div>

        <div style={styles.previewBox}>
          <strong style={{ fontSize: 13, color: '#6b7280' }}>DNS:</strong>
          <p style={styles.dnsText}>Subdominio: crie um CNAME apontando para o dominio principal do SaaS.</p>
          <p style={styles.dnsText}>Dominio raiz: crie um A record apontando para o IP da VPS.</p>
        </div>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.panelTitle}>Rastreamento e marketing</h2>

        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>Google Tag Manager</label>
            <input style={styles.input} value={gtmId} onChange={(e) => setGtmId(e.target.value)} placeholder="GTM-XXXX" />
          </div>
          <div>
            <label style={styles.label}>Google Analytics 4</label>
            <input style={styles.input} value={ga4MeasurementId} onChange={(e) => setGa4MeasurementId(e.target.value)} placeholder="G-XXXX" />
          </div>
          <div>
            <label style={styles.label}>Meta Pixel</label>
            <input style={styles.input} value={metaPixelId} onChange={(e) => setMetaPixelId(e.target.value)} placeholder="Pixel ID" />
          </div>
          <div>
            <label style={styles.label}>Meta CAPI Access Token</label>
            <input
              type="password"
              style={styles.input}
              value={metaAccessToken}
              onChange={(e) => setMetaAccessToken(e.target.value)}
              placeholder={metaAccessTokenConfigured ? 'Token configurado' : 'Access token'}
            />
          </div>
        </div>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.panelTitle}>Logo e banner</h2>

        <div style={styles.previewCard}>
          {logo
            ? <Image src={logo} width={52} height={52} style={styles.previewLogo} alt="logo" unoptimized />
            : <div style={styles.previewLogoFallback}>{nome ? nome.charAt(0).toUpperCase() : 'L'}</div>
          }
          <div>
            <p style={{ margin: 0, fontWeight: 'bold' }}>{nome || 'Seu restaurante'}</p>
            <p style={{ margin: 0, color: aberto ? corPrimaria : '#991b1b', fontSize: 13 }}>{aberto ? 'Aberto' : 'Fechado'}</p>
          </div>
        </div>

        <div style={styles.uploadRow}>
          <div>
            <label style={styles.label}>Logo</label>
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadLogo(f) }} />
            {uploading && <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Enviando...</p>}
          </div>
          {logo && <Image src={logo} width={90} height={90} style={styles.logoPreview} alt="logo preview" unoptimized />}
        </div>

        <div style={styles.uploadRow}>
          <div>
            <label style={styles.label}>Banner</label>
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadBanner(f) }} />
          </div>
          {banner && <Image src={banner} width={220} height={100} style={{ width: 220, height: 100, objectFit: 'cover', borderRadius: 12 }} alt="banner preview" unoptimized />}
        </div>
      </section>

      <button type="button" onClick={salvarConfiguracoes} style={{ ...styles.primaryButton, background: corPrimaria }}>
        {saving ? 'Salvando...' : 'Salvar configurações'}
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: { margin: 0, fontSize: 24, color: '#111827' },
  subtitle: { margin: '4px 0 0', color: '#6b7280', fontSize: 14 },
  publicButton: {
    display: 'inline-block',
    color: '#fff',
    padding: '10px 18px',
    borderRadius: 999,
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: 14,
  },
  panel: {
    background: '#fff',
    borderRadius: 20,
    padding: 22,
    boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
    marginBottom: 20,
  },
  panelTitle: { margin: '0 0 18px', fontSize: 18, color: '#111827' },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 16,
  },
  label: { display: 'block', fontWeight: '600', fontSize: 13, color: '#374151', marginBottom: 6 },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
  },
  colorInput: { width: 80, height: 42, padding: 4, borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer' },
  previewBox: { background: '#f9fafb', borderRadius: 10, padding: '12px 14px', marginBottom: 16 },
  dnsText: { margin: '6px 0 0', color: '#6b7280', fontSize: 13 },
  statusPill: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    fontSize: 14,
    boxSizing: 'border-box',
    color: '#374151',
    background: '#f9fafb',
  },
  statusBox: { marginBottom: 16 },
  checkboxLabel: { display: 'flex', alignItems: 'center', marginTop: 8, fontSize: 14, cursor: 'pointer' },
  previewCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#f9fafb',
    borderRadius: 12,
    padding: '12px 16px',
    marginBottom: 16,
  },
  previewLogo: { width: 52, height: 52, borderRadius: 10, objectFit: 'cover' },
  previewLogoFallback: {
    width: 52,
    height: 52,
    borderRadius: 10,
    background: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: 20,
    color: '#6b7280',
  },
  uploadRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  logoPreview: { width: 90, height: 90, objectFit: 'cover', borderRadius: 10 },
  primaryButton: {
    border: 0,
    color: '#fff',
    padding: '12px 28px',
    borderRadius: 999,
    fontWeight: 'bold',
    fontSize: 15,
    cursor: 'pointer',
  },
}

'use client'

import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'

type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'OVERDUE' | 'CANCELED'
type BillingType = 'PIX' | 'CREDIT_CARD'

type Account = {
  id: number
  nome: string
  email: string
  plan: string
  subscriptionStatus: SubscriptionStatus
  trialEndsAt?: string | null
}

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  TRIAL: 'Trial',
  ACTIVE: 'Ativa',
  OVERDUE: 'Em atraso',
  CANCELED: 'Cancelada',
}

const MONTHLY_VALUE = 99.9

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function trialDaysLeft(date?: string | null) {
  if (!date) return null
  return Math.max(
    0,
    Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  )
}

export default function AssinaturaPage() {
  const [account, setAccount] = useState<Account | null>(null)
  const [billingType, setBillingType] = useState<BillingType>('PIX')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [cardHolderName, setCardHolderName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCcv, setCardCcv] = useState('')
  const [holderCpfCnpj, setHolderCpfCnpj] = useState('')
  const [holderPhone, setHolderPhone] = useState('')
  const [holderPostalCode, setHolderPostalCode] = useState('')
  const [holderAddressNumber, setHolderAddressNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const token = getToken()
      if (!token) {
        window.location.href = '/login'
        return
      }

      const res = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (handleUnauthorized(res)) return

      const data: Account = await res.json()
      setAccount(data)
      setCardNumber('')
      setCardCcv('')
      setCardNumber('')
      setCardCcv('')
      setLoading(false)
    }
    load()
  }, [])

  async function handlePay() {
    if (!account) return
    const document = cpfCnpj.replace(/\D/g, '')
    if (document.length !== 11 && document.length !== 14) {
      setError('Informe um CPF ou CNPJ válido.')
      return
    }

    const holderDocument = holderCpfCnpj.replace(/\D/g, '')
    const [expiryMonth = '', expiryYearRaw = ''] = cardExpiry
      .replace(/\s/g, '')
      .split('/')
    const expiryYear =
      expiryYearRaw.length === 2 ? `20${expiryYearRaw}` : expiryYearRaw

    if (billingType === 'CREDIT_CARD') {
      if (
        !cardHolderName.trim() ||
        cardNumber.replace(/\D/g, '').length < 13 ||
        !expiryMonth ||
        !expiryYear ||
        cardCcv.replace(/\D/g, '').length < 3 ||
        (holderDocument.length !== 11 && holderDocument.length !== 14) ||
        holderPhone.replace(/\D/g, '').length < 10 ||
        !holderPostalCode.trim() ||
        !holderAddressNumber.trim()
      ) {
        setError('Preencha todos os dados do cartÃ£o corretamente.')
        return
      }
    }

    const token = getToken()
    if (!token) return

    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      const payload: Record<string, unknown> = {
        cpfCnpj: document,
        value: MONTHLY_VALUE,
        plan: account.plan || 'BASIC',
        billingType,
      }

      if (billingType === 'CREDIT_CARD') {
        payload.creditCard = {
          holderName: cardHolderName.trim(),
          number: cardNumber.replace(/\D/g, ''),
          expiryMonth,
          expiryYear,
          ccv: cardCcv.replace(/\D/g, ''),
        }
        payload.creditCardHolderInfo = {
          name: cardHolderName.trim(),
          email: account.email,
          cpfCnpj: holderDocument,
          postalCode: holderPostalCode.replace(/\D/g, ''),
          addressNumber: holderAddressNumber.trim(),
          addressComplement: null,
          phone: null,
          mobilePhone: holderPhone.replace(/\D/g, ''),
        }
      }

      const res = await fetch(`${API_URL}/billing/subscription/${account.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (handleUnauthorized(res)) return
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Não foi possível gerar a cobrança.')
        return
      }
      setAccount(data)
      setMessage('Cobrança gerada no Asaas. Após o pagamento, o webhook liberará o sistema automaticamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p style={styles.empty}>Carregando assinatura...</p>
  }

  if (!account) {
    return <p style={styles.empty}>Não foi possível carregar sua assinatura.</p>
  }

  const daysLeft = trialDaysLeft(account.trialEndsAt)

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Assinatura</h1>
          <p style={styles.subtitle}>Gerencie a cobrança mensal do restaurante.</p>
        </div>
      </div>

      <section style={styles.card}>
        <div style={styles.row}>
          <span style={styles.label}>Plano atual</span>
          <strong style={styles.value}>{account.plan || 'BASIC'}</strong>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Valor mensal</span>
          <strong style={styles.value}>{formatCurrency(MONTHLY_VALUE)}</strong>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Status</span>
          <strong style={styles.status}>{STATUS_LABEL[account.subscriptionStatus]}</strong>
        </div>
        {account.subscriptionStatus === 'TRIAL' && daysLeft !== null && (
          <div style={styles.notice}>
            Trial ativo: restam {daysLeft} dia{daysLeft === 1 ? '' : 's'}.
          </div>
        )}
        {account.subscriptionStatus === 'OVERDUE' && (
          <div style={styles.danger}>Assinatura vencida. Regularize para voltar a receber pedidos.</div>
        )}
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Regularizar pagamento</h2>
        <p style={styles.text}>
          A cobrança será criada no Asaas por Pix recorrente mensal.
        </p>
        <div style={styles.paymentOptions}>
          <button
            type="button"
            onClick={() => setBillingType('PIX')}
            style={{
              ...styles.paymentOption,
              ...(billingType === 'PIX' ? styles.paymentOptionActive : {}),
            }}
          >
            Pix
          </button>
          <button
            type="button"
            onClick={() => setBillingType('CREDIT_CARD')}
            style={{
              ...styles.paymentOption,
              ...(billingType === 'CREDIT_CARD' ? styles.paymentOptionActive : {}),
            }}
          >
            Cartão de crédito
          </button>
        </div>
        <input
          style={styles.input}
          placeholder="CPF/CNPJ do responsável *"
          value={cpfCnpj}
          onChange={(event) => setCpfCnpj(event.target.value)}
        />
        {billingType === 'CREDIT_CARD' && (
          <div style={styles.cardFields}>
            <input
              style={styles.input}
              placeholder="Nome impresso no cartão *"
              value={cardHolderName}
              onChange={(event) => setCardHolderName(event.target.value)}
              autoComplete="cc-name"
            />
            <input
              style={styles.input}
              placeholder="Número do cartão *"
              value={cardNumber}
              onChange={(event) => setCardNumber(event.target.value)}
              inputMode="numeric"
              autoComplete="cc-number"
            />
            <div style={styles.grid2}>
              <input
                style={styles.input}
                placeholder="Validade MM/AAAA *"
                value={cardExpiry}
                onChange={(event) => setCardExpiry(event.target.value)}
                autoComplete="cc-exp"
              />
              <input
                style={styles.input}
                placeholder="CVV *"
                value={cardCcv}
                onChange={(event) => setCardCcv(event.target.value)}
                inputMode="numeric"
                autoComplete="cc-csc"
              />
            </div>
            <input
              style={styles.input}
              placeholder="CPF/CNPJ do titular *"
              value={holderCpfCnpj}
              onChange={(event) => setHolderCpfCnpj(event.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Telefone do titular com DDD *"
              value={holderPhone}
              onChange={(event) => setHolderPhone(event.target.value)}
              inputMode="tel"
            />
            <div style={styles.grid2}>
              <input
                style={styles.input}
                placeholder="CEP do titular *"
                value={holderPostalCode}
                onChange={(event) => setHolderPostalCode(event.target.value)}
              />
              <input
                style={styles.input}
                placeholder="Número *"
                value={holderAddressNumber}
                onChange={(event) => setHolderAddressNumber(event.target.value)}
              />
            </div>
          </div>
        )}
        {error && <div style={styles.error}>{error}</div>}
        {message && <div style={styles.success}>{message}</div>}
        <button
          type="button"
          onClick={handlePay}
          disabled={submitting}
          style={{ ...styles.button, opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? 'Gerando cobrança...' : 'Pagar'}
        </button>
      </section>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    marginBottom: 20,
  },
  title: {
    margin: 0,
    fontSize: 24,
    color: '#111827',
  },
  subtitle: {
    margin: '4px 0 0',
    color: '#6b7280',
    fontSize: 14,
  },
  card: {
    background: '#fff',
    borderRadius: 18,
    padding: 22,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: 16,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    borderBottom: '1px solid #f3f4f6',
    padding: '12px 0',
  },
  label: {
    color: '#6b7280',
    fontSize: 14,
  },
  value: {
    color: '#111827',
  },
  status: {
    color: '#16a34a',
  },
  notice: {
    background: '#fef3c7',
    color: '#92400e',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    fontSize: 14,
    fontWeight: 'bold',
  },
  danger: {
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardTitle: {
    margin: '0 0 8px',
    color: '#111827',
    fontSize: 18,
  },
  text: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 14,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #d1d5db',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 14,
    marginBottom: 12,
  },
  paymentOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 10,
    marginBottom: 12,
  },
  paymentOption: {
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#374151',
    borderRadius: 12,
    padding: '12px 14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  paymentOptionActive: {
    borderColor: '#16a34a',
    background: '#dcfce7',
    color: '#166534',
  },
  cardFields: {
    display: 'flex',
    flexDirection: 'column',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 10,
  },
  button: {
    border: 0,
    background: '#16a34a',
    color: '#fff',
    borderRadius: 12,
    padding: '12px 18px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  error: {
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  success: {
    background: '#dcfce7',
    color: '#166534',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  empty: {
    color: '#9ca3af',
    textAlign: 'center',
    padding: '40px 0',
    fontSize: 15,
  },
}

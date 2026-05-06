import Link from 'next/link'

const plans = [
  { name: 'Grátis', price: 'R$ 0', features: ['Até 20 produtos', '1 cardápio', 'Sem pagamentos online'] },
  { name: 'Pro', price: 'R$ 97', features: ['Produtos ilimitados', 'PIX online', 'Relatórios'] },
  { name: 'Enterprise', price: 'Sob consulta', features: ['Multi-unidade', 'Domínio próprio', 'SLA'] },
]

export default function AdminPlanosPage() {
  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div><h1 style={styles.title}>Planos</h1><p style={styles.subtitle}>Catálogo comercial do SaaS</p></div>
        <div style={styles.actions}><Link style={styles.secondary} href="/admin/dashboard">Dashboard</Link><Link style={styles.link} href="/admin/planos/novo">Novo plano</Link></div>
      </header>
      <section style={styles.grid}>
        {plans.map((plan) => (
          <article key={plan.name} style={styles.card}>
            <h2 style={styles.cardTitle}>{plan.name}</h2>
            <strong style={styles.price}>{plan.price}</strong>
            <ul style={styles.list}>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
          </article>
        ))}
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f3f4f6', padding: 32, fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1100, margin: '0 auto 24px' },
  title: { margin: 0, fontSize: 28, color: '#111827' },
  subtitle: { margin: '4px 0 0', color: '#6b7280' },
  actions: { display: 'flex', gap: 8 },
  link: { background: '#111827', color: '#fff', padding: '10px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold' },
  secondary: { background: '#fff', color: '#111827', padding: '10px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold', border: '1px solid #d1d5db' },
  grid: { maxWidth: 1100, margin: '0 auto', display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' },
  card: { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 4px 14px rgba(0,0,0,0.06)' },
  cardTitle: { margin: 0, color: '#111827' },
  price: { display: 'block', marginTop: 8, fontSize: 28, color: '#111827' },
  list: { color: '#374151', paddingLeft: 18 },
}

export default function HomePage() {
  return (
    <main style={styles.page}>
      <nav style={styles.nav}>
        <span style={styles.brand}>Cardápio SaaS</span>
        <div style={styles.navLinks}>
          <a href="/login" style={styles.navLink}>Entrar</a>
          <a href="/cadastro" style={styles.navCta}>Criar conta grátis</a>
        </div>
      </nav>

      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>
          Cardápio digital para o seu restaurante
        </h1>
        <p style={styles.heroSub}>
          Crie seu cardápio online em minutos, compartilhe o link e receba pedidos pelo WhatsApp. Sem taxa por pedido.
        </p>
        <div style={styles.heroCtas}>
          <a href="/cadastro" style={styles.ctaPrimary}>Criar meu cardápio grátis</a>
          <a href="/cardapio/demo" style={styles.ctaSecondary}>Ver exemplo →</a>
        </div>
      </section>

      <section style={styles.features}>
        <div style={styles.feature}>
          <span style={styles.featureIcon}>📋</span>
          <h3 style={styles.featureTitle}>Cardápio sempre atualizado</h3>
          <p style={styles.featureText}>
            Adicione, edite e remova produtos a qualquer momento pelo painel. Mudanças refletem instantaneamente.
          </p>
        </div>

        <div style={styles.feature}>
          <span style={styles.featureIcon}>🛒</span>
          <h3 style={styles.featureTitle}>Pedidos via WhatsApp</h3>
          <p style={styles.featureText}>
            O cliente monta o pedido pelo cardápio e finaliza direto no seu WhatsApp, sem intermediários.
          </p>
        </div>

        <div style={styles.feature}>
          <span style={styles.featureIcon}>🎨</span>
          <h3 style={styles.featureTitle}>Personalização completa</h3>
          <p style={styles.featureText}>
            Logo, banner, cor principal, horários e URL única com o nome do seu restaurante.
          </p>
        </div>
      </section>

      <section style={styles.cta}>
        <h2 style={styles.ctaTitle}>Pronto para começar?</h2>
        <p style={styles.ctaText}>Crie sua conta e tenha seu cardápio no ar em menos de 5 minutos.</p>
        <a href="/cadastro" style={styles.ctaPrimary}>Criar conta grátis</a>
      </section>

      <footer style={styles.footer}>
        <p style={styles.footerText}>© 2026 Cardápio SaaS</p>
      </footer>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    fontFamily: 'Arial, sans-serif',
    background: '#fff',
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 32px',
    borderBottom: '1px solid #f1f5f9',
    position: 'sticky',
    top: 0,
    background: '#fff',
    zIndex: 10,
  },
  brand: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#16a34a',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },
  navLink: {
    color: '#6b7280',
    textDecoration: 'none',
    fontSize: 15,
  },
  navCta: {
    background: '#16a34a',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: 999,
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: 14,
  },
  hero: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '80px 24px 60px',
    textAlign: 'center',
  },
  heroTitle: {
    margin: 0,
    fontSize: 48,
    lineHeight: 1.15,
    color: '#111827',
    fontWeight: 'bold',
  },
  heroSub: {
    margin: '22px auto 0',
    maxWidth: 520,
    color: '#6b7280',
    fontSize: 18,
    lineHeight: 1.6,
  },
  heroCtas: {
    display: 'flex',
    justifyContent: 'center',
    gap: 16,
    marginTop: 36,
    flexWrap: 'wrap',
  },
  ctaPrimary: {
    background: '#16a34a',
    color: '#fff',
    padding: '16px 32px',
    borderRadius: 999,
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: 16,
    boxShadow: '0 8px 24px rgba(22,163,74,0.3)',
  },
  ctaSecondary: {
    background: '#f3f4f6',
    color: '#374151',
    padding: '16px 32px',
    borderRadius: 999,
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: 16,
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 28,
    maxWidth: 1000,
    margin: '0 auto',
    padding: '20px 24px 80px',
  },
  feature: {
    background: '#f9fafb',
    borderRadius: 24,
    padding: 28,
  },
  featureIcon: {
    fontSize: 36,
  },
  featureTitle: {
    margin: '14px 0 8px',
    fontSize: 20,
    color: '#111827',
  },
  featureText: {
    margin: 0,
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 1.6,
  },
  cta: {
    background: '#f0fdf4',
    padding: '60px 24px',
    textAlign: 'center',
  },
  ctaTitle: {
    margin: 0,
    fontSize: 32,
    color: '#111827',
  },
  ctaText: {
    margin: '14px auto 28px',
    color: '#6b7280',
    fontSize: 16,
    maxWidth: 420,
  },
  footer: {
    padding: '28px 24px',
    textAlign: 'center',
    borderTop: '1px solid #f1f5f9',
  },
  footerText: {
    margin: 0,
    color: '#9ca3af',
    fontSize: 14,
  },
}

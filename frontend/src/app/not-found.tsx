import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', paddingTop: 80, fontFamily: 'Arial, sans-serif' }}>
      <h2>Página não encontrada</h2>
      <Link href="/" style={{ color: '#16a34a' }}>Voltar ao início</Link>
    </div>
  )
}

'use client'

export const dynamic = 'force-dynamic'

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html>
      <body style={{ fontFamily: 'Arial, sans-serif', textAlign: 'center', paddingTop: 80 }}>
        <h2>Algo deu errado.</h2>
        <button
          onClick={reset}
          style={{ marginTop: 16, padding: '10px 24px', background: '#16a34a', color: '#fff', border: 0, borderRadius: 8, cursor: 'pointer' }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  )
}

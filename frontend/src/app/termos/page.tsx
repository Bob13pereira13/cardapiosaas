import Link from 'next/link'
import { Utensils } from 'lucide-react'

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-brand-red" />
          <span className="text-lg font-extrabold text-zinc-950">
            cardapio<span className="text-brand-red">.</span>pede<span className="text-brand-red">.</span>ai
          </span>
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold text-zinc-950">Termos de Uso</h1>
        <p className="mb-8 text-sm text-zinc-500">Última atualização: maio de 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-zinc-700">
          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-900">1. Uso do Serviço</h2>
            <p>
              Ao utilizar o cardapio.pede.ai, você concorda em usar a plataforma exclusivamente para fins legais e de acordo com estas condições. É proibido usar o serviço para atividades fraudulentas, spam ou qualquer prática que prejudique outros usuários.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-900">2. Cadastro e Conta</h2>
            <p>
              Você é responsável por manter a confidencialidade de sua senha e por todas as atividades realizadas em sua conta. Notifique-nos imediatamente sobre qualquer uso não autorizado.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-900">3. Responsabilidades do Restaurante</h2>
            <p>
              O proprietário do cardápio é responsável pela veracidade das informações cadastradas, incluindo preços, disponibilidade de produtos e dados de entrega. A plataforma não se responsabiliza por divergências entre o cardápio digital e os produtos oferecidos fisicamente.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-900">4. Pagamentos</h2>
            <p>
              Os pagamentos online são processados por gateways parceiros. O cardapio.pede.ai não armazena dados de cartão de crédito. As taxas de transação são informadas no momento da contratação do plano.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-900">5. Cancelamento</h2>
            <p>
              Você pode cancelar sua assinatura a qualquer momento. O acesso permanece ativo até o final do período pago. Após o cancelamento, os dados são mantidos por 30 dias e depois removidos permanentemente.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-900">6. Dados e Privacidade</h2>
            <p>
              O tratamento de dados pessoais é regido pela nossa{' '}
              <Link href="/privacidade" className="text-brand-red underline">
                Política de Privacidade
              </Link>
              , em conformidade com a LGPD.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-900">7. Modificações</h2>
            <p>
              Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações significativas serão comunicadas com pelo menos 15 dias de antecedência por e-mail.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t bg-white px-6 py-6 text-center text-sm text-zinc-500">
        <div className="flex justify-center gap-6">
          <Link href="/privacidade" className="hover:text-zinc-900">Privacidade</Link>
          <Link href="/suporte" className="hover:text-zinc-900">Contato</Link>
        </div>
      </footer>
    </div>
  )
}

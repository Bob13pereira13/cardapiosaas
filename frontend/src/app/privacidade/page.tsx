import Link from 'next/link'
import { Utensils } from 'lucide-react'

export default function PrivacidadePage() {
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
        <h1 className="mb-2 text-3xl font-bold text-zinc-950">Política de Privacidade</h1>
        <p className="mb-8 text-sm text-zinc-500">Última atualização: maio de 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-zinc-700">
          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-900">1. Coleta de Dados</h2>
            <p>
              Coletamos os dados fornecidos no cadastro (nome, e-mail, telefone), dados de uso da plataforma e informações dos pedidos realizados pelos clientes dos restaurantes cadastrados. Não vendemos seus dados a terceiros.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-900">2. Uso dos Dados</h2>
            <p>
              Seus dados são usados para operar e melhorar o serviço, processar pagamentos, enviar notificações relacionadas à conta e cumprir obrigações legais. Podemos enviar comunicações de marketing mediante consentimento.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-900">3. Cookies</h2>
            <p>
              Utilizamos cookies essenciais para manter sua sessão ativa e cookies analíticos para entender o uso da plataforma. Você pode desabilitar cookies analíticos nas configurações do seu navegador sem impacto no funcionamento do serviço.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-900">4. Compartilhamento</h2>
            <p>
              Compartilhamos dados apenas com parceiros essenciais para a operação: processadores de pagamento (Asaas), serviços de infraestrutura e, quando exigido, autoridades competentes. Todos os parceiros seguem políticas de privacidade compatíveis com a LGPD.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-900">5. LGPD — Seus Direitos</h2>
            <p>
              Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a: acessar seus dados, corrigir informações incorretas, solicitar a exclusão, revogar consentimentos e solicitar portabilidade. Entre em contato via{' '}
              <Link href="/suporte" className="text-brand-red underline">
                central de suporte
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-900">6. Retenção de Dados</h2>
            <p>
              Mantemos seus dados enquanto a conta estiver ativa. Após o cancelamento, os dados são retidos por 30 dias e depois excluídos, exceto quando a retenção for exigida por lei (ex.: dados fiscais).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-zinc-900">7. Contato</h2>
            <p>
              Para solicitações relacionadas a privacidade, acesse nossa{' '}
              <Link href="/suporte" className="text-brand-red underline">
                central de suporte
              </Link>{' '}
              ou envie um e-mail para privacidade@cardapiopedeai.com.br.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t bg-white px-6 py-6 text-center text-sm text-zinc-500">
        <div className="flex justify-center gap-6">
          <Link href="/termos" className="hover:text-zinc-900">Termos de Uso</Link>
          <Link href="/suporte" className="hover:text-zinc-900">Contato</Link>
        </div>
      </footer>
    </div>
  )
}

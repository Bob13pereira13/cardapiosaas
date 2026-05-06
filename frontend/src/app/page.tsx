import Link from 'next/link';
import { BarChart3, ClipboardList, QrCode, Store, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  { title: 'Cardapio digital', text: 'Produtos, categorias, adicionais e QR code publico.', icon: QrCode },
  { title: 'Gestao de pedidos', text: 'Painel em tempo real para acompanhar preparo e entrega.', icon: ClipboardList },
  { title: 'Relatorios', text: 'Resumo financeiro, produtos campeoes e horarios de maior venda.', icon: BarChart3 },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="border-b bg-white">
        <div className="mx-auto flex min-h-[82vh] max-w-7xl flex-col justify-between px-4 py-6 md:px-8">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-extrabold">
              <Utensils className="h-5 w-5 text-brand-red" />
              cardapio.pede.ai
            </Link>
            <Button asChild variant="outline">
              <Link href="/login">Entrar</Link>
            </Button>
          </nav>

          <div className="grid items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-wide text-brand-red">SaaS para restaurantes</p>
              <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
                Cardapio online, pedidos e relatorios em um painel simples.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-zinc-600">
                Venda por QR code, organize pedidos em tempo real e acompanhe os indicadores do restaurante sem depender de marketplace.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-brand-red hover:bg-brand-red/90">
                  <Link href="/auth/register">Comecar gratis</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/precos">Ver planos</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-zinc-950 p-4 text-white shadow-xl">
              <div className="rounded-md bg-white p-4 text-zinc-950">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="text-xs text-zinc-500">Hoje</p>
                    <p className="text-2xl font-black">R$ 1.842,90</p>
                  </div>
                  <Store className="h-8 w-8 text-brand-red" />
                </div>
                <div className="mt-4 space-y-3">
                  {['Pedido #128 confirmado', 'Pizza Calabresa saiu para entrega', 'QR Code copiado'].map((item) => (
                    <div key={item} className="rounded-md bg-zinc-100 px-3 py-3 text-sm font-medium">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-14 md:grid-cols-3 md:px-8">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title}>
              <CardHeader>
                <Icon className="h-6 w-6 text-brand-red" />
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-600">{feature.text}</CardContent>
            </Card>
          );
        })}
      </section>

      <section className="border-y bg-white">
        <div className="mx-auto grid max-w-5xl gap-4 px-4 py-14 md:grid-cols-2 md:px-8">
          <Card>
            <CardHeader>
              <CardTitle>Trial gratis 7 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">R$ 0</p>
              <p className="mt-2 text-sm text-zinc-600">Teste todos os recursos principais sem compromisso.</p>
            </CardContent>
          </Card>
          <Card className="border-brand-red">
            <CardHeader>
              <CardTitle>Profissional</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">Sob consulta</p>
              <p className="mt-2 text-sm text-zinc-600">Operacao completa para cardapio, pedidos, clientes e relatorios.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-zinc-600 md:flex-row md:items-center md:justify-between md:px-8">
        <span>cardapio.pede.ai</span>
        <div className="flex gap-4">
          <Link href="/privacidade">Politica de Privacidade</Link>
          <Link href="/contato">Contato</Link>
        </div>
      </footer>
    </main>
  );
}

'use client';

import type { FormEvent } from 'react';
import Image from 'next/image';
import { useEffect, useState, use, useRef } from 'react';
import { API_URL } from '@/lib/config';

type Product = {
  id: number;
  nome: string;
  descricao?: string | null;
  preco: number;
  imagem?: string | null;
};

type Category = {
  id: number;
  nome: string;
  products: Product[];
};

type Cardapio = {
  nome: string;
  whatsapp: string | null;
  slug: string;
  logo?: string | null;
  banner?: string | null;
  aberto?: boolean;
  horarioAbertura?: string | null;
  horarioFechamento?: string | null;
  corPrimaria?: string | null;
  categories: Category[];
};

type CartItem = Product & { quantidade: number };
type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH';
type DeliveryType = 'DELIVERY' | 'PICKUP';

function formatarPreco(valor: number) {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

function getErrorMessage(data: unknown) {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message = (data as { message: unknown }).message;
    if (Array.isArray(message)) return (message as string[]).join('\n');
    if (typeof message === 'string') return message;
  }
  return 'Não foi possível enviar o pedido.';
}

function verificarRestauranteAberto(
  abertoManual: boolean | undefined,
  horarioAbertura?: string | null,
  horarioFechamento?: string | null,
) {
  if (!horarioAbertura || !horarioFechamento) return abertoManual !== false;
  const agora = new Date();
  const horaAtual = agora.getHours() * 60 + agora.getMinutes();
  const [aH, aM] = horarioAbertura.split(':').map(Number);
  const [fH, fM] = horarioFechamento.split(':').map(Number);
  const abertura = aH * 60 + aM;
  const fechamento = fH * 60 + fM;
  if (abertura < fechamento) return horaAtual >= abertura && horaAtual <= fechamento;
  return horaAtual >= abertura || horaAtual <= fechamento;
}

export default function CardapioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [cardapio, setCardapio] = useState<Cardapio | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [carrinho, setCarrinho] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(`carrinho-${slug}`);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('DELIVERY');
  const [street, setStreet] = useState('');
  const [numero, setNumero] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [notes, setNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState<{ orderNumber?: number } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const sectionRefs = useRef<Record<number, HTMLElement | null>>({});

  useEffect(() => {
    localStorage.setItem(`carrinho-${slug}`, JSON.stringify(carrinho));
  }, [carrinho, slug]);

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch(`${API_URL}/public/cardapio/${slug}`);
        if (!res.ok) throw new Error('not found');
        setCardapio((await res.json()) as Cardapio);
      } catch {
        setCardapio(null);
      } finally {
        setLoading(false);
      }
    }
    void carregar();
  }, [slug]);

  useEffect(() => {
    if (!cardapio) return;
    const observers: IntersectionObserver[] = [];
    cardapio.categories.forEach((cat) => {
      const el = sectionRefs.current[cat.id];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveCategory(cat.id);
        },
        { rootMargin: '-40% 0px -55% 0px' },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((obs) => obs.disconnect());
  }, [cardapio]);

  function adicionarAoCarrinho(product: Product) {
    setCarrinho((items) => {
      const existente = items.find((i) => i.id === product.id);
      if (existente)
        return items.map((i) =>
          i.id === product.id ? { ...i, quantidade: i.quantidade + 1 } : i,
        );
      return [...items, { ...product, quantidade: 1 }];
    });
  }

  function alterarQuantidade(productId: number, delta: number) {
    setCarrinho((items) =>
      items
        .map((i) => (i.id === productId ? { ...i, quantidade: i.quantidade + delta } : i))
        .filter((i) => i.quantidade > 0),
    );
  }

  function limparCarrinho() {
    setCarrinho([]);
    localStorage.removeItem(`carrinho-${slug}`);
    setCarrinhoAberto(false);
    setOrderSuccess(null);
    setOrderError('');
  }

  function scrollParaCategoria(categoryId: number) {
    sectionRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveCategory(categoryId);
  }

  async function enviarPedido(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors: Record<string, boolean> = {};
    if (!customerName.trim()) errors.customerName = true;
    if (!customerPhone.trim()) errors.customerPhone = true;
    if (deliveryType === 'DELIVERY') {
      if (!street.trim()) errors.street = true;
      if (!numero.trim()) errors.numero = true;
      if (!neighborhood.trim()) errors.neighborhood = true;
      if (!city.trim()) errors.city = true;
      if (!zipcode.trim()) errors.zipcode = true;
    }
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setOrderError('Preencha os campos obrigatórios.');
      return;
    }

    if (carrinho.length === 0) {
      setOrderError('Adicione pelo menos um item ao pedido.');
      return;
    }

    try {
      setSubmittingOrder(true);
      setOrderError('');

      const body: Record<string, unknown> = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.replace(/[^\d+]/g, ''),
        deliveryType,
        paymentMethod,
        notes: notes.trim() || undefined,
        items: carrinho.map((i) => ({ productId: i.id, quantity: i.quantidade })),
      };

      if (deliveryType === 'DELIVERY') {
        body.customerAddress = {
          street: street.trim(),
          number: numero.trim(),
          complement: complement.trim() || undefined,
          neighborhood: neighborhood.trim(),
          city: city.trim(),
          zipcode: zipcode.trim(),
        };
      }

      const res = await fetch(`${API_URL}/public/orders/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data: unknown = await res.json();
      if (!res.ok) {
        setOrderError(getErrorMessage(data));
        return;
      }

      setCarrinho([]);
      localStorage.removeItem(`carrinho-${slug}`);
      setOrderSuccess(data as { orderNumber?: number });
    } catch {
      setOrderError('Erro ao enviar pedido. Tente novamente.');
    } finally {
      setSubmittingOrder(false);
    }
  }

  const total = carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0);
  const quantidadeTotal = carrinho.reduce((s, i) => s + i.quantidade, 0);

  // ── Loading skeleton ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="h-48 bg-gray-200 animate-pulse" />
        <div className="max-w-3xl mx-auto px-4 pt-4 space-y-3">
          <div className="h-7 w-48 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-10 bg-gray-200 rounded-2xl animate-pulse mt-6" />
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────
  if (!cardapio) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <span className="text-6xl">🍽️</span>
        <h1 className="text-2xl font-bold text-gray-800">Cardápio não encontrado</h1>
        <p className="text-gray-500 text-center">Verifique o link ou tente novamente.</p>
      </div>
    );
  }

  const restauranteAberto = verificarRestauranteAberto(
    cardapio.aberto,
    cardapio.horarioAbertura,
    cardapio.horarioFechamento,
  );
  const cor = cardapio.corPrimaria ?? '#16a34a';
  const whatsappHref = cardapio.whatsapp
    ? `https://wa.me/55${cardapio.whatsapp.replace(/\D/g, '')}`
    : null;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-32">

      {/* ── HEADER ── */}
      <header className="bg-white overflow-hidden rounded-b-3xl shadow-sm">
        <div className="relative h-48 sm:h-56 w-full overflow-hidden">
          {cardapio.banner ? (
            <Image
              src={cardapio.banner}
              alt="banner"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${cor}, ${cor}88)` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>

        <div className="max-w-3xl mx-auto px-4 pb-5">
          <div className="flex items-end justify-between -mt-10 mb-3">
            <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
              {cardapio.logo ? (
                <Image
                  src={cardapio.logo}
                  alt={cardapio.nome}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <span className="text-3xl font-bold" style={{ color: cor }}>
                  {cardapio.nome.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <span
              className={`mb-1 text-xs font-bold px-3 py-1.5 rounded-full ${
                restauranteAberto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {restauranteAberto ? '● Aberto agora' : '● Fechado'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{cardapio.nome}</h1>

          <div className="flex flex-wrap items-center gap-3 mt-2">
            {cardapio.horarioAbertura && cardapio.horarioFechamento && (
              <span className="text-sm text-gray-500">
                🕐 {cardapio.horarioAbertura} às {cardapio.horarioFechamento}
              </span>
            )}
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-full no-underline"
                style={{ backgroundColor: '#25D366' }}
              >
                📲 WhatsApp
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ── CLOSED ALERT ── */}
      {!restauranteAberto && (
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium px-4 py-3 rounded-2xl">
            ⏰ Restaurante fechado no momento. Você pode montar seu pedido, mas o envio está indisponível.
          </div>
        </div>
      )}

      {/* ── STICKY CATEGORY NAV ── */}
      {cardapio.categories.length > 0 && (
        <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm mt-2">
          <div className="max-w-3xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto">
            {cardapio.categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => scrollParaCategoria(cat.id)}
                className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border-2 cursor-pointer shrink-0"
                style={
                  activeCategory === cat.id
                    ? { backgroundColor: cor, color: '#fff', borderColor: cor }
                    : { backgroundColor: 'transparent', color: '#374151', borderColor: '#e5e7eb' }
                }
              >
                {cat.nome}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* ── PRODUCTS ── */}
      <div className="max-w-3xl mx-auto px-4">
        {cardapio.categories.length === 0 ? (
          <div className="mt-16 text-center">
            <span className="text-5xl">🍽️</span>
            <p className="text-gray-400 text-lg mt-3 font-medium">Nenhum item cadastrado ainda.</p>
          </div>
        ) : (
          cardapio.categories.map((category) => (
            <section
              key={category.id}
              id={`categoria-${category.id}`}
              ref={(el) => {
                sectionRefs.current[category.id] = el;
              }}
              className="pt-8"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span
                  className="w-1 h-5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: cor }}
                />
                {category.nome}
              </h2>

              <div className="flex flex-col gap-3">
                {category.products.map((product) => {
                  const qtyInCart = carrinho.find((i) => i.id === product.id)?.quantidade ?? 0;
                  return (
                    <article
                      key={product.id}
                      className="bg-white rounded-2xl p-4 flex gap-4 border border-gray-100 hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900 text-[15px] leading-snug">
                            {product.nome}
                          </h3>
                          {product.descricao && (
                            <p className="text-gray-500 text-sm mt-1 leading-relaxed line-clamp-2">
                              {product.descricao}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                          <span className="text-base font-bold shrink-0" style={{ color: cor }}>
                            {formatarPreco(product.preco)}
                          </span>

                          {qtyInCart > 0 ? (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => alterarQuantidade(product.id, -1)}
                                className="w-8 h-8 rounded-full border-2 font-bold text-lg flex items-center justify-center cursor-pointer bg-white"
                                style={{ borderColor: cor, color: cor }}
                              >
                                −
                              </button>
                              <span className="w-5 text-center font-bold text-gray-900 text-sm">
                                {qtyInCart}
                              </span>
                              <button
                                type="button"
                                onClick={() => adicionarAoCarrinho(product)}
                                className="w-8 h-8 rounded-full text-white font-bold text-lg flex items-center justify-center border-0 cursor-pointer"
                                style={{ backgroundColor: cor }}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => adicionarAoCarrinho(product)}
                              className="text-white font-semibold text-sm px-4 py-2 rounded-full border-0 cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                              style={{ backgroundColor: cor }}
                            >
                              Adicionar
                            </button>
                          )}
                        </div>
                      </div>

                      <div
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: `${cor}15` }}
                      >
                        {product.imagem ? (
                          <Image
                            src={product.imagem}
                            alt={product.nome}
                            width={112}
                            height={112}
                            className="object-cover w-full h-full"
                            unoptimized
                          />
                        ) : (
                          <span
                            className="text-4xl font-bold opacity-30"
                            style={{ color: cor }}
                          >
                            {product.nome.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {/* ── FLOATING CART BUTTON ── */}
      {carrinho.length > 0 && !carrinhoAberto && (
        <div className="fixed bottom-0 inset-x-0 p-4 z-40 pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <button
              type="button"
              onClick={() => setCarrinhoAberto(true)}
              className="w-full text-white rounded-2xl px-5 py-4 flex items-center justify-between font-bold text-sm border-0 cursor-pointer"
              style={{ backgroundColor: cor, boxShadow: `0 8px 32px ${cor}66` }}
            >
              <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-xs font-bold">
                {quantidadeTotal}
              </span>
              <span className="text-base font-bold">Ver pedido</span>
              <span className="font-bold">{formatarPreco(total)}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── CART DRAWER ── */}
      {carrinhoAberto && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCarrinhoAberto(false);
          }}
        >
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="w-10 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 shrink-0 sm:hidden" />

            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Seu pedido</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'} ·{' '}
                  {formatarPreco(total)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCarrinhoAberto(false)}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xl font-bold border-0 cursor-pointer hover:bg-gray-200 transition-colors"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* ── SUCCESS ── */}
              {orderSuccess ? (
                <div className="flex flex-col items-center px-6 py-10 gap-4 text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                    style={{ backgroundColor: `${cor}22` }}
                  >
                    ✅
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Pedido enviado!</h3>
                  {orderSuccess.orderNumber && (
                    <p className="text-gray-500">
                      Pedido{' '}
                      <strong className="text-gray-800">#{orderSuccess.orderNumber}</strong>{' '}
                      recebido com sucesso.
                    </p>
                  )}
                  {whatsappHref && (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-bold text-white px-5 py-3 rounded-2xl no-underline mt-2"
                      style={{ backgroundColor: '#25D366' }}
                    >
                      📲 Chamar no WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={limparCarrinho}
                    className="text-sm font-semibold border-0 bg-transparent cursor-pointer mt-1"
                    style={{ color: cor }}
                  >
                    Voltar ao cardápio
                  </button>
                </div>
              ) : (
                <>
                  {/* ── ITEMS ── */}
                  <div className="px-5 pt-4 pb-2 flex flex-col gap-2">
                    {carrinho.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {item.nome}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatarPreco(item.preco)} / un.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => alterarQuantidade(item.id, -1)}
                            className="w-7 h-7 rounded-full border border-gray-200 font-bold text-sm flex items-center justify-center cursor-pointer bg-white text-gray-600 hover:border-gray-400 transition-colors"
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-bold text-sm text-gray-900">
                            {item.quantidade}
                          </span>
                          <button
                            type="button"
                            onClick={() => alterarQuantidade(item.id, 1)}
                            className="w-7 h-7 rounded-full text-white font-bold text-sm flex items-center justify-center border-0 cursor-pointer"
                            style={{ backgroundColor: cor }}
                          >
                            +
                          </button>
                          <span className="text-sm font-bold text-gray-800 w-16 text-right">
                            {formatarPreco(item.preco * item.quantidade)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── TOTAL ── */}
                  <div className="mx-5 py-3 border-t-2 border-gray-100 flex justify-between items-center">
                    <span className="font-bold text-gray-800 text-base">Total</span>
                    <span className="font-bold text-xl" style={{ color: cor }}>
                      {formatarPreco(total)}
                    </span>
                  </div>

                  {/* ── CHECKOUT or CLOSED ── */}
                  {restauranteAberto ? (
                    <form
                      onSubmit={enviarPedido}
                      className="px-5 pb-8 flex flex-col gap-3"
                      noValidate
                    >
                      <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mt-2">
                        Finalizar pedido
                      </h3>

                      {/* Delivery toggle */}
                      <div className="grid grid-cols-2 gap-2">
                        {(['DELIVERY', 'PICKUP'] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setDeliveryType(type)}
                            className="py-3 rounded-xl font-semibold text-sm border-2 transition-all cursor-pointer"
                            style={
                              deliveryType === type
                                ? { backgroundColor: cor, color: '#fff', borderColor: cor }
                                : {
                                    backgroundColor: '#fff',
                                    color: '#6b7280',
                                    borderColor: '#e5e7eb',
                                  }
                            }
                          >
                            {type === 'DELIVERY' ? '🛵 Entrega' : '🏃 Retirada'}
                          </button>
                        ))}
                      </div>

                      {/* Name */}
                      <input
                        className={`border rounded-xl px-4 py-3 text-sm outline-none transition-all ${
                          fieldErrors.customerName
                            ? 'border-red-400 bg-red-50'
                            : 'border-gray-200 focus:border-gray-400'
                        }`}
                        placeholder="Nome completo *"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          setFieldErrors((f) => ({ ...f, customerName: false }));
                        }}
                      />

                      {/* Phone */}
                      <input
                        className={`border rounded-xl px-4 py-3 text-sm outline-none transition-all ${
                          fieldErrors.customerPhone
                            ? 'border-red-400 bg-red-50'
                            : 'border-gray-200 focus:border-gray-400'
                        }`}
                        placeholder="Telefone com DDD *"
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          setFieldErrors((f) => ({ ...f, customerPhone: false }));
                        }}
                      />

                      {/* Address — DELIVERY only */}
                      {deliveryType === 'DELIVERY' && (
                        <>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              className={`col-span-2 border rounded-xl px-4 py-3 text-sm outline-none transition-all ${
                                fieldErrors.street
                                  ? 'border-red-400 bg-red-50'
                                  : 'border-gray-200 focus:border-gray-400'
                              }`}
                              placeholder="Rua *"
                              value={street}
                              onChange={(e) => {
                                setStreet(e.target.value);
                                setFieldErrors((f) => ({ ...f, street: false }));
                              }}
                            />
                            <input
                              className={`border rounded-xl px-4 py-3 text-sm outline-none transition-all ${
                                fieldErrors.numero
                                  ? 'border-red-400 bg-red-50'
                                  : 'border-gray-200 focus:border-gray-400'
                              }`}
                              placeholder="Nº *"
                              value={numero}
                              onChange={(e) => {
                                setNumero(e.target.value);
                                setFieldErrors((f) => ({ ...f, numero: false }));
                              }}
                            />
                          </div>

                          <input
                            className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 transition-all"
                            placeholder="Complemento (opcional)"
                            value={complement}
                            onChange={(e) => setComplement(e.target.value)}
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className={`border rounded-xl px-4 py-3 text-sm outline-none transition-all ${
                                fieldErrors.neighborhood
                                  ? 'border-red-400 bg-red-50'
                                  : 'border-gray-200 focus:border-gray-400'
                              }`}
                              placeholder="Bairro *"
                              value={neighborhood}
                              onChange={(e) => {
                                setNeighborhood(e.target.value);
                                setFieldErrors((f) => ({ ...f, neighborhood: false }));
                              }}
                            />
                            <input
                              className={`border rounded-xl px-4 py-3 text-sm outline-none transition-all ${
                                fieldErrors.city
                                  ? 'border-red-400 bg-red-50'
                                  : 'border-gray-200 focus:border-gray-400'
                              }`}
                              placeholder="Cidade *"
                              value={city}
                              onChange={(e) => {
                                setCity(e.target.value);
                                setFieldErrors((f) => ({ ...f, city: false }));
                              }}
                            />
                          </div>

                          <input
                            className={`border rounded-xl px-4 py-3 text-sm outline-none transition-all ${
                              fieldErrors.zipcode
                                ? 'border-red-400 bg-red-50'
                                : 'border-gray-200 focus:border-gray-400'
                            }`}
                            placeholder="CEP *"
                            value={zipcode}
                            onChange={(e) => {
                              setZipcode(e.target.value);
                              setFieldErrors((f) => ({ ...f, zipcode: false }));
                            }}
                          />
                        </>
                      )}

                      {/* Payment */}
                      <select
                        className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none bg-white focus:border-gray-400 transition-all"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      >
                        <option value="PIX">💸 PIX</option>
                        <option value="CREDIT_CARD">💳 Cartão de crédito</option>
                        <option value="DEBIT_CARD">💳 Cartão de débito</option>
                        <option value="CASH">💵 Dinheiro</option>
                      </select>

                      {/* Notes */}
                      <textarea
                        className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none resize-none focus:border-gray-400 transition-all"
                        placeholder="Alguma observação? (opcional)"
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />

                      {/* Error */}
                      {orderError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
                          <span>⚠️</span>
                          <span>{orderError}</span>
                        </div>
                      )}

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={submittingOrder}
                        className="w-full text-white font-bold py-4 rounded-2xl mt-1 border-0 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 text-base transition-opacity"
                        style={{ backgroundColor: cor }}
                      >
                        {submittingOrder ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                            Enviando...
                          </>
                        ) : (
                          `Fazer pedido · ${formatarPreco(total)}`
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={limparCarrinho}
                        className="text-red-500 text-sm font-semibold text-center border-0 bg-transparent cursor-pointer py-1"
                      >
                        Limpar carrinho
                      </button>
                    </form>
                  ) : (
                    <div className="px-5 pb-6 flex flex-col gap-3">
                      <div className="bg-gray-100 text-gray-500 font-semibold text-center py-4 rounded-2xl text-sm">
                        Restaurante fechado no momento
                      </div>
                      <button
                        type="button"
                        onClick={limparCarrinho}
                        className="text-red-500 text-sm font-semibold text-center border-0 bg-transparent cursor-pointer py-2"
                      >
                        Limpar carrinho
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

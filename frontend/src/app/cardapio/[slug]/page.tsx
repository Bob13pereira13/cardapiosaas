'use client';

import type { FormEvent } from 'react';
import Image from 'next/image';
import { useCallback, useEffect, useState, use, useRef } from 'react';
import { API_URL } from '@/lib/config';

type Product = {
  id: number;
  nome: string;
  descricao?: string | null;
  preco: number;
  imagem?: string | null;
};

type TrackingItem = {
  item_id: number;
  item_name: string;
  price: number;
  quantity: number;
  item_category?: string;
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
  gtmId?: string | null;
  ga4MeasurementId?: string | null;
  metaPixelId?: string | null;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  customDomainStatus?: string | null;
  categories: Category[];
};

type CartItem = Product & { quantidade: number };
type PaymentMethod = 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'ONLINE_PIX';
type DeliveryType = 'DELIVERY' | 'PICKUP';
type CheckoutStep = 1 | 2 | 3;
type OrderSuccess = {
  orderNumber?: number;
  paymentMethod?: PaymentMethod;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
};

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

function pushDataLayer(event: string, data: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...data });
}

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
  const isCustomDomainRoute = slug === 'domain';

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ONLINE_PIX');
  const [customerDocument, setCustomerDocument] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState<OrderSuccess | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const sectionRefs = useRef<Record<number, HTMLElement | null>>({});
  const viewedProductsRef = useRef<Set<number>>(new Set());
  const viewedListRef = useRef(false);

  const findProductCategory = useCallback((productId: number) => {
    return cardapio?.categories.find((category) =>
      category.products.some((product) => product.id === productId),
    );
  }, [cardapio]);

  const buildTrackingItem = useCallback((product: Product, quantity = 1): TrackingItem => {
    const category = findProductCategory(product.id);

    return {
      item_id: product.id,
      item_name: product.nome,
      price: product.preco,
      quantity,
      item_category: category?.nome,
    };
  }, [findProductCategory]);

  const buildCartTrackingItems = useCallback((items = carrinho) => {
    return items.map((item) => buildTrackingItem(item, item.quantidade));
  }, [buildTrackingItem, carrinho]);

  const getTrackingUser = useCallback(() => {
    return {
      phone: customerPhone.replace(/[^\d+]/g, ''),
      document: customerDocument.replace(/\D/g, ''),
      city: city.trim(),
    };
  }, [city, customerDocument, customerPhone]);

  const trackMetaPixel = useCallback((eventName: string, value: number, items: TrackingItem[]) => {
    if (!cardapio?.metaPixelId || typeof window === 'undefined' || !window.fbq) return;

    const eventMap: Record<string, string> = {
      view_item: 'ViewContent',
      add_to_cart: 'AddToCart',
      begin_checkout: 'InitiateCheckout',
      purchase: 'Purchase',
    };
    const metaEventName = eventMap[eventName];
    if (!metaEventName) return;

    window.fbq('track', metaEventName, {
      currency: 'BRL',
      value,
      content_type: 'product',
      content_ids: items.map((item) => String(item.item_id)),
      contents: items.map((item) => ({
        id: String(item.item_id),
        quantity: item.quantity,
        item_price: item.price,
      })),
    });
  }, [cardapio?.metaPixelId]);

  const sendMetaCapi = useCallback((eventName: string, value: number, items: TrackingItem[]) => {
    if (!cardapio?.metaPixelId) return;

    void fetch(`${API_URL}/tracking/meta/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: cardapio?.slug || slug,
        event_name: eventName,
        event_source_url: typeof window !== 'undefined' ? window.location.href : undefined,
        currency: 'BRL',
        value,
        items,
        user: getTrackingUser(),
      }),
    }).catch(() => undefined);
  }, [cardapio?.metaPixelId, cardapio?.slug, getTrackingUser, slug]);

  const trackEcommerceEvent = useCallback((
    event: string,
    value: number,
    items: TrackingItem[],
    options: { sendCapi?: boolean; includeUser?: boolean } = {},
  ) => {
    pushDataLayer(event, {
      ecommerce: {
        currency: 'BRL',
        value,
        items,
      },
      ...(options.includeUser ? { user: getTrackingUser() } : {}),
    });

    trackMetaPixel(event, value, items);

    if (options.sendCapi) {
      const eventMap: Record<string, string> = {
        add_to_cart: 'AddToCart',
        begin_checkout: 'InitiateCheckout',
        purchase: 'Purchase',
      };
      const metaEventName = eventMap[event];
      if (metaEventName) sendMetaCapi(metaEventName, value, items);
    }
  }, [getTrackingUser, sendMetaCapi, trackMetaPixel]);

  useEffect(() => {
    localStorage.setItem(`carrinho-${slug}`, JSON.stringify(carrinho));
  }, [carrinho, slug]);

  useEffect(() => {
    async function carregar() {
      try {
        const headers: HeadersInit = {};
        if (isCustomDomainRoute && typeof window !== 'undefined') {
          headers['x-cardapio-host'] = window.location.host;
        }

        const res = await fetch(`${API_URL}/public/cardapio/${slug}`, { headers });
        if (!res.ok) throw new Error('not found');
        setCardapio((await res.json()) as Cardapio);
      } catch {
        setCardapio(null);
      } finally {
        setLoading(false);
      }
    }
    void carregar();
  }, [isCustomDomainRoute, slug]);

  useEffect(() => {
    if (!cardapio || typeof window === 'undefined') return;

    window.dataLayer = window.dataLayer || [];

    if (cardapio.gtmId && !document.getElementById('restaurant-gtm')) {
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      const script = document.createElement('script');
      script.id = 'restaurant-gtm';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${cardapio.gtmId}`;
      document.head.appendChild(script);
    }

    if (cardapio.ga4MeasurementId && !document.getElementById('restaurant-ga4')) {
      const script = document.createElement('script');
      script.id = 'restaurant-ga4';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${cardapio.ga4MeasurementId}`;
      document.head.appendChild(script);
      window.gtag = (...args: unknown[]) => window.dataLayer.push(args);
      window.gtag('js', new Date());
      window.gtag('config', cardapio.ga4MeasurementId);
    }

    if (cardapio.metaPixelId && !document.getElementById('restaurant-meta-pixel')) {
      const script = document.createElement('script');
      script.id = 'restaurant-meta-pixel';
      script.text = `
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
        (window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${cardapio.metaPixelId}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);
    }
  }, [cardapio]);

  useEffect(() => {
    if (!cardapio || viewedListRef.current) return;
    viewedListRef.current = true;

    const items = cardapio.categories.flatMap((category) =>
      category.products.map((product) => ({
        item_id: product.id,
        item_name: product.nome,
        price: product.preco,
        quantity: 1,
        item_category: category.nome,
      })),
    );

    trackEcommerceEvent(
      'view_item_list',
      items.reduce((sum, item) => sum + item.price, 0),
      items,
    );
  }, [cardapio, trackEcommerceEvent]);

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

  useEffect(() => {
    if (!cardapio || typeof document === 'undefined') return;
    const cards = document.querySelectorAll<HTMLElement>('[data-tracking-product-id]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const productId = Number(entry.target.getAttribute('data-tracking-product-id'));
          if (!productId || viewedProductsRef.current.has(productId)) return;

          const category = findProductCategory(productId);
          const product = category?.products.find((item) => item.id === productId);
          if (!product) return;

          viewedProductsRef.current.add(productId);
          trackEcommerceEvent('view_item', product.preco, [buildTrackingItem(product)]);
        });
      },
      { threshold: 0.6 },
    );

    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [cardapio, buildTrackingItem, findProductCategory, trackEcommerceEvent]);

  function adicionarAoCarrinho(product: Product) {
    const trackingItem = buildTrackingItem(product);
    trackEcommerceEvent('add_to_cart', product.preco, [trackingItem], { sendCapi: true });

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
    const item = carrinho.find((cartItem) => cartItem.id === productId);
    if (item && delta < 0) {
      trackEcommerceEvent('remove_from_cart', item.preco, [buildTrackingItem(item)]);
    }

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
    setCheckoutStep(1);
  }

  function abrirCheckout() {
    trackEcommerceEvent('begin_checkout', total, buildCartTrackingItems(), {
      sendCapi: true,
      includeUser: true,
    });
    setCarrinhoAberto(true);
  }

  function scrollParaCategoria(categoryId: number) {
    sectionRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveCategory(categoryId);
  }

  function getDeliveryErrors() {
    const errors: Record<string, boolean> = {};
    if (!customerName.trim()) errors.customerName = true;
    if (!customerPhone.trim()) errors.customerPhone = true;
    if (!customerDocument.trim()) errors.customerDocument = true;
    if (deliveryType === 'DELIVERY') {
      if (!street.trim()) errors.street = true;
      if (!numero.trim()) errors.numero = true;
      if (!neighborhood.trim()) errors.neighborhood = true;
      if (!city.trim()) errors.city = true;
      if (!zipcode.trim()) errors.zipcode = true;
    }
    return errors;
  }

  function continuarEntrega() {
    const errors = getDeliveryErrors();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setOrderError('Preencha os campos obrigatÃ³rios.');
      setCheckoutStep(1);
      return;
    }
    setOrderError('');
    setCheckoutStep(2);
  }

  function continuarPagamento() {
    setOrderError('');
    setCheckoutStep(3);
  }

  async function enviarPedido(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = getDeliveryErrors();
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
      const trackingItems = buildCartTrackingItems();
      const trackingTotal = total;

      const body: Record<string, unknown> = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.replace(/[^\d+]/g, ''),
        deliveryType,
        paymentMethod,
        customerDocument: customerDocument.replace(/\D/g, '') || undefined,
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

      const orderUrl = isCustomDomainRoute
        ? `${API_URL}/public/orders/by-host`
        : `${API_URL}/public/orders/${slug}`;
      const orderHeaders: HeadersInit = { 'Content-Type': 'application/json' };
      if (isCustomDomainRoute && typeof window !== 'undefined') {
        orderHeaders['x-cardapio-host'] = window.location.host;
      }

      const res = await fetch(orderUrl, {
        method: 'POST',
        headers: orderHeaders,
        body: JSON.stringify(body),
      });

      const data: unknown = await res.json();
      if (!res.ok) {
        setOrderError(getErrorMessage(data));
        return;
      }

      trackEcommerceEvent('purchase', trackingTotal, trackingItems, {
        sendCapi: true,
        includeUser: true,
      });
      setCarrinho([]);
      localStorage.removeItem(`carrinho-${slug}`);
      setOrderSuccess(data as OrderSuccess);
    } catch {
      setOrderError('Erro ao enviar pedido. Tente novamente.');
    } finally {
      setSubmittingOrder(false);
    }
  }

  const total = carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0);
  const quantidadeTotal = carrinho.reduce((s, i) => s + i.quantidade, 0);
  const checkoutBlue = '#2563eb';
  const paymentLabel: Record<PaymentMethod, string> = {
    ONLINE_PIX: 'Pix automÃ¡tico',
    CASH: 'Dinheiro',
    CREDIT_CARD: 'CartÃ£o de crÃ©dito',
    DEBIT_CARD: 'CartÃ£o de dÃ©bito',
  };
  const enderecoResumo =
    deliveryType === 'DELIVERY'
      ? [street, numero, complement, neighborhood, city, zipcode]
          .filter(Boolean)
          .join(', ')
      : '';

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
                      data-tracking-product-id={product.id}
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
              onClick={abrirCheckout}
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
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="w-10 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 shrink-0 sm:hidden" />

            <div className="flex items-center justify-between px-5 py-4 shrink-0">
              <button
                type="button"
                onClick={() =>
                  checkoutStep === 1
                    ? setCarrinhoAberto(false)
                    : setCheckoutStep((checkoutStep - 1) as CheckoutStep)
                }
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 text-xl font-bold border-0 cursor-pointer"
                aria-label="Voltar"
              >
                ←
              </button>
              <div className="hidden">
                <h2 className="text-xl font-bold text-gray-900">Seu pedido</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'} ·{' '}
                  {formatarPreco(total)}
                </p>
              </div>
              <h2 className="text-lg font-bold text-gray-950">Checkout</h2>
              <button
                type="button"
                onClick={() => setCarrinhoAberto(false)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 text-xl font-bold border-0 cursor-pointer"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="px-5 pb-4 shrink-0">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { step: 1 as CheckoutStep, label: 'Entrega' },
                  { step: 2 as CheckoutStep, label: 'Pagamento' },
                  { step: 3 as CheckoutStep, label: 'Confirmação' },
                ].map((item) => (
                  <div key={item.step} className="flex flex-col gap-2">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        backgroundColor: checkoutStep >= item.step ? checkoutBlue : '#e5e7eb',
                      }}
                    />
                    <span
                      className="text-[11px] font-bold text-center"
                      style={{ color: checkoutStep === item.step ? checkoutBlue : '#9ca3af' }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {orderSuccess ? (
                orderSuccess.paymentMethod === 'ONLINE_PIX' &&
                orderSuccess.pixQrCode &&
                orderSuccess.pixCopyPaste ? (
                  <div className="flex flex-col items-center px-6 py-8 gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-3xl text-blue-600">
                      ✓
                    </div>
                    <h3 className="text-2xl font-bold text-gray-950">Aguardando pagamento</h3>
                    {orderSuccess.orderNumber && (
                      <p className="text-sm text-gray-500">
                        Pedido{' '}
                        <strong className="text-gray-800">#{orderSuccess.orderNumber}</strong>
                      </p>
                    )}
                    <div className="w-full flex flex-col items-center gap-3 rounded-2xl bg-gray-100 p-4">
                      <Image
                        src={`data:image/png;base64,${orderSuccess.pixQrCode}`}
                        alt="QR Code Pix"
                        width={190}
                        height={190}
                        className="rounded-2xl bg-white p-2"
                      />
                      <textarea
                        className="w-full min-h-24 border border-gray-200 rounded-2xl px-3 py-3 text-xs text-gray-700 bg-white resize-none outline-none"
                        value={orderSuccess.pixCopyPaste}
                        readOnly
                      />
                    </div>
                    <button
                      type="button"
                      onClick={limparCarrinho}
                      className="text-sm font-bold border-0 bg-transparent cursor-pointer mt-1 text-blue-600"
                    >
                      Voltar ao cardápio
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center px-6 py-10 gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-3xl text-blue-600">
                      ✓
                    </div>
                    <h3 className="text-2xl font-bold text-gray-950">Pedido enviado!</h3>
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
                        Chamar no WhatsApp
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={limparCarrinho}
                      className="text-sm font-bold border-0 bg-transparent cursor-pointer mt-1 text-blue-600"
                    >
                      Voltar ao cardápio
                    </button>
                  </div>
                )
              ) : restauranteAberto ? (
                <form onSubmit={enviarPedido} className="px-5 pb-8" noValidate>
                  {checkoutStep === 1 && (
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-2">
                        {(['DELIVERY', 'PICKUP'] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setDeliveryType(type)}
                            className="py-4 rounded-2xl font-bold text-sm border-0 transition-all cursor-pointer"
                            style={
                              deliveryType === type
                                ? { backgroundColor: checkoutBlue, color: '#fff' }
                                : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                            }
                          >
                            {type === 'DELIVERY' ? 'Entrega' : 'Retirada'}
                          </button>
                        ))}
                      </div>

                      <input
                        className={`border rounded-2xl px-4 py-4 text-sm outline-none transition-all ${
                          fieldErrors.customerName
                            ? 'border-red-400 bg-red-50'
                            : 'border-gray-200 bg-gray-50 focus:border-blue-500'
                        }`}
                        placeholder="Nome *"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          setFieldErrors((f) => ({ ...f, customerName: false }));
                        }}
                      />
                      <input
                        className={`border rounded-2xl px-4 py-4 text-sm outline-none transition-all ${
                          fieldErrors.customerPhone
                            ? 'border-red-400 bg-red-50'
                            : 'border-gray-200 bg-gray-50 focus:border-blue-500'
                        }`}
                        placeholder="Telefone *"
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          setFieldErrors((f) => ({ ...f, customerPhone: false }));
                        }}
                      />
                      <input
                        className={`border rounded-2xl px-4 py-4 text-sm outline-none transition-all ${
                          fieldErrors.customerDocument
                            ? 'border-red-400 bg-red-50'
                            : 'border-gray-200 bg-gray-50 focus:border-blue-500'
                        }`}
                        placeholder="CPF/CNPJ *"
                        value={customerDocument}
                        onChange={(e) => {
                          setCustomerDocument(e.target.value);
                          setFieldErrors((f) => ({ ...f, customerDocument: false }));
                        }}
                      />

                      {deliveryType === 'DELIVERY' && (
                        <>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              className={`col-span-2 border rounded-2xl px-4 py-4 text-sm outline-none transition-all ${
                                fieldErrors.street
                                  ? 'border-red-400 bg-red-50'
                                  : 'border-gray-200 bg-gray-50 focus:border-blue-500'
                              }`}
                              placeholder="Rua *"
                              value={street}
                              onChange={(e) => {
                                setStreet(e.target.value);
                                setFieldErrors((f) => ({ ...f, street: false }));
                              }}
                            />
                            <input
                              className={`border rounded-2xl px-4 py-4 text-sm outline-none transition-all ${
                                fieldErrors.numero
                                  ? 'border-red-400 bg-red-50'
                                  : 'border-gray-200 bg-gray-50 focus:border-blue-500'
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
                            className="border border-gray-200 bg-gray-50 rounded-2xl px-4 py-4 text-sm outline-none focus:border-blue-500 transition-all"
                            placeholder="Complemento"
                            value={complement}
                            onChange={(e) => setComplement(e.target.value)}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className={`border rounded-2xl px-4 py-4 text-sm outline-none transition-all ${
                                fieldErrors.neighborhood
                                  ? 'border-red-400 bg-red-50'
                                  : 'border-gray-200 bg-gray-50 focus:border-blue-500'
                              }`}
                              placeholder="Bairro *"
                              value={neighborhood}
                              onChange={(e) => {
                                setNeighborhood(e.target.value);
                                setFieldErrors((f) => ({ ...f, neighborhood: false }));
                              }}
                            />
                            <input
                              className={`border rounded-2xl px-4 py-4 text-sm outline-none transition-all ${
                                fieldErrors.city
                                  ? 'border-red-400 bg-red-50'
                                  : 'border-gray-200 bg-gray-50 focus:border-blue-500'
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
                            className={`border rounded-2xl px-4 py-4 text-sm outline-none transition-all ${
                              fieldErrors.zipcode
                                ? 'border-red-400 bg-red-50'
                                : 'border-gray-200 bg-gray-50 focus:border-blue-500'
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

                      {orderError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-2xl">
                          {orderError}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={continuarEntrega}
                        className="w-full text-white font-bold py-4 rounded-2xl mt-2 border-0 cursor-pointer text-sm"
                        style={{ backgroundColor: checkoutBlue }}
                      >
                        CONTINUAR
                      </button>
                    </div>
                  )}

                  {checkoutStep === 2 && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <h3 className="text-sm font-bold text-gray-950 mb-2">Pagar online</h3>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('ONLINE_PIX')}
                          className="w-full rounded-2xl border-0 px-4 py-4 flex items-center justify-between text-left cursor-pointer"
                          style={{
                            backgroundColor:
                              paymentMethod === 'ONLINE_PIX' ? '#dbeafe' : '#f3f4f6',
                          }}
                        >
                          <span className="font-bold text-gray-900">Pix automático</span>
                          <span className="text-xs font-bold text-white px-3 py-1 rounded-full bg-blue-600">
                            Mais usado
                          </span>
                        </button>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-gray-950 mb-2">Pagar na entrega</h3>
                        <div className="flex flex-col gap-2">
                          {[
                            { value: 'CASH' as PaymentMethod, label: 'Dinheiro' },
                            { value: 'CREDIT_CARD' as PaymentMethod, label: 'Cartão de crédito' },
                            { value: 'DEBIT_CARD' as PaymentMethod, label: 'Cartão de débito' },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setPaymentMethod(option.value)}
                              className="w-full rounded-2xl border-0 px-4 py-4 flex items-center justify-between text-left cursor-pointer"
                              style={{
                                backgroundColor:
                                  paymentMethod === option.value ? '#dbeafe' : '#f3f4f6',
                              }}
                            >
                              <span className="font-bold text-gray-900">{option.label}</span>
                              <span
                                className="w-5 h-5 rounded-full border-2"
                                style={{
                                  borderColor:
                                    paymentMethod === option.value ? checkoutBlue : '#d1d5db',
                                  backgroundColor:
                                    paymentMethod === option.value ? checkoutBlue : '#fff',
                                }}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-dashed border-gray-300 pt-4 flex flex-col gap-2">
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>Subtotal</span>
                          <span>{formatarPreco(total)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-gray-950">
                          <span>Total</span>
                          <span>{formatarPreco(total)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={continuarPagamento}
                        className="w-full text-white font-bold py-4 rounded-2xl border-0 cursor-pointer text-sm"
                        style={{ backgroundColor: checkoutBlue }}
                      >
                        CONTINUAR
                      </button>
                    </div>
                  )}

                  {checkoutStep === 3 && (
                    <div className="flex flex-col gap-4">
                      <div className="rounded-2xl bg-gray-100 p-4 flex flex-col gap-2">
                        <h3 className="text-sm font-bold text-gray-950">Cliente</h3>
                        <p className="text-sm text-gray-600">{customerName}</p>
                        <p className="text-sm text-gray-600">{customerPhone}</p>
                        <p className="text-sm text-gray-600">{customerDocument}</p>
                      </div>

                      <div className="rounded-2xl bg-gray-100 p-4 flex flex-col gap-2">
                        <h3 className="text-sm font-bold text-gray-950">
                          {deliveryType === 'DELIVERY' ? 'Entrega' : 'Retirada'}
                        </h3>
                        {deliveryType === 'DELIVERY' && (
                          <p className="text-sm text-gray-600">{enderecoResumo}</p>
                        )}
                      </div>

                      <div className="rounded-2xl bg-gray-100 p-4 flex flex-col gap-2">
                        <h3 className="text-sm font-bold text-gray-950">Pagamento</h3>
                        <p className="text-sm text-gray-600">{paymentLabel[paymentMethod]}</p>
                      </div>

                      <div className="rounded-2xl bg-gray-100 p-4 flex flex-col gap-3">
                        <h3 className="text-sm font-bold text-gray-950">Itens do pedido</h3>
                        {carrinho.map((item) => (
                          <div key={item.id} className="flex justify-between gap-3 text-sm">
                            <span className="text-gray-700">
                              {item.quantidade}x {item.nome}
                            </span>
                            <span className="font-bold text-gray-900">
                              {formatarPreco(item.preco * item.quantidade)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-dashed border-gray-300 pt-4 flex flex-col gap-2">
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>Subtotal</span>
                          <span>{formatarPreco(total)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-gray-950">
                          <span>Total</span>
                          <span>{formatarPreco(total)}</span>
                        </div>
                      </div>

                      {orderError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-2xl">
                          {orderError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={submittingOrder}
                        className="w-full text-white font-bold py-4 rounded-2xl border-0 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
                        style={{ backgroundColor: checkoutBlue }}
                      >
                        {submittingOrder ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                            Enviando...
                          </>
                        ) : (
                          'FAZER PEDIDO'
                        )}
                      </button>
                    </div>
                  )}
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
            </div>

            <div className="hidden">
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
                  {orderSuccess.paymentMethod === 'ONLINE_PIX' &&
                    orderSuccess.pixQrCode &&
                    orderSuccess.pixCopyPaste && (
                      <div className="w-full flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-sm font-bold text-gray-700">Aguardando pagamento</p>
                        <Image
                          src={`data:image/png;base64,${orderSuccess.pixQrCode}`}
                          alt="QR Code Pix"
                          width={180}
                          height={180}
                          className="rounded-xl bg-white p-2"
                        />
                        <textarea
                          className="w-full min-h-24 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 bg-white resize-none"
                          value={orderSuccess.pixCopyPaste}
                          readOnly
                        />
                      </div>
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
                        <option value="ONLINE_PIX">💸 PIX</option>
                        <option value="CREDIT_CARD">💳 Cartão de crédito na entrega</option>
                        <option value="DEBIT_CARD">💳 Cartão de débito na entrega</option>
                        <option value="CASH">💵 Dinheiro na entrega</option>
                      </select>

                      {paymentMethod === 'ONLINE_PIX' && (
                        <input
                          className={`border rounded-xl px-4 py-3 text-sm outline-none transition-all ${
                            fieldErrors.customerDocument
                              ? 'border-red-400 bg-red-50'
                              : 'border-gray-200 focus:border-gray-400'
                          }`}
                          placeholder="CPF/CNPJ *"
                          value={customerDocument}
                          onChange={(e) => {
                            setCustomerDocument(e.target.value);
                            setFieldErrors((f) => ({ ...f, customerDocument: false }));
                          }}
                        />
                      )}

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

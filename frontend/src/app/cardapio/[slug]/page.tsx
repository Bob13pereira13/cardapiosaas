'use client';

import { useEffect, useState, use } from 'react';

type Product = {
  id: number;
  nome: string;
  preco: number;
  imagem?: string | null;
};

type Category = {
  id: number;
  nome: string;
  products: Product[];
};

type Cardapio = {
  id: number;
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

type CartItem = Product & {
  quantidade: number;
};

function formatarPreco(valor: number) {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

function gerarLinkWhatsApp(telefone: string | null, mensagem: string) {
  if (!telefone) return '#';
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
}

function verificarRestauranteAberto(
  abertoManual: boolean | undefined,
  horarioAbertura?: string | null,
  horarioFechamento?: string | null
) {
  if (!horarioAbertura || !horarioFechamento) {
    return abertoManual !== false;
  }

  const agora = new Date();
  const horaAtual = agora.getHours() * 60 + agora.getMinutes();

  const [aberturaHora, aberturaMinuto] = horarioAbertura.split(':').map(Number);
  const [fechamentoHora, fechamentoMinuto] = horarioFechamento.split(':').map(Number);

  const abertura = aberturaHora * 60 + aberturaMinuto;
  const fechamento = fechamentoHora * 60 + fechamentoMinuto;

  if (abertura < fechamento) {
    return horaAtual >= abertura && horaAtual <= fechamento;
  }

  return horaAtual >= abertura || horaAtual <= fechamento;
}

export default function CardapioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [cardapio, setCardapio] = useState<Cardapio | null>(null);
  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);

  useEffect(() => {
    const carrinhoSalvo = localStorage.getItem(`carrinho-${slug}`);
    if (carrinhoSalvo) setCarrinho(JSON.parse(carrinhoSalvo));
  }, [slug]);

  useEffect(() => {
    localStorage.setItem(`carrinho-${slug}`, JSON.stringify(carrinho));
  }, [carrinho, slug]);

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch(`http://localhost:3000/public/cardapio/${slug}`);

        if (!res.ok) throw new Error('Erro ao buscar cardápio');

        const data = await res.json();
        setCardapio(data);
      } catch (error) {
        console.error(error);
        setCardapio(null);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [slug]);

  function adicionarAoCarrinho(product: Product) {
    setCarrinho((items) => {
      const existente = items.find((item) => item.id === product.id);

      if (existente) {
        return items.map((item) =>
          item.id === product.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }

      return [...items, { ...product, quantidade: 1 }];
    });
  }

  function removerDoCarrinho(productId: number) {
    setCarrinho((items) =>
      items
        .map((item) =>
          item.id === productId
            ? { ...item, quantidade: item.quantidade - 1 }
            : item
        )
        .filter((item) => item.quantidade > 0)
    );
  }

  function limparCarrinho() {
    setCarrinho([]);
    localStorage.removeItem(`carrinho-${slug}`);
    setCarrinhoAberto(false);
  }

  const total = carrinho.reduce(
    (soma, item) => soma + item.preco * item.quantidade,
    0
  );

  const quantidadeTotal = carrinho.reduce(
    (soma, item) => soma + item.quantidade,
    0
  );

  const mensagemPedido =
    carrinho.length === 0
      ? ''
      : `Olá, quero fazer um pedido:\n\n${carrinho
          .map(
            (item) =>
              `${item.quantidade}x ${item.nome} - ${formatarPreco(
                item.preco * item.quantidade
              )}`
          )
          .join('\n')}\n\nTotal: ${formatarPreco(total)}`;

  if (loading) {
    return (
      <main style={styles.page}>
        <p style={styles.loading}>Carregando cardápio...</p>
      </main>
    );
  }

  if (!cardapio) {
    return (
      <main style={styles.page}>
        <p style={styles.error}>Erro ao carregar cardápio.</p>
      </main>
    );
  }

  const restauranteAberto = verificarRestauranteAberto(
    cardapio.aberto,
    cardapio.horarioAbertura,
    cardapio.horarioFechamento
  );
  const corPrimaria = cardapio.corPrimaria || '#16a34a';

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div
          style={{
            ...styles.cover,
            background: cardapio.banner
              ? `url(${cardapio.banner}) center/cover`
              : `linear-gradient(135deg, ${corPrimaria}, #111827)`,
          }}
        >
          <div style={styles.logo}>
            {cardapio.logo ? (
              <img
                src={cardapio.logo}
                alt={cardapio.nome}
                style={styles.logoImage}
              />
            ) : (
              cardapio.nome.charAt(0).toUpperCase()
            )}
          </div>
        </div>

        <div style={styles.headerContent}>
          <h1 style={styles.title}>{cardapio.nome}</h1>
          <p style={styles.subtitle}>Cardápio digital</p>

          <div style={styles.statusRow}>
            <span
              style={
                restauranteAberto
                  ? { ...styles.status, background: `${corPrimaria}22`, color: corPrimaria }
                  : styles.statusClosed
              }
            >
              {restauranteAberto ? 'Aberto' : 'Fechado'}
            </span>
            <span style={styles.dot}>•</span>
            <span style={styles.info}>
              {cardapio.horarioAbertura && cardapio.horarioFechamento
                ? `${cardapio.horarioAbertura} às ${cardapio.horarioFechamento}`
                : 'Pedido via WhatsApp'}
            </span>
          </div>
        </div>
      </header>

      {!cardapio.whatsapp && (
        <div style={styles.alert}>
          WhatsApp ainda não cadastrado para este restaurante.
        </div>
      )}

      {!restauranteAberto && (
        <div style={styles.closedAlert}>
          Restaurante fechado no momento. Você pode montar seu pedido, mas a finalização está indisponível.
        </div>
      )}

      <nav style={styles.categoriesNav}>
        {cardapio.categories.map((category) => (
          <a key={category.id} href={`#categoria-${category.id}`} style={styles.categoryPill}>
            {category.nome}
          </a>
        ))}
      </nav>

      {cardapio.categories.length === 0 && (
        <div style={styles.empty}>Nenhuma categoria cadastrada ainda.</div>
      )}

      {cardapio.categories.map((category) => (
        <section
          key={category.id}
          id={`categoria-${category.id}`}
          style={styles.section}
        >
          <h2 style={styles.categoryTitle}>{category.nome}</h2>

          <div style={styles.productsList}>
            {category.products.map((product) => (
              <article key={product.id} style={styles.productCard}>
                <div style={styles.productInfo}>
                  <h3 style={styles.productName}>{product.nome}</h3>
                  <p style={styles.description}>
                    Produto disponível para pedido.
                  </p>

                  <strong style={{ ...styles.price, color: corPrimaria }}>
                    {formatarPreco(product.preco)}
                  </strong>
                </div>

                <div style={styles.imageBox}>
                  {product.imagem ? (
                    <img
                      src={product.imagem}
                      alt={product.nome}
                      style={styles.productPhoto}
                      loading="lazy"
                    />
                  ) : (
                    <span style={styles.imagePlaceholder}>
                      {product.nome.charAt(0).toUpperCase()}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => adicionarAoCarrinho(product)}
                    style={{ ...styles.addButton, background: corPrimaria }}
                  >
                    +
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {carrinho.length > 0 && !carrinhoAberto && (
        <button
          type="button"
          onClick={() => setCarrinhoAberto(true)}
          style={{ ...styles.cartFloatingButton, background: corPrimaria }}
        >
          <span>
            Ver pedido • {quantidadeTotal} item{quantidadeTotal > 1 ? 's' : ''}
          </span>
          <strong>{formatarPreco(total)}</strong>
        </button>
      )}

      {carrinhoAberto && (
        <div style={styles.overlay}>
          <section style={styles.cartSheet}>
            <div style={styles.sheetHandle} />

            <div style={styles.cartHeader}>
              <div>
                <h2 style={styles.cartTitle}>Seu pedido</h2>
                <p style={styles.cartSubtitle}>
                  {quantidadeTotal} item{quantidadeTotal > 1 ? 's' : ''} no carrinho
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCarrinhoAberto(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>

            <div style={styles.cartItems}>
              {carrinho.map((item) => (
                <div key={item.id} style={styles.cartItem}>
                  <div>
                    <strong>{item.nome}</strong>
                    <p style={styles.cartText}>
                      {formatarPreco(item.preco * item.quantidade)}
                    </p>
                  </div>

                  <div style={styles.qty}>
                    <button
                      type="button"
                      onClick={() => removerDoCarrinho(item.id)}
                      style={styles.qtyButton}
                    >
                      -
                    </button>

                    <span>{item.quantidade}</span>

                    <button
                      type="button"
                      onClick={() => adicionarAoCarrinho(item)}
                      style={styles.qtyButton}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.cartTotal}>
              <strong>Total</strong>
              <strong>{formatarPreco(total)}</strong>
            </div>

            {restauranteAberto ? (
              <a
                href={gerarLinkWhatsApp(cardapio.whatsapp, mensagemPedido)}
                target="_blank"
                style={{ ...styles.finishButton, background: corPrimaria }}
              >
                Finalizar pedido no WhatsApp
              </a>
            ) : (
              <div style={styles.finishButtonDisabled}>
                Restaurante fechado no momento
              </div>
            )}

            <button type="button" onClick={limparCarrinho} style={styles.clearButton}>
              Limpar carrinho
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f5f5f5',
    paddingBottom: 120,
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    background: '#fff',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
  },
  cover: {
    height: 130,
    background: 'linear-gradient(135deg, #16a34a, #14532d)',
    display: 'flex',
    alignItems: 'flex-end',
    padding: 20,
  },
  logo: {
    width: 78,
    height: 78,
    borderRadius: 22,
    background: '#fff',
    color: '#16a34a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 36,
    fontWeight: 'bold',
    boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  headerContent: {
    padding: '20px',
    maxWidth: 900,
    margin: '0 auto',
  },
  title: {
    margin: 0,
    fontSize: 30,
    color: '#111827',
  },
  subtitle: {
    margin: '6px 0',
    color: '#6b7280',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  status: {
    background: '#dcfce7',
    color: '#166534',
    padding: '6px 12px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 'bold',
  },
  statusClosed: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '6px 12px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 'bold',
  },
  dot: {
    color: '#9ca3af',
  },
  info: {
    color: '#6b7280',
    fontSize: 14,
  },
  closedAlert: {
    maxWidth: 900,
    margin: '18px auto 0',
    background: '#fff7ed',
    color: '#9a3412',
    padding: 14,
    borderRadius: 14,
    fontWeight: 'bold',
  },
  categoriesNav: {
    maxWidth: 900,
    margin: '18px auto 0',
    padding: '0 16px',
    display: 'flex',
    gap: 10,
    overflowX: 'auto',
  },
  categoryPill: {
    whiteSpace: 'nowrap',
    background: '#fff',
    color: '#111827',
    padding: '10px 16px',
    borderRadius: 999,
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: 14,
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
  },
  section: {
    maxWidth: 900,
    margin: '28px auto 0',
    padding: '0 16px',
  },
  categoryTitle: {
    fontSize: 22,
    marginBottom: 14,
    color: '#111827',
  },
  productsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  productCard: {
    background: '#fff',
    borderRadius: 22,
    padding: 14,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    margin: 0,
    fontSize: 18,
    color: '#111827',
  },
  description: {
    margin: '8px 0 14px',
    fontSize: 14,
    color: '#6b7280',
  },
  price: {
    color: '#111827',
    fontSize: 17,
  },
  imageBox: {
    width: 110,
    height: 110,
    borderRadius: 18,
    background: '#dcfce7',
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
  },
  productPhoto: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 34,
    color: '#166534',
    fontWeight: 'bold',
  },
  addButton: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 34,
    height: 34,
    borderRadius: '50%',
    border: 0,
    background: '#16a34a',
    color: '#fff',
    fontSize: 24,
    cursor: 'pointer',
    boxShadow: '0 6px 14px rgba(0,0,0,0.25)',
  },
  cartFloatingButton: {
    position: 'fixed',
    left: 16,
    right: 16,
    bottom: 18,
    maxWidth: 900,
    margin: '0 auto',
    background: '#16a34a',
    color: '#fff',
    border: 0,
    borderRadius: 18,
    padding: '16px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 'bold',
    fontSize: 15,
    cursor: 'pointer',
    boxShadow: '0 12px 30px rgba(22,163,74,0.35)',
    zIndex: 40,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'flex-end',
    zIndex: 50,
  },
  cartSheet: {
    width: '100%',
    maxWidth: 900,
    margin: '0 auto',
    background: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    background: '#d1d5db',
    margin: '0 auto 16px',
  },
  cartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartTitle: {
    margin: 0,
    fontSize: 22,
  },
  cartSubtitle: {
    margin: '4px 0 0',
    color: '#6b7280',
    fontSize: 14,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    border: 0,
    background: '#f3f4f6',
    fontSize: 26,
    cursor: 'pointer',
  },
  cartItems: {
    marginTop: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  cartItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: 12,
  },
  cartText: {
    margin: '4px 0 0',
    color: '#6b7280',
    fontSize: 14,
  },
  qty: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: 0,
    background: '#f3f4f6',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  cartTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 18,
    fontSize: 20,
  },
  finishButton: {
    display: 'block',
    marginTop: 18,
    textAlign: 'center',
    background: '#16a34a',
    color: '#fff',
    padding: '16px',
    borderRadius: 18,
    textDecoration: 'none',
    fontWeight: 'bold',
  },
  finishButtonDisabled: {
    display: 'block',
    marginTop: 18,
    textAlign: 'center',
    background: '#9ca3af',
    color: '#fff',
    padding: '16px',
    borderRadius: 18,
    textDecoration: 'none',
    fontWeight: 'bold',
    cursor: 'not-allowed',
  },
  clearButton: {
    width: '100%',
    marginTop: 10,
    background: 'transparent',
    border: 0,
    color: '#991b1b',
    fontWeight: 'bold',
    cursor: 'pointer',
    padding: 12,
  },
  alert: {
    maxWidth: 900,
    margin: '18px auto 0',
    background: '#fee2e2',
    color: '#991b1b',
    padding: 14,
    borderRadius: 14,
  },
  empty: {
    maxWidth: 900,
    margin: '20px auto',
    background: '#fff',
    padding: 20,
    borderRadius: 16,
  },
  loading: {
    textAlign: 'center',
    paddingTop: 80,
    fontSize: 18,
  },
  error: {
    textAlign: 'center',
    paddingTop: 80,
    color: 'red',
    fontSize: 18,
  },
};
'use client'

import { useEffect, useState } from 'react'

type Category = {
  id: number
  nome: string
}

type Product = {
  id: number
  nome: string
  preco: number
  imagem?: string
  category?: Category
}

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  const [nome, setNome] = useState('')
  const [preco, setPreco] = useState('')
  const [imagem, setImagem] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [editId, setEditId] = useState<number | null>(null)

  const [nomeCategoria, setNomeCategoria] = useState('')
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  async function loadProducts() {
    const token = localStorage.getItem('token')
    if (!token) return

    const res = await fetch('http://localhost:3000/products', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await res.json()
    setProducts(data)
  }

  async function loadCategories() {
    const token = localStorage.getItem('token')
    if (!token) return

    const res = await fetch('http://localhost:3000/categories', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await res.json()
    setCategories(data)
  }

  useEffect(() => {
    async function carregarDados() {
      setLoading(true)
      await loadProducts()
      await loadCategories()
      setLoading(false)
    }

    carregarDados()
  }, [])

  async function handleUploadImagem(file: File) {
    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Erro ao enviar imagem')

      const data = await res.json()
      setImagem(data.url)
    } catch (error) {
      console.error(error)
      alert('Erro ao enviar imagem.')
    } finally {
      setUploading(false)
    }
  }

  async function handleCreate() {
    const token = localStorage.getItem('token')
    if (!token) return alert('Você precisa estar logado.')

    if (!nome || !preco || !categoryId) {
      return alert('Preencha nome, preço e categoria.')
    }

    await fetch('http://localhost:3000/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        nome,
        preco: Number(preco),
        imagem,
        categoryId: Number(categoryId),
      }),
    })

    setNome('')
    setPreco('')
    setImagem('')
    setCategoryId('')

    await loadProducts()
  }

  async function handleUpdate() {
    const token = localStorage.getItem('token')
    if (!token || !editId) return

    await fetch(`http://localhost:3000/products/${editId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        nome,
        preco: Number(preco),
        imagem,
        categoryId: Number(categoryId),
      }),
    })

    setEditId(null)
    setNome('')
    setPreco('')
    setImagem('')
    setCategoryId('')

    await loadProducts()
  }

  async function handleDelete(id: number) {
    const token = localStorage.getItem('token')
    if (!token) return

    const confirmar = confirm('Tem certeza que deseja excluir este produto?')
    if (!confirmar) return

    await fetch(`http://localhost:3000/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    await loadProducts()
  }

  async function handleCreateCategory() {
    const token = localStorage.getItem('token')
    if (!token) return alert('Você precisa estar logado.')

    if (!nomeCategoria) {
      return alert('Digite o nome da categoria.')
    }

    await fetch('http://localhost:3000/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nome: nomeCategoria }),
    })

    setNomeCategoria('')
    await loadCategories()
  }

  async function handleUpdateCategory() {
    const token = localStorage.getItem('token')
    if (!token || !editCategoryId) return

    if (!nomeCategoria) {
      return alert('Digite o nome da categoria.')
    }

    await fetch(`http://localhost:3000/categories/${editCategoryId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nome: nomeCategoria }),
    })

    setEditCategoryId(null)
    setNomeCategoria('')

    await loadCategories()
    await loadProducts()
  }

  async function handleDeleteCategory(id: number) {
    const token = localStorage.getItem('token')
    if (!token) return

    const confirmar = confirm(
      'Tem certeza que deseja excluir esta categoria? Produtos vinculados podem ser afetados.'
    )

    if (!confirmar) return

    await fetch(`http://localhost:3000/categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    await loadCategories()
    await loadProducts()
  }

  function cancelarEdicao() {
    setEditId(null)
    setNome('')
    setPreco('')
    setImagem('')
    setCategoryId('')
  }

  function cancelarEdicaoCategoria() {
    setEditCategoryId(null)
    setNomeCategoria('')
  }

  return (
    <main style={styles.page}>
      <aside style={styles.sidebar}>
        <h2 style={styles.logo}>Cardápio SaaS</h2>

        <nav style={styles.nav}>
          <a href="/dashboard" style={styles.navItem}>Dashboard</a>
          <a href="/dashboard" style={styles.navItem}>Produtos</a>
          <a href="/dashboard" style={styles.navItem}>Categorias</a>
          <a href="/dashboard/configuracoes" style={styles.navItem}>Configurações</a>
        </nav>
      </aside>

      <section style={styles.content}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Painel do Restaurante</h1>
            <p style={styles.subtitle}>
              Gerencie produtos, preços, imagens e categorias.
            </p>
          </div>
        </header>

        <div style={styles.cards}>
          <div style={styles.card}>
            <span style={styles.cardLabel}>Produtos</span>
            <strong style={styles.cardValue}>{products.length}</strong>
          </div>

          <div style={styles.card}>
            <span style={styles.cardLabel}>Categorias</span>
            <strong style={styles.cardValue}>{categories.length}</strong>
          </div>

          <div style={styles.card}>
            <span style={styles.cardLabel}>Status</span>
            <strong style={styles.cardValue}>Online</strong>
          </div>
        </div>

        <section style={styles.formPanel}>
          <h2 style={styles.panelTitle}>
            {editId ? 'Editar produto' : 'Adicionar produto'}
          </h2>

          <div style={styles.formGrid}>
            <input
              style={styles.input}
              placeholder="Nome do produto"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="Preço"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="URL da imagem"
              value={imagem}
              onChange={(e) => setImagem(e.target.value)}
            />

            <select
              style={styles.input}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Selecione uma categoria</option>

              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.uploadBox}>
            <div>
              <strong>Imagem do produto</strong>
              <p style={styles.uploadText}>
                Selecione uma imagem do computador ou cole uma URL no campo acima.
              </p>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUploadImagem(file)
                }}
              />

              {uploading && <p style={styles.uploadText}>Enviando imagem...</p>}
            </div>

            {imagem ? (
              <img src={imagem} style={styles.preview} />
            ) : (
              <div style={styles.previewFallback}>Preview</div>
            )}
          </div>

          <div style={styles.actions}>
            <button
              onClick={editId ? handleUpdate : handleCreate}
              style={styles.primaryButton}
            >
              {editId ? 'Salvar edição' : 'Criar produto'}
            </button>

            {editId && (
              <button onClick={cancelarEdicao} style={styles.secondaryButton}>
                Cancelar
              </button>
            )}
          </div>
        </section>

        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>
            {editCategoryId ? 'Editar categoria' : 'Adicionar categoria'}
          </h2>

          <div style={styles.categoryForm}>
            <input
              style={styles.input}
              placeholder="Nome da categoria"
              value={nomeCategoria}
              onChange={(e) => setNomeCategoria(e.target.value)}
            />

            <button
              onClick={editCategoryId ? handleUpdateCategory : handleCreateCategory}
              style={styles.primaryButton}
            >
              {editCategoryId ? 'Salvar categoria' : 'Criar categoria'}
            </button>

            {editCategoryId && (
              <button
                onClick={cancelarEdicaoCategoria}
                style={styles.secondaryButton}
              >
                Cancelar
              </button>
            )}
          </div>

          <div style={styles.productList}>
            {categories.map((cat) => (
              <div key={cat.id} style={styles.productItem}>
                <strong style={styles.productName}>{cat.nome}</strong>

                <div style={styles.productRight}>
                  <button
                    style={styles.editButton}
                    onClick={() => {
                      setEditCategoryId(cat.id)
                      setNomeCategoria(cat.nome)
                    }}
                  >
                    Editar
                  </button>

                  <button
                    style={styles.deleteButton}
                    onClick={() => handleDeleteCategory(cat.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Produtos cadastrados</h2>

          {loading && <p style={styles.empty}>Carregando produtos...</p>}

          {!loading && products.length === 0 && (
            <p style={styles.empty}>Nenhum produto cadastrado ainda.</p>
          )}

          <div style={styles.productList}>
            {products.map((product) => (
              <div key={product.id} style={styles.productItem}>
                <div style={styles.productInfo}>
                  {product.imagem ? (
                    <img src={product.imagem} style={styles.thumb} />
                  ) : (
                    <div style={styles.thumbFallback}>
                      {product.nome.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <strong style={styles.productName}>{product.nome}</strong>
                    <p style={styles.productMeta}>
                      Categoria: {product.category?.nome || 'Sem categoria'}
                    </p>
                  </div>
                </div>

                <div style={styles.productRight}>
                  <strong style={styles.price}>
                    R$ {product.preco.toFixed(2).replace('.', ',')}
                  </strong>

                  <button
                    style={styles.editButton}
                    onClick={() => {
                      setEditId(product.id)
                      setNome(product.nome)
                      setPreco(product.preco.toString())
                      setImagem(product.imagem || '')
                      setCategoryId(product.category?.id?.toString() || '')
                    }}
                  >
                    Editar
                  </button>

                  <button
                    style={styles.deleteButton}
                    onClick={() => handleDelete(product.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    background: '#f3f4f6',
    fontFamily: 'Arial, sans-serif',
  },
  sidebar: {
    width: 260,
    background: '#111827',
    color: '#fff',
    padding: 24,
  },
  logo: {
    margin: 0,
    fontSize: 22,
  },
  nav: {
    marginTop: 32,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  navItem: {
    padding: '12px 14px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.08)',
    cursor: 'pointer',
    color: '#fff',
    textDecoration: 'none',
  },
  content: {
    flex: 1,
    padding: 32,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
  },
  title: {
    margin: 0,
    fontSize: 32,
    color: '#111827',
  },
  subtitle: {
    margin: '8px 0 0',
    color: '#6b7280',
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    marginTop: 28,
  },
  card: {
    background: '#fff',
    borderRadius: 18,
    padding: 20,
    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
  },
  cardLabel: {
    display: 'block',
    color: '#6b7280',
    fontSize: 14,
  },
  cardValue: {
    display: 'block',
    marginTop: 8,
    fontSize: 28,
    color: '#111827',
  },
  formPanel: {
    marginTop: 28,
    background: '#fff',
    borderRadius: 20,
    padding: 22,
    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
  },
  panel: {
    marginTop: 28,
    background: '#fff',
    borderRadius: 20,
    padding: 22,
    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
  },
  panelTitle: {
    margin: 0,
    fontSize: 22,
    color: '#111827',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
    marginTop: 18,
  },
  uploadBox: {
    marginTop: 18,
    background: '#f9fafb',
    border: '1px dashed #cbd5e1',
    borderRadius: 16,
    padding: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
  },
  uploadText: {
    margin: '6px 0 12px',
    color: '#6b7280',
    fontSize: 14,
  },
  preview: {
    width: 120,
    height: 90,
    borderRadius: 14,
    objectFit: 'cover',
  },
  previewFallback: {
    width: 120,
    height: 90,
    borderRadius: 14,
    background: '#e5e7eb',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
  },
  categoryForm: {
    display: 'flex',
    gap: 12,
    marginTop: 18,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid #d1d5db',
    fontSize: 15,
    outline: 'none',
  },
  actions: {
    display: 'flex',
    gap: 12,
    marginTop: 18,
  },
  primaryButton: {
    border: 0,
    background: '#16a34a',
    color: '#fff',
    padding: '12px 18px',
    borderRadius: 999,
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  secondaryButton: {
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#111827',
    padding: '12px 18px',
    borderRadius: 999,
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  empty: {
    marginTop: 20,
    padding: 24,
    borderRadius: 14,
    background: '#f9fafb',
    color: '#6b7280',
    textAlign: 'center',
  },
  productList: {
    marginTop: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  productItem: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  productInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    objectFit: 'cover',
  },
  thumbFallback: {
    width: 56,
    height: 56,
    borderRadius: 12,
    background: '#dcfce7',
    color: '#166534',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: 22,
  },
  productName: {
    fontSize: 17,
    color: '#111827',
  },
  productMeta: {
    margin: '6px 0 0',
    color: '#6b7280',
    fontSize: 14,
  },
  productRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  price: {
    color: '#111827',
    fontSize: 16,
    marginRight: 8,
  },
  editButton: {
    border: 0,
    background: '#2563eb',
    color: '#fff',
    padding: '9px 12px',
    borderRadius: 999,
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  deleteButton: {
    border: 0,
    background: '#ef4444',
    color: '#fff',
    padding: '9px 12px',
    borderRadius: 999,
    cursor: 'pointer',
    fontWeight: 'bold',
  },
}
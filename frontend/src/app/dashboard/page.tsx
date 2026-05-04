'use client'

import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/config'
import { getToken, handleUnauthorized } from '@/lib/auth'

type Category = {
  id: number
  nome: string
}

type Product = {
  id: number
  nome: string
  descricao?: string
  preco: number
  imagem?: string
  disponivel: boolean
  category?: Category
}

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [preco, setPreco] = useState('')
  const [imagem, setImagem] = useState('')
  const [disponivel, setDisponivel] = useState(true)
  const [categoryId, setCategoryId] = useState('')
  const [editId, setEditId] = useState<number | null>(null)

  const [nomeCategoria, setNomeCategoria] = useState('')
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const LIMIT = 20

  async function loadProducts(p = page) {
    const token = getToken()
    if (!token) { window.location.href = '/login'; return }

    const res = await fetch(`${API_URL}/products?page=${p}&limit=${LIMIT}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (handleUnauthorized(res)) return

    const result = await res.json()
    setProducts(result.data)
    setTotalPages(result.totalPages)
    setTotalProducts(result.total)
    setPage(p)
  }

  async function loadCategories() {
    const token = getToken()
    if (!token) return

    const res = await fetch(`${API_URL}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (handleUnauthorized(res)) return

    const data = await res.json()
    setCategories(data)
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      await loadProducts()
      await loadCategories()
      setLoading(false)
    }
    init()
  }, [])

  async function handleUploadImagem(file: File) {
    try {
      setUploading(true)
      const token = getToken()
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!res.ok) throw new Error()
      const data = await res.json()
      setImagem(data.url)
    } catch {
      alert('Erro ao enviar imagem.')
    } finally {
      setUploading(false)
    }
  }

  async function handleCreate() {
    const token = getToken()
    if (!token) return alert('Você precisa estar logado.')
    if (!nome || !preco) return alert('Preencha nome e preço.')

    await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        nome,
        descricao: descricao || undefined,
        preco: Number(preco),
        imagem: imagem || undefined,
        disponivel,
        categoryId: categoryId ? Number(categoryId) : undefined,
      }),
    })

    cancelarEdicao()
    await loadProducts()
  }

  async function handleUpdate() {
    const token = getToken()
    if (!token || !editId) return

    await fetch(`${API_URL}/products/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        nome,
        descricao: descricao || undefined,
        preco: Number(preco),
        imagem: imagem || undefined,
        disponivel,
        categoryId: categoryId ? Number(categoryId) : undefined,
      }),
    })

    cancelarEdicao()
    await loadProducts()
  }

  async function toggleDisponivel(product: Product) {
    const token = getToken()
    if (!token) return

    await fetch(`${API_URL}/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ disponivel: !product.disponivel }),
    })

    await loadProducts(page)
  }

  async function handleDelete(id: number) {
    const token = getToken()
    if (!token) return
    if (!confirm('Excluir este produto?')) return

    await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    await loadProducts()
  }

  async function handleCreateCategory() {
    const token = getToken()
    if (!token) return alert('Você precisa estar logado.')
    if (!nomeCategoria) return alert('Digite o nome da categoria.')

    await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nome: nomeCategoria }),
    })

    setNomeCategoria('')
    await loadCategories()
  }

  async function handleUpdateCategory() {
    const token = getToken()
    if (!token || !editCategoryId) return
    if (!nomeCategoria) return alert('Digite o nome da categoria.')

    await fetch(`${API_URL}/categories/${editCategoryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nome: nomeCategoria }),
    })

    setEditCategoryId(null)
    setNomeCategoria('')
    await loadCategories()
    await loadProducts()
  }

  async function handleDeleteCategory(id: number) {
    const token = getToken()
    if (!token) return
    if (!confirm('Excluir esta categoria? Produtos vinculados ficam sem categoria.')) return

    await fetch(`${API_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    await loadCategories()
    await loadProducts()
  }

  function cancelarEdicao() {
    setEditId(null)
    setNome('')
    setDescricao('')
    setPreco('')
    setImagem('')
    setDisponivel(true)
    setCategoryId('')
  }

  return (
    <div>
      <div style={styles.cards}>
        <div style={styles.card}>
          <span style={styles.cardLabel}>Total de produtos</span>
          <strong style={styles.cardValue}>{totalProducts}</strong>
        </div>
        <div style={styles.card}>
          <span style={styles.cardLabel}>Categorias</span>
          <strong style={styles.cardValue}>{categories.length}</strong>
        </div>
        <div style={styles.card}>
          <span style={styles.cardLabel}>Status</span>
          <strong style={{ ...styles.cardValue, color: '#16a34a', fontSize: 18 }}>Online</strong>
        </div>
      </div>

      {/* Formulário de produto */}
      <section style={styles.panel}>
        <h2 style={styles.panelTitle}>
          {editId ? 'Editar produto' : 'Adicionar produto'}
        </h2>

        <div style={styles.formGrid}>
          <input
            style={styles.input}
            placeholder="Nome do produto *"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <input
            style={styles.input}
            placeholder="Preço *"
            type="number"
            min="0"
            step="0.01"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
          />

          <select
            style={styles.input}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Sem categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>

          <textarea
            style={{ ...styles.input, gridColumn: '1 / -1', resize: 'vertical', minHeight: 72 }}
            placeholder="Descrição do produto (opcional)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            maxLength={500}
          />
        </div>

        <div style={styles.uploadBox}>
          <div>
            <strong>Imagem do produto</strong>
            <p style={styles.uploadText}>Selecione do computador ou cole uma URL abaixo.</p>
            <input
              style={{ ...styles.input, marginTop: 8 }}
              placeholder="URL da imagem"
              value={imagem}
              onChange={(e) => setImagem(e.target.value)}
            />
            <input
              type="file"
              accept="image/*"
              style={{ marginTop: 8 }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImagem(f) }}
            />
            {uploading && <p style={styles.uploadText}>Enviando...</p>}
          </div>

          {imagem
            ? <img src={imagem} style={styles.preview} alt="preview" />
            : <div style={styles.previewFallback}>Preview</div>
          }
        </div>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={disponivel}
            onChange={(e) => setDisponivel(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Produto disponível (visível no cardápio)
        </label>

        <div style={styles.actions}>
          <button onClick={editId ? handleUpdate : handleCreate} style={styles.primaryButton}>
            {editId ? 'Salvar edição' : 'Criar produto'}
          </button>
          {editId && (
            <button onClick={cancelarEdicao} style={styles.secondaryButton}>
              Cancelar
            </button>
          )}
        </div>
      </section>

      {/* Lista de produtos */}
      <section style={styles.panel}>
        <h2 style={styles.panelTitle}>Produtos cadastrados</h2>

        {loading && <p style={styles.empty}>Carregando...</p>}
        {!loading && products.length === 0 && (
          <p style={styles.empty}>Nenhum produto cadastrado ainda.</p>
        )}

        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              style={{ ...styles.pageButton, opacity: page <= 1 ? 0.4 : 1 }}
              onClick={() => loadProducts(page - 1)}
              disabled={page <= 1}
            >
              ← Anterior
            </button>
            <span style={styles.pageInfo}>Página {page} de {totalPages}</span>
            <button
              style={{ ...styles.pageButton, opacity: page >= totalPages ? 0.4 : 1 }}
              onClick={() => loadProducts(page + 1)}
              disabled={page >= totalPages}
            >
              Próxima →
            </button>
          </div>
        )}

        <div style={styles.productList}>
          {products.map((product) => (
            <div
              key={product.id}
              style={{ ...styles.productItem, opacity: product.disponivel ? 1 : 0.55 }}
            >
              <div style={styles.productInfo}>
                {product.imagem
                  ? <img src={product.imagem} style={styles.thumb} alt={product.nome} />
                  : <div style={styles.thumbFallback}>{product.nome.charAt(0).toUpperCase()}</div>
                }
                <div>
                  <strong style={styles.productName}>{product.nome}</strong>
                  {product.descricao && (
                    <p style={styles.productMeta}>{product.descricao}</p>
                  )}
                  <p style={styles.productMeta}>
                    {product.category?.nome || 'Sem categoria'}
                    {' · '}
                    <span style={{ color: product.disponivel ? '#16a34a' : '#ef4444', fontWeight: 'bold' }}>
                      {product.disponivel ? 'Disponível' : 'Indisponível'}
                    </span>
                  </p>
                </div>
              </div>

              <div style={styles.productRight}>
                <strong style={styles.price}>
                  R$ {product.preco.toFixed(2).replace('.', ',')}
                </strong>

                <button
                  style={{ ...styles.toggleButton, background: product.disponivel ? '#f3f4f6' : '#dcfce7', color: product.disponivel ? '#6b7280' : '#166534' }}
                  onClick={() => toggleDisponivel(product)}
                  title={product.disponivel ? 'Marcar como indisponível' : 'Marcar como disponível'}
                >
                  {product.disponivel ? 'Pausar' : 'Ativar'}
                </button>

                <button
                  style={styles.editButton}
                  onClick={() => {
                    setEditId(product.id)
                    setNome(product.nome)
                    setDescricao(product.descricao || '')
                    setPreco(product.preco.toString())
                    setImagem(product.imagem || '')
                    setDisponivel(product.disponivel)
                    setCategoryId(product.category?.id?.toString() || '')
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                >
                  Editar
                </button>

                <button style={styles.deleteButton} onClick={() => handleDelete(product.id)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categorias */}
      <section style={styles.panel}>
        <h2 style={styles.panelTitle}>
          {editCategoryId ? 'Editar categoria' : 'Categorias'}
        </h2>

        <div style={styles.categoryForm}>
          <input
            style={{ ...styles.input, flex: 1 }}
            placeholder="Nome da categoria"
            value={nomeCategoria}
            onChange={(e) => setNomeCategoria(e.target.value)}
          />
          <button
            onClick={editCategoryId ? handleUpdateCategory : handleCreateCategory}
            style={styles.primaryButton}
          >
            {editCategoryId ? 'Salvar' : 'Criar categoria'}
          </button>
          {editCategoryId && (
            <button onClick={() => { setEditCategoryId(null); setNomeCategoria('') }} style={styles.secondaryButton}>
              Cancelar
            </button>
          )}
        </div>

        <div style={styles.productList}>
          {categories.map((cat) => (
            <div key={cat.id} style={styles.productItem}>
              <strong style={styles.productName}>{cat.nome}</strong>
              <div style={styles.productRight}>
                <button style={styles.editButton} onClick={() => { setEditCategoryId(cat.id); setNomeCategoria(cat.nome) }}>
                  Editar
                </button>
                <button style={styles.deleteButton} onClick={() => handleDeleteCategory(cat.id)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  card: {
    background: '#fff',
    borderRadius: 18,
    padding: 20,
    boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
  },
  cardLabel: {
    display: 'block',
    color: '#6b7280',
    fontSize: 13,
  },
  cardValue: {
    display: 'block',
    marginTop: 8,
    fontSize: 26,
    color: '#111827',
  },
  panel: {
    background: '#fff',
    borderRadius: 20,
    padding: 22,
    boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
    marginBottom: 24,
  },
  panelTitle: {
    margin: '0 0 18px',
    fontSize: 20,
    color: '#111827',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 12,
    border: '1px solid #d1d5db',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  uploadBox: {
    marginTop: 16,
    background: '#f9fafb',
    border: '1px dashed #cbd5e1',
    borderRadius: 16,
    padding: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
  },
  uploadText: {
    margin: '6px 0',
    color: '#6b7280',
    fontSize: 13,
  },
  preview: {
    width: 110,
    height: 85,
    borderRadius: 12,
    objectFit: 'cover',
    flexShrink: 0,
  },
  previewFallback: {
    width: 110,
    height: 85,
    borderRadius: 12,
    background: '#e5e7eb',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    flexShrink: 0,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    marginTop: 16,
    fontSize: 14,
    color: '#374151',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    gap: 12,
    marginTop: 16,
  },
  primaryButton: {
    border: 0,
    background: '#16a34a',
    color: '#fff',
    padding: '11px 20px',
    borderRadius: 999,
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: 14,
    whiteSpace: 'nowrap',
  },
  secondaryButton: {
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#374151',
    padding: '11px 20px',
    borderRadius: 999,
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: 14,
    whiteSpace: 'nowrap',
  },
  empty: {
    color: '#9ca3af',
    textAlign: 'center',
    padding: '20px 0',
    fontSize: 14,
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    margin: '12px 0',
  },
  pageButton: {
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#111827',
    padding: '7px 14px',
    borderRadius: 999,
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: 13,
  },
  pageInfo: {
    color: '#6b7280',
    fontSize: 13,
  },
  productList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  productItem: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  productInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    objectFit: 'cover',
    flexShrink: 0,
  },
  thumbFallback: {
    width: 52,
    height: 52,
    borderRadius: 10,
    background: '#dcfce7',
    color: '#166534',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: 20,
    flexShrink: 0,
  },
  productName: {
    fontSize: 15,
    color: '#111827',
    display: 'block',
  },
  productMeta: {
    margin: '3px 0 0',
    color: '#6b7280',
    fontSize: 13,
  },
  productRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  price: {
    color: '#111827',
    fontSize: 15,
    marginRight: 4,
  },
  toggleButton: {
    border: 0,
    padding: '7px 11px',
    borderRadius: 999,
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: 13,
  },
  editButton: {
    border: 0,
    background: '#2563eb',
    color: '#fff',
    padding: '7px 11px',
    borderRadius: 999,
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: 13,
  },
  deleteButton: {
    border: 0,
    background: '#ef4444',
    color: '#fff',
    padding: '7px 11px',
    borderRadius: 999,
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: 13,
  },
  categoryForm: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
}

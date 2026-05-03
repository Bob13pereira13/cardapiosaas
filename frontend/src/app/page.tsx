'use client'

import { useEffect, useState } from 'react'

export default function Home() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [nome, setNome] = useState('')
  const [preco, setPreco] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [editId, setEditId] = useState<number | null>(null)

  async function loadProducts() {
    const token = localStorage.getItem('token')
    if (!token) return

    const res = await fetch('http://localhost:3000/products', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await res.json()
    setProducts(data)
  }

  async function loadCategories() {
    const token = localStorage.getItem('token')
    if (!token) return

    const res = await fetch('http://localhost:3000/categories', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await res.json()
    setCategories(data)
  }

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

  async function handleCreate() {
    const token = localStorage.getItem('token')

    await fetch('http://localhost:3000/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        nome,
        preco: Number(preco),
        categoryId: Number(categoryId),
      }),
    })

    setNome('')
    setPreco('')
    setCategoryId('')

    await loadProducts()
  }

  async function handleUpdate() {
    const token = localStorage.getItem('token')

    await fetch(`http://localhost:3000/products/${editId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        nome,
        preco: Number(preco),
        categoryId: Number(categoryId),
      }),
    })

    setEditId(null)
    setNome('')
    setPreco('')
    setCategoryId('')

    await loadProducts()
  }

  async function handleDelete(id: number) {
    const token = localStorage.getItem('token')

    await fetch(`http://localhost:3000/products/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    await loadProducts()
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>📋 Meu Cardápio</h1>

      <div style={{ marginBottom: 30 }}>
        <h2>{editId ? 'Editar Produto' : 'Criar Produto'}</h2>

        <input
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <br /><br />

        <input
          placeholder="Preço"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
        />
        <br /><br />

        <select
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
        <br /><br />

        <button onClick={editId ? handleUpdate : handleCreate}>
          {editId ? 'Salvar edição' : 'Criar Produto'}
        </button>

        {editId && (
          <button
            onClick={() => {
              setEditId(null)
              setNome('')
              setPreco('')
              setCategoryId('')
            }}
            style={{ marginLeft: 10 }}
          >
            Cancelar
          </button>
        )}
      </div>

      {products.map((product) => (
        <div key={product.id} style={{ marginBottom: 15 }}>
          <strong>{product.nome}</strong> - R$ {product.preco}
          <br />
          Categoria: {product.category?.nome}
          <br /><br />

          <button onClick={() => handleDelete(product.id)}>
            ❌ Deletar
          </button>

          <button
            style={{ marginLeft: 10 }}
            onClick={() => {
              setEditId(product.id)
              setNome(product.nome)
              setPreco(product.preco.toString())
              setCategoryId(product.category?.id?.toString() || '')
            }}
          >
            ✏️ Editar
          </button>
        </div>
      ))}
    </div>
  )
}
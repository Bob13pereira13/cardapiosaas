'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProdutoFormInformacoes } from './ProdutoFormInformacoes'
import type { CategoryDto } from '@/lib/category-types'
import type { ProductDto } from '@/lib/product-types'

interface Props {
  open: boolean
  onClose: () => void
  product: ProductDto | 'new' | null
  categorias: CategoryDto[]
  onSaved: () => void
}

export function ProdutoFormModal({ open, onClose, product, categorias, onSaved }: Props) {
  const [activeTab, setActiveTab] = useState('info')
  const [savedProduct, setSavedProduct] = useState<ProductDto | null>(null)

  const isCreate = product === 'new'
  const editProduct = product !== 'new' ? product : null

  // Tab 2 and 3 enabled only after Tab 1 saves (create) or from the start (edit)
  const tabsEnabled = !isCreate || savedProduct !== null

  useEffect(() => {
    if (open) {
      setActiveTab('info')
      setSavedProduct(null)
    }
  }, [open, product])

  function handleTab1Saved(saved: ProductDto) {
    setSavedProduct(saved)
    onSaved()
  }

  const currentProduct = savedProduct ?? editProduct

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isCreate ? 'Novo produto' : 'Editar produto'}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <TabsList className="w-full shrink-0 justify-start">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="comp" disabled={!tabsEnabled}>
              Complementos
              {!tabsEnabled && (
                <span className="ml-1 text-xs text-gray-400">(salve primeiro)</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="dispo" disabled={!tabsEnabled}>
              Disponibilidade
              {!tabsEnabled && (
                <span className="ml-1 text-xs text-gray-400">(salve primeiro)</span>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="info" className="mt-0 px-1 pt-4">
              <ProdutoFormInformacoes
                product={currentProduct}
                categorias={categorias}
                onSaved={handleTab1Saved}
                onCancel={onClose}
              />
            </TabsContent>

            <TabsContent value="comp" className="mt-0 px-1 pt-4">
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                <p className="text-gray-500">Aba de Complementos — Fase 4B.4</p>
              </div>
            </TabsContent>

            <TabsContent value="dispo" className="mt-0 px-1 pt-4">
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                <p className="text-gray-500">Aba de Disponibilidade — Fase 4B.5</p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

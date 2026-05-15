'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { API_URL } from '@/lib/config'
import { getToken } from '@/lib/auth'
import {
  DEFAULT_PRODUCT_ORDER_TYPES,
  DEFAULT_PRODUCT_AVAILABLE_LINKS,
} from '@/lib/product-defaults'
import { ImageUploader } from '@/app/dashboard/catalogo/components/ImageUploader'
import { useUploadProductImage, deleteProductImage } from '../hooks/useUploadProductImage'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CategoryDto } from '@/lib/category-types'
import type { ProductDto, ProductLabel, ProductUnit } from '@/lib/product-types'

interface Props {
  product: ProductDto | null
  categorias: CategoryDto[]
  onSaved: (saved: ProductDto) => void
  onCancel: () => void
}

const EMPTY_ERRORS: Record<string, string> = {}

export function ProdutoFormInformacoes({ product, categorias, onSaved, onCancel }: Props) {
  const uploadImage = useUploadProductImage()

  // Image
  const [currentImagem, setCurrentImagem] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Identification
  const [nome, setNome] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [codePdv, setCodPdv] = useState('')

  // Price
  const [preco, setPreco] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [isPromotional, setIsPromotional] = useState(false)
  const [precoPromocional, setPrecoPromocional] = useState('')
  const [promoStartsAt, setPromoStartsAt] = useState('')
  const [promoEndsAt, setPromoEndsAt] = useState('')

  // Presentation
  const [labelType, setLabelType] = useState<ProductLabel | 'NONE'>('NONE')
  const [emDestaque, setEmDestaque] = useState(false)

  // Description
  const [descricao, setDescricao] = useState('')

  // Stock
  const [estoqueAtivo, setEstoqueAtivo] = useState(false)
  const [estoque, setEstoque] = useState('0')

  // Advanced
  const [unitOfMeasure, setUnitOfMeasure] = useState<ProductUnit>('UNIT')
  const [useCustomNameKds, setUseCustomNameKds] = useState(false)
  const [customNameKds, setCustomNameKds] = useState('')
  const [hideObservations, setHideObservations] = useState(false)
  const [hideQtyButtons, setHideQtyButtons] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [isAdult, setIsAdult] = useState(false)
  const [isServiceFeeFree, setIsServiceFeeFree] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>(EMPTY_ERRORS)
  const [submitting, setSubmitting] = useState(false)

  const isCreate = product === null

  // Hydrate from product when editing
  useEffect(() => {
    if (!product) {
      setCurrentImagem(null)
      setPendingFile(null)
      setNome('')
      setCategoryId('')
      setCodPdv('')
      setPreco('')
      setCostPrice('')
      setIsPromotional(false)
      setPrecoPromocional('')
      setPromoStartsAt('')
      setPromoEndsAt('')
      setLabelType('NONE')
      setEmDestaque(false)
      setDescricao('')
      setEstoqueAtivo(false)
      setEstoque('0')
      setUnitOfMeasure('UNIT')
      setUseCustomNameKds(false)
      setCustomNameKds('')
      setHideObservations(false)
      setHideQtyButtons(false)
      setIsNew(false)
      setIsAdult(false)
      setIsServiceFeeFree(false)
      setErrors(EMPTY_ERRORS)
      return
    }
    setCurrentImagem(product.imagem)
    setPendingFile(null)
    setNome(product.nome)
    setCategoryId(product.categoryId ? String(product.categoryId) : '')
    setCodPdv(product.codePdv ?? '')
    setPreco(String(product.preco))
    setCostPrice(product.costPrice ?? '')
    setIsPromotional(product.isPromotional)
    setPrecoPromocional(product.precoPromocional ? String(product.precoPromocional) : '')
    setPromoStartsAt(
      product.promoStartsAt ? product.promoStartsAt.slice(0, 16) : '',
    )
    setPromoEndsAt(
      product.promoEndsAt ? product.promoEndsAt.slice(0, 16) : '',
    )
    setLabelType(product.labelType ?? 'NONE')
    setEmDestaque(product.emDestaque)
    setDescricao(product.descricao ?? '')
    setEstoqueAtivo(product.estoqueAtivo)
    setEstoque(String(product.estoque))
    setUnitOfMeasure(product.unitOfMeasure)
    setUseCustomNameKds(product.useCustomNameKds)
    setCustomNameKds(product.customNameKds ?? '')
    setHideObservations(product.hideObservations)
    setHideQtyButtons(product.hideQtyButtons)
    setIsNew(product.isNew)
    setIsAdult(product.isAdult)
    setIsServiceFeeFree(product.isServiceFeeFree)
    setErrors(EMPTY_ERRORS)
  }, [product])

  async function handleRemoveImage() {
    if (product?.id && product.imagem) {
      await deleteProductImage(product.id)
    }
    setPendingFile(null)
    setCurrentImagem(null)
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!nome.trim()) errs.nome = 'Nome obrigatório'
    if (nome.length > 200) errs.nome = 'Máximo 200 caracteres'
    if (!categoryId) errs.categoryId = 'Categoria obrigatória'
    const precoNum = parseFloat(preco)
    if (!preco || isNaN(precoNum) || precoNum <= 0) errs.preco = 'Preço deve ser maior que zero'
    if (costPrice && parseFloat(costPrice) < 0) errs.costPrice = 'Custo não pode ser negativo'
    if (isPromotional) {
      const promoNum = parseFloat(precoPromocional)
      if (!precoPromocional || isNaN(promoNum) || promoNum <= 0) {
        errs.promoPrice = 'Preço promocional obrigatório quando ativado'
      } else if (promoNum >= precoNum) {
        errs.promoPrice = 'Preço promocional deve ser menor que o de venda'
      }
      if (promoStartsAt && promoEndsAt && new Date(promoStartsAt) >= new Date(promoEndsAt)) {
        errs.promoDate = 'Data fim deve ser maior que data início'
      }
    }
    if (useCustomNameKds && !customNameKds.trim()) {
      errs.customNameKds = 'Nome KDS obrigatório quando ativado'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    const headers = () => ({
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    })

    try {
      const payload = {
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        preco: parseFloat(preco),
        precoPromocional: isPromotional && precoPromocional ? parseFloat(precoPromocional) : null,
        categoryId: parseInt(categoryId),
        codePdv: codePdv.trim() || undefined,
        costPrice: costPrice ? costPrice.trim() : undefined,
        labelType: labelType === 'NONE' ? null : labelType,
        emDestaque,
        isPromotional,
        promoStartsAt: isPromotional && promoStartsAt ? new Date(promoStartsAt).toISOString() : null,
        promoEndsAt: isPromotional && promoEndsAt ? new Date(promoEndsAt).toISOString() : null,
        estoqueAtivo,
        estoque: estoqueAtivo ? parseInt(estoque) || 0 : 0,
        unitOfMeasure,
        useCustomNameKds,
        customNameKds: useCustomNameKds ? customNameKds.trim() || null : null,
        hideObservations,
        hideQtyButtons,
        isNew,
        isAdult,
        isServiceFeeFree,
        ...(isCreate && {
          orderTypes: [...DEFAULT_PRODUCT_ORDER_TYPES],
          availableLinks: [...DEFAULT_PRODUCT_AVAILABLE_LINKS],
          disponivel: true,
        }),
      }

      let saved: ProductDto

      if (isCreate) {
        const res = await fetch(`${API_URL}/products`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json() as { message?: string }).message ?? 'Erro ao criar')
        saved = await res.json() as ProductDto

        if (pendingFile) {
          setUploading(true)
          try {
            const url = await uploadImage(saved.id, pendingFile, setUploadProgress)
            saved = { ...saved, imagem: url }
            setCurrentImagem(url)
          } catch (e: unknown) {
            toast.error(`Produto criado, mas upload falhou: ${(e as Error).message}`)
          } finally {
            setUploading(false)
            setPendingFile(null)
          }
        }
        toast.success('Produto criado')
      } else {
        if (pendingFile) {
          setUploading(true)
          try {
            const url = await uploadImage(product!.id, pendingFile, setUploadProgress)
            setCurrentImagem(url)
            setPendingFile(null)
          } catch (e: unknown) {
            toast.error(`Upload falhou: ${(e as Error).message}`)
            setUploading(false)
            setSubmitting(false)
            return
          } finally {
            setUploading(false)
          }
        }

        const res = await fetch(`${API_URL}/products/${product!.id}`, {
          method: 'PATCH',
          headers: headers(),
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json() as { message?: string }).message ?? 'Erro ao atualizar')
        saved = await res.json() as ProductDto
        toast.success('Produto atualizado')
      }

      onSaved(saved)
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6 pb-6">
      {/* Seção 1: Imagem */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Imagem do produto</h3>
        <div className="max-w-xs">
          <ImageUploader
            value={currentImagem}
            pendingFile={pendingFile}
            onFileSelected={setPendingFile}
            onRemove={handleRemoveImage}
            disabled={submitting}
            uploading={uploading}
            progress={uploadProgress}
          />
        </div>
      </section>

      {/* Seção 2: Identificação */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Identificação</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="prod-nome">Nome do produto *</Label>
            <Input
              id="prod-nome"
              autoFocus
              required
              maxLength={200}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Pizza Margherita"
              disabled={submitting}
            />
            {errors.nome && <p role="alert" className="text-xs text-red-600">{errors.nome}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prod-cat">Categoria *</Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={submitting}>
              <SelectTrigger id="prod-cat">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && <p role="alert" className="text-xs text-red-600">{errors.categoryId}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prod-pdv">Código PDV</Label>
            <Input
              id="prod-pdv"
              maxLength={100}
              value={codePdv}
              onChange={(e) => setCodPdv(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prod-int">Código interno</Label>
            <Input
              id="prod-int"
              value={product?.internalCode ?? ''}
              placeholder="Gerado automaticamente"
              disabled
              className="bg-gray-50"
            />
          </div>
        </div>
      </section>

      {/* Seção 3: Preço */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Preço</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="prod-preco">Preço de venda *</Label>
            <Input
              id="prod-preco"
              type="number"
              step="0.01"
              min="0"
              required
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              disabled={submitting}
              placeholder="0,00"
            />
            {errors.preco && <p role="alert" className="text-xs text-red-600">{errors.preco}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prod-custo">Preço de custo</Label>
            <Input
              id="prod-custo"
              type="number"
              step="0.01"
              min="0"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              disabled={submitting}
              placeholder="0,00"
            />
            {errors.costPrice && <p role="alert" className="text-xs text-red-600">{errors.costPrice}</p>}
          </div>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Promocional</p>
            <p className="text-xs text-gray-500">Define um preço promocional temporário</p>
          </div>
          <Switch
            checked={isPromotional}
            onCheckedChange={setIsPromotional}
            disabled={submitting}
          />
        </div>

        {isPromotional && (
          <div className="space-y-4 border-l-2 border-brand-red/30 pl-4">
            <div className="space-y-1.5">
              <Label htmlFor="prod-promo-preco">Preço promocional *</Label>
              <Input
                id="prod-promo-preco"
                type="number"
                step="0.01"
                min="0"
                value={precoPromocional}
                onChange={(e) => setPrecoPromocional(e.target.value)}
                disabled={submitting}
                placeholder="0,00"
              />
              {errors.promoPrice && <p role="alert" className="text-xs text-red-600">{errors.promoPrice}</p>}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="prod-promo-start">Início (opcional)</Label>
                <Input
                  id="prod-promo-start"
                  type="datetime-local"
                  value={promoStartsAt}
                  onChange={(e) => setPromoStartsAt(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prod-promo-end">Fim (opcional)</Label>
                <Input
                  id="prod-promo-end"
                  type="datetime-local"
                  value={promoEndsAt}
                  onChange={(e) => setPromoEndsAt(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
            {errors.promoDate && <p role="alert" className="text-xs text-red-600">{errors.promoDate}</p>}
            <p className="text-xs text-gray-500">Sem datas, a promoção fica ativa indefinidamente.</p>
          </div>
        )}
      </section>

      {/* Seção 4: Apresentação */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Apresentação</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="prod-etiqueta">Etiqueta</Label>
            <Select
              value={labelType}
              onValueChange={(v) => setLabelType(v as ProductLabel | 'NONE')}
              disabled={submitting}
            >
              <SelectTrigger id="prod-etiqueta">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Nenhuma</SelectItem>
                <SelectItem value="HIGHLIGHT">Destaque</SelectItem>
                <SelectItem value="RECOMMENDED">Recomendado</SelectItem>
                <SelectItem value="NEW">Novidade</SelectItem>
                <SelectItem value="LIMITED_EDITION">Edição limitada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <Label htmlFor="prod-destaque" className="cursor-pointer text-sm">
              Mostrar em destaque
            </Label>
            <Switch
              id="prod-destaque"
              checked={emDestaque}
              onCheckedChange={setEmDestaque}
              disabled={submitting}
            />
          </div>
        </div>
      </section>

      {/* Seção 5: Descrição */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="prod-desc">Descrição</Label>
          <button
            type="button"
            disabled
            className="cursor-not-allowed text-xs text-gray-400"
            title="Em breve"
          >
            ✨ Melhorar com IA (em breve)
          </button>
        </div>
        <Textarea
          id="prod-desc"
          rows={4}
          maxLength={2000}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descreva o produto..."
          disabled={submitting}
        />
        <p className="text-xs text-gray-500">Suporta markdown: *negrito*, _itálico_, ~riscado~</p>
      </section>

      {/* Seção 6: Estoque */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Estoque</h3>
        <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Controle de estoque</p>
            <p className="text-xs text-gray-500">Bloqueia vendas quando estoque chega a zero</p>
          </div>
          <Switch
            checked={estoqueAtivo}
            onCheckedChange={setEstoqueAtivo}
            disabled={submitting}
          />
        </div>

        {estoqueAtivo && (
          <div className="space-y-1.5">
            <Label htmlFor="prod-estoque">Estoque atual</Label>
            <Input
              id="prod-estoque"
              type="number"
              min="0"
              value={estoque}
              onChange={(e) => setEstoque(e.target.value)}
              disabled={submitting}
            />
          </div>
        )}
      </section>

      {/* Seção 7: Configurações avançadas */}
      <Accordion type="single" collapsible className="rounded-lg border border-gray-200">
        <AccordionItem value="advanced" className="border-none">
          <AccordionTrigger className="px-4 hover:no-underline">
            <span className="text-sm font-semibold text-gray-900">Configurações avançadas</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 px-4 pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="prod-unit">Unidade de medida</Label>
              <Select
                value={unitOfMeasure}
                onValueChange={(v) => setUnitOfMeasure(v as ProductUnit)}
                disabled={submitting}
              >
                <SelectTrigger id="prod-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNIT">Unidade</SelectItem>
                  <SelectItem value="KG">Quilograma (kg)</SelectItem>
                  <SelectItem value="GRAM">Grama (g)</SelectItem>
                  <SelectItem value="LITER">Litro (l)</SelectItem>
                  <SelectItem value="ML">Mililitro (ml)</SelectItem>
                  <SelectItem value="PORTION">Porção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">
                🖨️ Áreas de impressão (cozinha, bar, etc) — em breve, integração com gestão de setores
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="prod-kds" className="flex-1 cursor-pointer text-sm">
                  Usar nome personalizado para via de produção e KDS
                </Label>
                <Switch
                  id="prod-kds"
                  checked={useCustomNameKds}
                  onCheckedChange={setUseCustomNameKds}
                  disabled={submitting}
                />
              </div>
              {useCustomNameKds && (
                <Input
                  value={customNameKds}
                  onChange={(e) => setCustomNameKds(e.target.value)}
                  placeholder="Nome usado na cozinha"
                  maxLength={200}
                  disabled={submitting}
                />
              )}
              {errors.customNameKds && (
                <p role="alert" className="text-xs text-red-600">{errors.customNameKds}</p>
              )}
            </div>

            <div className="space-y-1">
              {(
                [
                  { key: 'hideObservations', label: 'Esconder campo de observações', checked: hideObservations, set: setHideObservations },
                  { key: 'hideQtyButtons', label: 'Esconder botões de quantidades', checked: hideQtyButtons, set: setHideQtyButtons },
                  { key: 'isNew', label: 'Mostrar como novidade', checked: isNew, set: setIsNew },
                  { key: 'isAdult', label: 'Produto para maiores de 18 anos', checked: isAdult, set: setIsAdult },
                  { key: 'isServiceFeeFree', label: 'Isento da taxa de serviço', checked: isServiceFeeFree, set: setIsServiceFeeFree },
                ] as const
              ).map(({ key, label, checked, set }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-gray-50"
                >
                  <Label htmlFor={`prod-${key}`} className="flex-1 cursor-pointer text-sm">
                    {label}
                  </Label>
                  <Switch
                    id={`prod-${key}`}
                    checked={checked}
                    onCheckedChange={set}
                    disabled={submitting}
                  />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Footer */}
      <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting || uploading}
          className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red/90 disabled:opacity-50"
        >
          {submitting ? 'Salvando…' : isCreate ? 'Criar produto' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}

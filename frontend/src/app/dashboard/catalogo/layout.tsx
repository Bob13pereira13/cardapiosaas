import { ReactNode } from 'react'
import { PageHeader } from '@/components/admin/PageHeader'
import { CatalogoTabs } from './components/CatalogoTabs'

export default function CatalogoLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <PageHeader
        title="Catálogo"
        description="Gerencie produtos, complementos e opções"
      />
      <CatalogoTabs />
      {children}
    </div>
  )
}

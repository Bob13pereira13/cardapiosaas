'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminToken } from '@/lib/auth'

export default function AdminHomePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace(getAdminToken() ? '/admin/dashboard' : '/admin/login')
  }, [router])

  return null
}

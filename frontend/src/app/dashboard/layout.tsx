'use client'

import { useEffect, useState } from 'react'
import { DashboardShell } from '@/components/admin/DashboardShell'
import { API_URL } from '@/lib/config'
import { getToken } from '@/lib/auth'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [slug, setSlug] = useState<string | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      window.location.href = '/login'
      return
    }

    fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((data) => {
        setSlug(data.slug ?? null)
        setSubscriptionStatus(data.subscriptionStatus ?? null)
        if ((!data.slug || !data.whatsapp) && window.location.pathname !== '/dashboard/onboarding') {
          window.location.href = '/dashboard/onboarding'
        }
      })
      .catch(() => {})
  }, [])

  function logout() {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  return (
    <DashboardShell slug={slug} subscriptionStatus={subscriptionStatus} onLogout={logout}>
      {children}
    </DashboardShell>
  )
}

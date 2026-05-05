export function getToken(): string | null {
  if (typeof window === 'undefined') return null

  const token = localStorage.getItem('token')
  if (!token) return null

  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (Date.now() >= payload.exp * 1000) {
      localStorage.removeItem('token')
      return null
    }
    return token
  } catch {
    localStorage.removeItem('token')
    return null
  }
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null

  const token = localStorage.getItem('adminToken')
  if (!token) return null

  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (Date.now() >= payload.exp * 1000 || payload.role !== 'ADMIN') {
      localStorage.removeItem('adminToken')
      return null
    }
    return token
  } catch {
    localStorage.removeItem('adminToken')
    return null
  }
}

export function requireAuth(): string {
  const token = getToken()
  if (!token) {
    window.location.href = '/login'
    throw new Error('Não autenticado')
  }
  return token
}

export function handleUnauthorized(res: Response) {
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    return true
  }
  return false
}

export function handleAdminUnauthorized(res: Response) {
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('adminToken')
    window.location.href = '/admin/login'
    return true
  }
  return false
}

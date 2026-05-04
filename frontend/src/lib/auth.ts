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

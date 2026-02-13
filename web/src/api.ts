import type { DashboardResponse } from './types'

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '' : 'http://localhost:8000')

export async function fetchDashboard(): Promise<DashboardResponse> {
  const res = await fetch(`${API_BASE}/api/dashboard`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail?.error || `API error: ${res.status}`)
  }
  return res.json()
}

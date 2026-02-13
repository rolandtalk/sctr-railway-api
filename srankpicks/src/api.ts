import type { SctrPerformanceResponse, PricePerformanceResponse, ReboundIndexResponse, DashboardResponse } from './types'

// VITE_API_URL must be set at build time in Cloudflare (e.g. your Railway URL)
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://web-production-1b15c.up.railway.app' : 'http://localhost:8000')

export async function fetchSctrPerformance(): Promise<SctrPerformanceResponse> {
  const res = await fetch(`${API_BASE}/api/sctr-performance`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail?.error || `API error: ${res.status}`)
  }
  return res.json()
}

export async function fetchQqqPerformance(): Promise<PricePerformanceResponse> {
  const res = await fetch(`${API_BASE}/api/price-performance?symbols=QQQ`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail?.error || `API error: ${res.status}`)
  }
  return res.json()
}

export async function fetchReboundIndex(): Promise<ReboundIndexResponse> {
  const res = await fetch(`${API_BASE}/api/rebound-index`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail?.error || `API error: ${res.status}`)
  }
  return res.json()
}

/** Single fast endpoint: one scrape + parallel yfinance for all 60 symbols */
export async function fetchDashboard(): Promise<DashboardResponse> {
  const res = await fetch(`${API_BASE}/api/dashboard`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail?.error || `API error: ${res.status}`)
  }
  return res.json()
}

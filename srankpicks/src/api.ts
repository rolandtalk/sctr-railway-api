import type { SctrPerformanceResponse, PricePerformanceResponse } from './types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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

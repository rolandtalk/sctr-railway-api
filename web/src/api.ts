import type { DashboardResponse } from './types'

// In dev we use same-origin so Vite proxy can forward to Railway (avoids CORS)
const API_BASE = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || '')
  : ''

export async function fetchDashboard(): Promise<DashboardResponse> {
  const url = `${API_BASE}/api/dashboard`
  const res = await fetch(url)
  const text = await res.text()
  if (!res.ok) {
    try {
      const err = JSON.parse(text)
      throw new Error(err.detail?.error || `API error: ${res.status}`)
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('API error:')) throw e
      throw new Error(`API error: ${res.status}. Set VITE_API_URL to your 300-stock API (e.g. http://localhost:8000).`)
    }
  }
  try {
    return JSON.parse(text) as DashboardResponse
  } catch {
    if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().startsWith('<!')) {
      throw new Error(
        'Server returned HTML instead of JSON. Is VITE_API_URL pointing at your API service (FastAPI), not the frontend? ' +
          'In Railway, use the URL of the service that runs the Python API (main.py), not the React app.'
      )
    }
    throw new Error('Invalid API response. Set VITE_API_URL to your 300-stock API (e.g. http://localhost:8000).')
  }
}

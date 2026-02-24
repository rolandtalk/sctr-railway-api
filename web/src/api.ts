import type { DashboardResponse, ReboundResponse } from './types'

// In dev we use same-origin so Vite proxy can forward to Railway (avoids CORS)
const API_BASE = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || '')
  : ''

async function fetchApi<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url)
  const text = await res.text()
  if (!res.ok) {
    try {
      const err = JSON.parse(text)
      throw new Error(err.detail?.error || `API error: ${res.status}`)
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('API error:')) throw e
      throw new Error(`API error: ${res.status}. Set VITE_API_URL to your API URL (e.g. your Railway API URL, or http://localhost:8000 for local).`)
    }
  }
  try {
    return JSON.parse(text) as T
  } catch {
    if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().startsWith('<!')) {
      throw new Error(
        'Server returned HTML instead of JSON. Is VITE_API_URL pointing at your API service (FastAPI), not the frontend? ' +
          'In Railway, use the URL of the service that runs the Python API (main.py), not the React app.'
      )
    }
    throw new Error('Invalid API response. Set VITE_API_URL to your API URL (e.g. your Railway API URL, or http://localhost:8000 for local).')
  }
}

export async function fetchDashboard(): Promise<DashboardResponse> {
  return fetchApi<DashboardResponse>('/api/dashboard')
}

export async function fetchRebound(): Promise<ReboundResponse> {
  return fetchApi<ReboundResponse>('/api/rebound')
}

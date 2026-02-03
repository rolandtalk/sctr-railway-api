export interface SctrRow {
  rank: number
  symbol: string
  name?: string
  perf5d: number | null
  perf20d: number | null
  perf60d: number | null
}

export interface SctrPerformanceResponse {
  data: SctrRow[]
}

export interface PricePerformanceRow {
  symbol: string
  perf5d: number | null
  perf20d: number | null
  perf60d: number | null
}

export interface PricePerformanceResponse {
  data: PricePerformanceRow[]
}

export type SortKey = 'perf5d' | 'perf20d' | 'perf60d'
export type SortDir = 'asc' | 'desc'

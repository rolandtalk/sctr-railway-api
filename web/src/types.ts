export interface SctrRow {
  rank: number
  symbol: string
  name?: string
  perf1d: number | null
  perf5d: number | null
  perf20d: number | null
  perf60d: number | null
  rsi_14: number | null
}

export type SortKey = 'perf1d' | 'perf5d' | 'perf20d' | 'perf60d' | 'rsi_14'
export type SortDir = 'asc' | 'desc'

export type CurveShape = 'v_shape' | 'way_up' | 'a_shape' | 'way_down'

export interface ReboundRow {
  rank: number
  symbol: string
  name?: string
  ri: number | null
  p1_pl: number | null
  p5_pl: number | null
  d5_d1_gain_ratio: number | null
  rsi_14: number | null
  curve_shape: CurveShape | null
}

export type ReboundSortKey = 'rank' | 'ri' | 'p1_pl' | 'p5_pl' | 'd5_d1_gain_ratio' | 'rsi_14' | 'curve_shape'

export interface DashboardResponse {
  data: {
    perf: SctrRow[]
    rebound: ReboundRow[]
    qqq: { perf1d: number | null; perf5d: number | null; perf20d: number | null; perf60d: number | null }
  }
}

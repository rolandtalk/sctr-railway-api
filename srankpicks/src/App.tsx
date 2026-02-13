import { useState, useEffect, useMemo } from 'react'
import { fetchDashboard } from './api'
import type { SctrRow, SortKey, SortDir, ReboundRow, ReboundSortKey, CurveShape } from './types'

const CURVE_ORDER: CurveShape[] = ['v_shape', 'way_up', 'a_shape', 'way_down']
const CURVE_SYMBOL: Record<CurveShape, string> = {
  v_shape: 'V',
  way_up: '↗',
  a_shape: 'Λ',
  way_down: '↘',
}
import './App.css'

function formatPct(val: number | null): string {
  if (val == null) return '—'
  const sign = val >= 0 ? '+' : ''
  return `${sign}${val.toFixed(2)}%`
}

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (sortKey !== column) {
    return (
      <span className="sort-icon" aria-hidden>
        ↕
      </span>
    )
  }
  return (
    <span className="sort-icon" aria-hidden>
      {sortDir === 'asc' ? '↑' : '↓'}
    </span>
  )
}

function ReboundSortIcon({
  column,
  sortKey,
  sortDir,
}: {
  column: ReboundSortKey
  sortKey: ReboundSortKey | null
  sortDir: SortDir
}) {
  if (sortKey !== column) {
    return (
      <span className="sort-icon" aria-hidden>
        ↕
      </span>
    )
  }
  return (
    <span className="sort-icon" aria-hidden>
      {sortDir === 'asc' ? '↑' : '↓'}
    </span>
  )
}

function App() {
  const [data, setData] = useState<SctrRow[]>([])
  const [reboundData, setReboundData] = useState<ReboundRow[]>([])
  const [qqq, setQqq] = useState<{ perf1d: number | null; perf5d: number | null; perf20d: number | null; perf60d: number | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  // RI table: default sort by Curve column, order V → ↗ → Λ → ↘ (asc)
  const [reboundSortKey, setReboundSortKey] = useState<ReboundSortKey | null>('curve_shape')
  const [reboundSortDir, setReboundSortDir] = useState<SortDir>('asc')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchDashboard()
        setData(res.data.perf)
        setReboundData(res.data.rebound)
        setQqq(
          res.data.qqq && (res.data.qqq.perf1d != null || res.data.qqq.perf5d != null)
            ? { perf1d: res.data.qqq.perf1d, perf5d: res.data.qqq.perf5d, perf20d: res.data.qqq.perf20d, perf60d: res.data.qqq.perf60d }
            : null
        )
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load data'
        setError(
          msg +
            '. Check that the API is running and VITE_API_URL is set in Cloudflare.',
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const handleReboundSort = (key: ReboundSortKey) => {
    if (reboundSortKey === key) {
      setReboundSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setReboundSortKey(key)
      setReboundSortDir('desc')
    }
  }

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const va = a[sortKey] ?? -Infinity
      const vb = b[sortKey] ?? -Infinity
      return sortDir === 'desc' ? vb - va : va - vb
    })
  }, [data, sortKey, sortDir])

  const sortedReboundData = useMemo(() => {
    if (!reboundSortKey) return reboundData
    if (reboundSortKey === 'curve_shape') {
      return [...reboundData].sort((a, b) => {
        const ia = a.curve_shape ? CURVE_ORDER.indexOf(a.curve_shape) : -1
        const ib = b.curve_shape ? CURVE_ORDER.indexOf(b.curve_shape) : -1
        return reboundSortDir === 'desc' ? ib - ia : ia - ib
      })
    }
    return [...reboundData].sort((a, b) => {
      const va = a[reboundSortKey] ?? -Infinity
      const vb = b[reboundSortKey] ?? -Infinity
      const vA = Number(va)
      const vB = Number(vb)
      return reboundSortDir === 'desc' ? vB - vA : vA - vB
    })
  }, [reboundData, reboundSortKey, reboundSortDir])

  const portfolio60d = useMemo(() => {
    const perStock = 100
    const invested = data.length * perStock
    const totalValue = data.reduce((sum, row) => {
      const pct = row.perf60d ?? 0
      return sum + perStock * (1 + pct / 100)
    }, 0)
    const profit = totalValue - invested
    const pct = invested > 0 ? (profit / invested) * 100 : 0
    return { profit, pct }
  }, [data])

  const portfolio20d = useMemo(() => {
    const perStock = 100
    const invested = data.length * perStock
    const totalValue = data.reduce((sum, row) => {
      const pct = row.perf20d ?? 0
      return sum + perStock * (1 + pct / 100)
    }, 0)
    const profit = totalValue - invested
    const pct = invested > 0 ? (profit / invested) * 100 : 0
    return { profit, pct }
  }, [data])

  const PerfCell = ({ val }: { val: number | null }) => {
    if (val == null) return <td>—</td>
    const positive = val >= 0
    return (
      <td className={positive ? 'positive' : 'negative'}>
        {formatPct(val)}
      </td>
    )
  }

  const formatRatio = (val: number | null): string => {
    if (val == null) return '—'
    const pct = val * 100
    const sign = pct >= 0 ? '+' : ''
    return `${sign}${pct.toFixed(2)}%`
  }

  return (
    <div className="app">
      <header>
        <h1>60 Best Srank Picks</h1>
      </header>

      <main>
        {loading && <p className="status">Loading…</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <>
            <div className="table-wrap rebound-table">
              <h2 className="table-title">Rebound Index (RI)</h2>
              <table>
                <thead>
                  <tr>
                    <th className="rank-symbol">
                      <button type="button" className="sort-btn" onClick={() => handleReboundSort('rank')}>
                        RNK/SYM <ReboundSortIcon column="rank" sortKey={reboundSortKey} sortDir={reboundSortDir} />
                      </button>
                    </th>
                    <th>
                      <button type="button" className="sort-btn" onClick={() => handleReboundSort('curve_shape')}>
                        Curve <ReboundSortIcon column="curve_shape" sortKey={reboundSortKey} sortDir={reboundSortDir} />
                      </button>
                    </th>
                    <th>
                      <button type="button" className="sort-btn" onClick={() => handleReboundSort('ri')}>
                        RI <ReboundSortIcon column="ri" sortKey={reboundSortKey} sortDir={reboundSortDir} />
                      </button>
                    </th>
                    <th>
                      <button type="button" className="sort-btn" onClick={() => handleReboundSort('p1_pl')}>
                        P1-PL <ReboundSortIcon column="p1_pl" sortKey={reboundSortKey} sortDir={reboundSortDir} />
                      </button>
                    </th>
                    <th>
                      <button type="button" className="sort-btn" onClick={() => handleReboundSort('p5_pl')}>
                        P5-PL <ReboundSortIcon column="p5_pl" sortKey={reboundSortKey} sortDir={reboundSortDir} />
                      </button>
                    </th>
                    <th>
                      <button type="button" className="sort-btn" onClick={() => handleReboundSort('d5_d1_gain_ratio')}>
                        (D5-D1) gain ratio <ReboundSortIcon column="d5_d1_gain_ratio" sortKey={reboundSortKey} sortDir={reboundSortDir} />
                      </button>
                    </th>
                    <th>
                      <button type="button" className="sort-btn" onClick={() => handleReboundSort('rsi_14')}>
                        RSI (14D) <ReboundSortIcon column="rsi_14" sortKey={reboundSortKey} sortDir={reboundSortDir} />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedReboundData.map((row) => (
                    <tr key={row.symbol}>
                      <td className="rank-symbol">
                        <span className="rank">{row.rank}</span> {row.symbol}
                      </td>
                      <td className="num curve-cell" title={row.curve_shape ?? undefined}>
                        {row.curve_shape ? CURVE_SYMBOL[row.curve_shape] : '—'}
                      </td>
                      <td className="num">{row.ri != null ? Math.round(row.ri).toLocaleString() : '—'}</td>
                      <td className="num">{row.p1_pl != null ? row.p1_pl.toFixed(2) : '—'}</td>
                      <td className="num">{row.p5_pl != null ? row.p5_pl.toFixed(2) : '—'}</td>
                      <td className={`num ${row.d5_d1_gain_ratio != null && row.d5_d1_gain_ratio >= 0 ? 'positive' : row.d5_d1_gain_ratio != null ? 'negative' : ''}`}>
                        {row.d5_d1_gain_ratio != null ? formatRatio(row.d5_d1_gain_ratio) : '—'}
                      </td>
                      <td className="num">{row.rsi_14 != null ? row.rsi_14.toFixed(1) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {qqq && (
              <div className="ref-window table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="rank-symbol">REF</th>
                      <th>1D</th>
                      <th>5D</th>
                      <th>20D</th>
                      <th>60D</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="rank-symbol">QQQ</td>
                      <PerfCell val={qqq.perf1d} />
                      <PerfCell val={qqq.perf5d} />
                      <PerfCell val={qqq.perf20d} />
                      <PerfCell val={qqq.perf60d} />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="rank-symbol">RNK/SYM</th>
                    <th>
                      <button type="button" className="sort-btn" onClick={() => handleSort('perf1d')}>
                        1D <SortIcon column="perf1d" sortKey={sortKey} sortDir={sortDir} />
                      </button>
                    </th>
                    <th>
                      <button type="button" className="sort-btn" onClick={() => handleSort('perf5d')}>
                        5D <SortIcon column="perf5d" sortKey={sortKey} sortDir={sortDir} />
                      </button>
                    </th>
                    <th>
                      <button type="button" className="sort-btn" onClick={() => handleSort('perf20d')}>
                        20D <SortIcon column="perf20d" sortKey={sortKey} sortDir={sortDir} />
                      </button>
                    </th>
                    <th>
                      <button type="button" className="sort-btn" onClick={() => handleSort('perf60d')}>
                        60D <SortIcon column="perf60d" sortKey={sortKey} sortDir={sortDir} />
                      </button>
                    </th>
                    <th>
                      <button type="button" className="sort-btn" onClick={() => handleSort('rsi_14')}>
                        RSI (14D) <SortIcon column="rsi_14" sortKey={sortKey} sortDir={sortDir} />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((row) => (
                    <tr key={row.symbol}>
                      <td className="rank-symbol">
                        <span className="rank">{row.rank}</span> {row.symbol}
                      </td>
                      <PerfCell val={row.perf1d} />
                      <PerfCell val={row.perf5d} />
                      <PerfCell val={row.perf20d} />
                      <PerfCell val={row.perf60d} />
                      <td className="num">{row.rsi_14 != null ? row.rsi_14.toFixed(1) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="portfolio-summaries">
              <p className="portfolio-summary">
                If you invested USD$100 for each of the stocks, the amount you earn in 60D is{' '}
                <span className={portfolio60d.profit >= 0 ? 'positive' : 'negative'}>
                  ${portfolio60d.profit >= 0 ? '+' : ''}{portfolio60d.profit.toFixed(2)}
                </span>{' '}
                or{' '}
                <span className={portfolio60d.pct >= 0 ? 'positive' : 'negative'}>
                  {portfolio60d.pct >= 0 ? '+' : ''}{portfolio60d.pct.toFixed(2)}%
                </span>
                .
              </p>
              <p className="portfolio-summary">
                If you invested USD$100 for each of the stocks, the amount you earn in 20D is{' '}
                <span className={portfolio20d.profit >= 0 ? 'positive' : 'negative'}>
                  ${portfolio20d.profit >= 0 ? '+' : ''}{portfolio20d.profit.toFixed(2)}
                </span>{' '}
                or{' '}
                <span className={portfolio20d.pct >= 0 ? 'positive' : 'negative'}>
                  {portfolio20d.pct >= 0 ? '+' : ''}{portfolio20d.pct.toFixed(2)}%
                </span>
                .
              </p>
            </div>
          </>
        )}
      </main>

      <footer>
        <div className="contributor">
          <span>CONTRIBUTOR</span>
          <span className="version">HTH srankpicks v00.20260203</span>
        </div>
      </footer>
    </div>
  )
}

export default App

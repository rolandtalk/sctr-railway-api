import { useState, useEffect, useMemo } from 'react'
import { fetchSctrPerformance, fetchQqqPerformance } from './api'
import type { SctrRow, SortKey, SortDir } from './types'
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

function App() {
  const [data, setData] = useState<SctrRow[]>([])
  const [qqq, setQqq] = useState<{ perf5d: number | null; perf20d: number | null; perf60d: number | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [perf, qqqRes] = await Promise.all([
          fetchSctrPerformance(),
          fetchQqqPerformance(),
        ])
        setData(perf.data)
        const qqqRow = qqqRes.data.find((r) => r.symbol === 'QQQ')
        setQqq(qqqRow ? { perf5d: qqqRow.perf5d, perf20d: qqqRow.perf20d, perf60d: qqqRow.perf60d } : null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load data')
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

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const va = a[sortKey] ?? -Infinity
      const vb = b[sortKey] ?? -Infinity
      return sortDir === 'desc' ? vb - va : va - vb
    })
  }, [data, sortKey, sortDir])

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

  return (
    <div className="app">
      <header>
        <h1>30 Best Srank Picks</h1>
      </header>

      <main>
        {loading && <p className="status">Loading…</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <>
            {qqq && (
              <div className="ref-window table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="rank-symbol">REF</th>
                      <th>5D</th>
                      <th>20D</th>
                      <th>60D</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="rank-symbol">QQQ</td>
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
                    <th className="rank-symbol">RANK SYMBOL</th>
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
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((row) => (
                    <tr key={row.symbol}>
                      <td className="rank-symbol">
                        <span className="rank">{row.rank}</span> {row.symbol}
                      </td>
                      <PerfCell val={row.perf5d} />
                      <PerfCell val={row.perf20d} />
                      <PerfCell val={row.perf60d} />
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

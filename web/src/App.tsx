import { useState, useEffect, useMemo } from 'react'
import { fetchDashboard, fetchRebound } from './api'
import type { SctrRow, SortKey, SortDir, ReboundRow, ReboundSortKey, CurveShape } from './types'

type Route = 'perf' | 'rebound'

function getRouteFromHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '').toLowerCase()
  return h === 'rebound' ? 'rebound' : 'perf'
}

const CURVE_ORDER: CurveShape[] = ['v_shape', 'way_up', 'a_shape', 'way_down']
const CURVE_SYMBOL: Record<CurveShape, string> = {
  v_shape: 'V',
  way_up: '↗',
  a_shape: 'Λ',
  way_down: '↘',
}
const PAGE_SIZE = 50

import './App.css'

function formatPct(val: number | null): string {
  if (val == null) return '—'
  const sign = val >= 0 ? '+' : ''
  return `${sign}${val.toFixed(2)}%`
}

function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function exportPerformanceToCsv(rows: SctrRow[]): void {
  const keys: (keyof SctrRow)[] = ['perf1d', 'perf5d', 'perf20d', 'perf60d']
  const meanStd = keys.map((key) => {
    const vals = rows.map((r) => r[key]).filter((v): v is number => v != null)
    const n = vals.length
    if (n === 0) return { mean: null as number | null, std: null as number | null }
    const mean = vals.reduce((a, b) => a + b, 0) / n
    const variance = n < 2 ? 0 : vals.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (n - 1)
    return { mean, std: Math.sqrt(variance) }
  })

  const headers = ['Rank', 'Symbol', 'Name', '1D (%)', '5D (%)', '20D (%)', '60D (%)', 'RSI (14)']
  const toRow = (cells: (string | number)[]) =>
    cells.map((c) => escapeCsvCell(String(c ?? ''))).join(',')
  const lines: string[] = [toRow(headers)]
  // Mean row (must be written so Google Sheets import includes it)
  lines.push(
    toRow([
      'Mean',
      '',
      '',
      meanStd[0].mean != null ? meanStd[0].mean.toFixed(2) : '',
      meanStd[1].mean != null ? meanStd[1].mean.toFixed(2) : '',
      meanStd[2].mean != null ? meanStd[2].mean.toFixed(2) : '',
      meanStd[3].mean != null ? meanStd[3].mean.toFixed(2) : '',
      '',
    ])
  )
  // Std row
  lines.push(
    toRow([
      'Std',
      '',
      '',
      meanStd[0].std != null ? meanStd[0].std.toFixed(2) : '',
      meanStd[1].std != null ? meanStd[1].std.toFixed(2) : '',
      meanStd[2].std != null ? meanStd[2].std.toFixed(2) : '',
      meanStd[3].std != null ? meanStd[3].std.toFixed(2) : '',
      '',
    ])
  )
  rows.forEach((r) => {
    lines.push(
      toRow([
        r.rank,
        r.symbol,
        r.name ?? '',
        r.perf1d ?? '',
        r.perf5d ?? '',
        r.perf20d ?? '',
        r.perf60d ?? '',
        r.rsi_14 ?? '',
      ])
    )
  })
  const csv = lines.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sctr-performance-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (sortKey !== column) {
    return <span className="sort-icon" aria-hidden>↕</span>
  }
  return <span className="sort-icon" aria-hidden>{sortDir === 'asc' ? '↑' : '↓'}</span>
}

function ReboundSortIcon({
  column,
  sortKey,
  sortDir,
}: { column: ReboundSortKey; sortKey: ReboundSortKey | null; sortDir: SortDir }) {
  if (sortKey !== column) {
    return <span className="sort-icon" aria-hidden>↕</span>
  }
  return <span className="sort-icon" aria-hidden>{sortDir === 'asc' ? '↑' : '↓'}</span>
}

function filterRows<T extends { symbol: string; name?: string }>(rows: T[], query: string): T[] {
  if (!query.trim()) return rows
  const q = query.trim().toLowerCase()
  return rows.filter(
    (r) =>
      r.symbol.toLowerCase().includes(q) ||
      (r.name ?? '').toLowerCase().includes(q)
  )
}

function App() {
  const [route, setRoute] = useState<Route>(getRouteFromHash)
  const [data, setData] = useState<SctrRow[]>([])
  const [qqq, setQqq] = useState<{ perf1d: number | null; perf5d: number | null; perf20d: number | null; perf60d: number | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [perfPage, setPerfPage] = useState(0)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const [reboundData, setReboundData] = useState<ReboundRow[]>([])
  const [reboundLoading, setReboundLoading] = useState(false)
  const [reboundError, setReboundError] = useState<string | null>(null)
  const [reboundSearch, setReboundSearch] = useState('')
  const [reboundPage, setReboundPage] = useState(0)
  const [reboundSortKey, setReboundSortKey] = useState<ReboundSortKey | null>('curve_shape')
  const [reboundSortDir, setReboundSortDir] = useState<SortDir>('asc')

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchDashboard()
        setData(res.data.perf ?? [])
        setQqq(
          res.data.qqq && (res.data.qqq.perf1d != null || res.data.qqq.perf5d != null)
            ? { perf1d: res.data.qqq.perf1d, perf5d: res.data.qqq.perf5d, perf20d: res.data.qqq.perf20d, perf60d: res.data.qqq.perf60d }
            : null
        )
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load data'
        const hint = ' Set VITE_API_URL to your 300-stock API (e.g. http://localhost:8000).'
        setError(msg.includes('VITE_API_URL') ? msg : msg + '.' + hint)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (route !== 'rebound') return
    let cancelled = false
    setReboundLoading(true)
    setReboundError(null)
    fetchRebound()
      .then((res) => {
        if (!cancelled) setReboundData(res.data.rebound ?? [])
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Failed to load rebound data'
          const hint = ' Set VITE_API_URL to your 300-stock API (e.g. http://localhost:8000).'
          setReboundError(msg.includes('VITE_API_URL') ? msg : msg + '.' + hint)
        }
      })
      .finally(() => {
        if (!cancelled) setReboundLoading(false)
      })
    return () => { cancelled = true }
  }, [route])

  const filteredPerf = useMemo(() => filterRows(data, search), [data, search])
  const filteredRebound = useMemo(() => filterRows(reboundData, reboundSearch), [reboundData, reboundSearch])

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredPerf
    return [...filteredPerf].sort((a, b) => {
      const va = a[sortKey] ?? -Infinity
      const vb = b[sortKey] ?? -Infinity
      return sortDir === 'desc' ? (vb as number) - (va as number) : (va as number) - (vb as number)
    })
  }, [filteredPerf, sortKey, sortDir])

  const sortedReboundData = useMemo(() => {
    if (!reboundSortKey) return filteredRebound
    if (reboundSortKey === 'curve_shape') {
      return [...filteredRebound].sort((a, b) => {
        const ia = a.curve_shape ? CURVE_ORDER.indexOf(a.curve_shape) : -1
        const ib = b.curve_shape ? CURVE_ORDER.indexOf(b.curve_shape) : -1
        return reboundSortDir === 'desc' ? ib - ia : ia - ib
      })
    }
    return [...filteredRebound].sort((a, b) => {
      const va = a[reboundSortKey] ?? -Infinity
      const vb = b[reboundSortKey] ?? -Infinity
      const vA = Number(va)
      const vB = Number(vb)
      return reboundSortDir === 'desc' ? vB - vA : vA - vB
    })
  }, [filteredRebound, reboundSortKey, reboundSortDir])

  const totalPerfPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE))
  const totalReboundPages = Math.max(1, Math.ceil(sortedReboundData.length / PAGE_SIZE))
  const paginatedPerf = useMemo(
    () => sortedData.slice(perfPage * PAGE_SIZE, (perfPage + 1) * PAGE_SIZE),
    [sortedData, perfPage]
  )
  const paginatedRebound = useMemo(
    () => sortedReboundData.slice(reboundPage * PAGE_SIZE, (reboundPage + 1) * PAGE_SIZE),
    [sortedReboundData, reboundPage]
  )

  useEffect(() => {
    setPerfPage((p) => Math.min(p, totalPerfPages - 1))
  }, [totalPerfPages])
  useEffect(() => {
    setReboundPage((p) => Math.min(p, totalReboundPages - 1))
  }, [totalReboundPages])

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

  const perfStats = useMemo(() => {
    const keys: SortKey[] = ['perf1d', 'perf5d', 'perf20d', 'perf60d']
    return keys.map((key) => {
      const vals = data.map((r) => r[key]).filter((v): v is number => v != null)
      const n = vals.length
      if (n === 0) return { mean: null, std: null }
      const mean = vals.reduce((a, b) => a + b, 0) / n
      const variance = n < 2 ? 0 : vals.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (n - 1)
      const std = Math.sqrt(variance)
      return { mean, std }
    })
  }, [data])

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
    return <td className={positive ? 'positive' : 'negative'}>{formatPct(val)}</td>
  }

  const formatRatio = (val: number | null): string => {
    if (val == null) return '—'
    const pct = val * 100
    const sign = pct >= 0 ? '+' : ''
    return `${sign}${pct.toFixed(2)}%`
  }

  const paginationUi = (
    total: number,
    page: number,
    totalPages: number,
    setPage: (n: number) => void,
    label: string
  ) => {
    const start = total === 0 ? 0 : page * PAGE_SIZE + 1
    const end = Math.min((page + 1) * PAGE_SIZE, total)
    return (
      <div className="pagination">
        <span>
          {label}: {total === 0 ? '0' : `${start}–${end}`} of {total}
        </span>
        <button type="button" onClick={() => setPage(Math.max(0, page - 1))} disabled={page <= 0}>
          Prev
        </button>
        <button type="button" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>
          Next
        </button>
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <h1>300 Best SCTR Picks</h1>
        <nav className="main-nav">
          <a href="#/" className={route === 'perf' ? 'active' : ''}>Performance</a>
          <a href="#/rebound" className={route === 'rebound' ? 'active' : ''}>Rebound Index</a>
        </nav>
      </header>

      <main>
        {route === 'perf' && (
          <>
            {loading && <p className="status">Loading…</p>}
            {error && <p className="error">{error}</p>}
            {!loading && !error && (
              <>
                <div className="search-and-pagination">
                  <input
                    type="search"
                    placeholder="Filter by symbol or name…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPerfPage(0)
                    }}
                    aria-label="Filter by symbol or name"
                  />
                  {paginationUi(sortedData.length, perfPage, totalPerfPages, setPerfPage, 'Perf')}
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
              <div className="table-title-row">
                <h2 className="table-title">Performance (1D / 5D / 20D / 60D)</h2>
                <button
                  type="button"
                  className="export-btn"
                  onClick={() => exportPerformanceToCsv(sortedData)}
                  title="Download CSV to open in Google Sheets (File → Import)"
                >
                  Export to Google Sheets
                </button>
              </div>
              <div className="search-and-pagination">
                {paginationUi(sortedData.length, perfPage, totalPerfPages, setPerfPage, 'Perf')}
              </div>
              <table>
                <thead>
                  <tr className="stats-row">
                    <th className="rank-symbol" scope="row">Mean</th>
                    <th className={`num ${perfStats[0].mean != null && perfStats[0].mean >= 0 ? 'positive' : perfStats[0].mean != null ? 'negative' : ''}`}>{perfStats[0].mean != null ? formatPct(perfStats[0].mean) : '—'}</th>
                    <th className={`num ${perfStats[1].mean != null && perfStats[1].mean >= 0 ? 'positive' : perfStats[1].mean != null ? 'negative' : ''}`}>{perfStats[1].mean != null ? formatPct(perfStats[1].mean) : '—'}</th>
                    <th className={`num ${perfStats[2].mean != null && perfStats[2].mean >= 0 ? 'positive' : perfStats[2].mean != null ? 'negative' : ''}`}>{perfStats[2].mean != null ? formatPct(perfStats[2].mean) : '—'}</th>
                    <th className={`num ${perfStats[3].mean != null && perfStats[3].mean >= 0 ? 'positive' : perfStats[3].mean != null ? 'negative' : ''}`}>{perfStats[3].mean != null ? formatPct(perfStats[3].mean) : '—'}</th>
                    <th className="num">—</th>
                  </tr>
                  <tr className="stats-row">
                    <th className="rank-symbol" scope="row">Std</th>
                    <th className="num">{perfStats[0].std != null ? perfStats[0].std.toFixed(2) + '%' : '—'}</th>
                    <th className="num">{perfStats[1].std != null ? perfStats[1].std.toFixed(2) + '%' : '—'}</th>
                    <th className="num">{perfStats[2].std != null ? perfStats[2].std.toFixed(2) + '%' : '—'}</th>
                    <th className="num">{perfStats[3].std != null ? perfStats[3].std.toFixed(2) + '%' : '—'}</th>
                    <th className="num">—</th>
                  </tr>
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
                  {paginatedPerf.map((row) => (
                    <tr key={`${row.rank}-${row.symbol}`}>
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
                    If you invested USD$100 for each of the {data.length} stocks, the amount you earn in 60D is{' '}
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
                    If you invested USD$100 for each of the {data.length} stocks, the amount you earn in 20D is{' '}
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
          </>
        )}

        {route === 'rebound' && (
          <>
            {reboundLoading && <p className="status">Loading Rebound Index…</p>}
            {reboundError && <p className="error">{reboundError}</p>}
            {!reboundLoading && !reboundError && (
              <>
                <div className="table-wrap rebound-table">
                  <h2 className="table-title">Rebound Index (RI)</h2>
                  <div className="search-and-pagination">
                    <input
                      type="search"
                      placeholder="Filter by symbol or name…"
                      value={reboundSearch}
                      onChange={(e) => {
                        setReboundSearch(e.target.value)
                        setReboundPage(0)
                      }}
                      aria-label="Filter by symbol or name"
                    />
                    {paginationUi(sortedReboundData.length, reboundPage, totalReboundPages, setReboundPage, 'Rebound')}
                  </div>
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
                      {paginatedRebound.map((row) => (
                        <tr key={`${row.rank}-${row.symbol}`}>
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
              </>
            )}
          </>
        )}
      </main>

      <footer>
        <div className="contributor">
          <span>Contributor</span>
          <span className="version">SCTR 300 Picks V1.0</span>
          <span className="updated">Updated 2026 Feb 25</span>
        </div>
      </footer>
    </div>
  )
}

export default App

"""
SCTR Picks API (300 stocks): Scrape StockCharts SCTR Top 300 + yfinance 5D/20D/60D performance.
Deploy as separate Railway service (Root Directory = api).
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional

import yfinance as yf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from fetch_sctr import fetch_sctr_top300

app = FastAPI(title="SCTR Picks API (300)", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://300spicks-production.up.railway.app",
        "https://sctrpicks.pages.dev",
        "https://srankpicks.pages.dev",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5179",
        "http://127.0.0.1:5179",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5178",
        "http://localhost:5180",
        "http://127.0.0.1:5180",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trading days for 5D, 20D, 60D (we need n+1 bars: current + n days ago)
TRADING_DAYS_5 = 6
TRADING_DAYS_20 = 21
TRADING_DAYS_60 = 61


def _pct_change(current: float, past: float) -> Optional[float]:
    if past is None or past == 0:
        return None
    return round((current - past) / past * 100, 2)


def _perf1d_from_yfinance(ticker: yf.Ticker, last_close_from_hist: Optional[float] = None) -> Optional[float]:
    """1D % = (Close - Previous Close) / Previous Close using yfinance."""
    info = ticker.info
    if not info:
        return None
    prev = info.get("previousClose")
    close = info.get("regularMarketPrice")
    if close is None and last_close_from_hist is not None:
        close = last_close_from_hist
    if prev is None or close is None or prev == 0:
        return None
    try:
        return round((float(close) - float(prev)) / float(prev) * 100, 2)
    except (TypeError, ValueError):
        return None


def get_price_performance(symbol: str) -> Dict[str, Optional[float]]:
    """Get 1D, 5D, 20D, 60D %, and RSI(14) for a symbol using yfinance."""
    ticker = yf.Ticker(symbol)
    hist = ticker.history(period="4mo")
    if hist is None or len(hist) < TRADING_DAYS_60:
        perf1d = _perf1d_from_yfinance(ticker)
        return {"perf1d": perf1d, "perf5d": None, "perf20d": None, "perf60d": None, "rsi_14": None}
    closes = hist["Close"].dropna()
    if len(closes) < TRADING_DAYS_60:
        perf1d = _perf1d_from_yfinance(ticker)
        return {"perf1d": perf1d, "perf5d": None, "perf20d": None, "perf60d": None, "rsi_14": None}
    last = float(closes.iloc[-1])
    closes_list = [float(x) for x in closes.tolist()]
    perf1d = _perf1d_from_yfinance(ticker, last_close_from_hist=last)
    perf5d = _pct_change(last, float(closes.iloc[-TRADING_DAYS_5])) if len(closes) >= TRADING_DAYS_5 else None
    perf20d = _pct_change(last, float(closes.iloc[-TRADING_DAYS_20])) if len(closes) >= TRADING_DAYS_20 else None
    perf60d = _pct_change(last, float(closes.iloc[-TRADING_DAYS_60])) if len(closes) >= TRADING_DAYS_60 else None
    try:
        rsi_14 = _rsi(closes_list, 14) if len(closes_list) >= 15 else None
    except (TypeError, ValueError, ZeroDivisionError, IndexError):
        rsi_14 = None
    return {"perf1d": perf1d, "perf5d": perf5d, "perf20d": perf20d, "perf60d": perf60d, "rsi_14": rsi_14}


REBOUND_DAYS = 5
RSI_PERIOD = 14


def _rsi(closes: List[float], period: int = RSI_PERIOD) -> Optional[float]:
    """RSI = 100 - 100/(1 + RS), RS = avg_gain / avg_loss over period."""
    if len(closes) < period + 1:
        return None
    gains, losses = [], []
    for i in range(-period, 0):
        ch = closes[i] - closes[i - 1]
        gains.append(max(ch, 0.0))
        losses.append(max(-ch, 0.0))
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


def get_symbol_data(symbol: str) -> Dict[str, Any]:
    """
    One yfinance history fetch per symbol; returns both perf and rebound data.
    Used by /api/dashboard for parallel fetching.
    """
    ticker = yf.Ticker(symbol)
    hist = ticker.history(period="4mo")
    if hist is None or len(hist) < TRADING_DAYS_60:
        perf1d = _perf1d_from_yfinance(ticker)
        return {
            "perf": {"perf1d": perf1d, "perf5d": None, "perf20d": None, "perf60d": None, "rsi_14": None},
            "rebound": {"ri": None, "p1_pl": None, "p5_pl": None, "d5_d1_gain_ratio": None, "rsi_14": None, "curve_shape": None},
        }
    closes = hist["Close"].dropna()
    if len(closes) < TRADING_DAYS_60:
        perf1d = _perf1d_from_yfinance(ticker)
        return {
            "perf": {"perf1d": perf1d, "perf5d": None, "perf20d": None, "perf60d": None, "rsi_14": None},
            "rebound": {"ri": None, "p1_pl": None, "p5_pl": None, "d5_d1_gain_ratio": None, "rsi_14": None, "curve_shape": None},
        }
    last = float(closes.iloc[-1])
    closes_list = [float(x) for x in closes.tolist()]
    perf1d = _perf1d_from_yfinance(ticker, last_close_from_hist=last)
    perf5d = _pct_change(last, float(closes.iloc[-TRADING_DAYS_5])) if len(closes) >= TRADING_DAYS_5 else None
    perf20d = _pct_change(last, float(closes.iloc[-TRADING_DAYS_20])) if len(closes) >= TRADING_DAYS_20 else None
    perf60d = _pct_change(last, float(closes.iloc[-TRADING_DAYS_60])) if len(closes) >= TRADING_DAYS_60 else None
    try:
        rsi_14 = _rsi(closes_list, 14) if len(closes_list) >= 15 else None
    except (TypeError, ValueError, ZeroDivisionError, IndexError):
        rsi_14 = None
    perf = {"perf1d": perf1d, "perf5d": perf5d, "perf20d": perf20d, "perf60d": perf60d, "rsi_14": rsi_14}
    if len(closes_list) < 15:
        rebound = {"ri": None, "p1_pl": None, "p5_pl": None, "d5_d1_gain_ratio": None, "rsi_14": rsi_14, "curve_shape": None}
    else:
        p1 = closes_list[-REBOUND_DAYS]
        p5 = closes_list[-1]
        last5 = closes_list[-REBOUND_DAYS:]
        pl = min(last5)
        idx_min = min(range(REBOUND_DAYS), key=lambda i: last5[i])
        idx_max = max(range(REBOUND_DAYS), key=lambda i: last5[i])
        if idx_min in (1, 2, 3):
            curve_shape = "v_shape"
        elif idx_max in (1, 2, 3):
            curve_shape = "a_shape"
        elif idx_min == 0 and idx_max == 4:
            curve_shape = "way_up"
        elif idx_max == 0 and idx_min == 4:
            curve_shape = "way_down"
        else:
            curve_shape = "way_up" if p5 >= p1 else "way_down"
        if pl and pl > 0:
            g1 = (p1 - pl) / pl
            g5 = (p5 - pl) / pl
            ri = round(g1 * g5 * 1_000_000, 2)
            p1_pl = round(g1 * 1000, 2)
            p5_pl = round(g5 * 1000, 2)
        else:
            ri = p1_pl = p5_pl = None
        d5_d1 = round((p5 - p1) / p1, 4) if p1 and p1 != 0 else None
        rebound = {"ri": ri, "p1_pl": p1_pl, "p5_pl": p5_pl, "d5_d1_gain_ratio": d5_d1, "rsi_14": rsi_14, "curve_shape": curve_shape}
    return {"perf": perf, "rebound": rebound}


DASHBOARD_WORKERS = 16


@app.get("/")
def root():
    return {"service": "sctr-picks-api-300", "docs": "/docs", "health": "/health"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/sctr-top300")
def api_sctr_top300():
    """Scrape StockCharts SCTR page and return top 300 symbols."""
    try:
        rows = fetch_sctr_top300()
        result = []
        for i, row in enumerate(rows, start=1):
            symbol = row.get("Symbol") or row.get("symbol") or ""
            name = row.get("Name") or row.get("name") or ""
            result.append({"rank": i, "symbol": symbol, "name": name})
        return {"data": result, "stage": "scrape"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "stage": "scrape"},
        )


@app.get("/api/dashboard")
def api_dashboard():
    """
    Single endpoint: scrape once (top 300), then fetch all symbols in parallel
    (one history per symbol → perf + rebound). Returns perf, rebound, qqq.
    """
    try:
        rows = fetch_sctr_top300()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "stage": "scrape"},
        )
    symbols_with_meta = [
        (i, row.get("Symbol") or row.get("symbol") or "", row.get("Name") or row.get("name") or "")
        for i, row in enumerate(rows, start=1)
    ]
    symbols = [s[1] for s in symbols_with_meta if s[1]]
    perf_list: List[Dict[str, Any]] = []
    rebound_list: List[Dict[str, Any]] = []
    qqq_data: Optional[Dict[str, Any]] = None
    with ThreadPoolExecutor(max_workers=DASHBOARD_WORKERS) as executor:
        future_to_idx = {executor.submit(get_symbol_data, sym): (i, sym, name) for (i, sym, name) in symbols_with_meta if sym}
        if "QQQ" not in symbols:
            future_to_idx[executor.submit(get_symbol_data, "QQQ")] = (-1, "QQQ", "")
        for future in as_completed(future_to_idx):
            rank, symbol, name = future_to_idx[future]
            try:
                data = future.result()
            except Exception:
                data = {"perf": {"perf1d": None, "perf5d": None, "perf20d": None, "perf60d": None, "rsi_14": None}, "rebound": {"ri": None, "p1_pl": None, "p5_pl": None, "d5_d1_gain_ratio": None, "rsi_14": None, "curve_shape": None}}
            if symbol == "QQQ":
                qqq_data = data["perf"]
                continue
            perf_list.append({
                "rank": rank,
                "symbol": symbol,
                "name": name,
                "perf1d": data["perf"]["perf1d"],
                "perf5d": data["perf"]["perf5d"],
                "perf20d": data["perf"]["perf20d"],
                "perf60d": data["perf"]["perf60d"],
                "rsi_14": data["perf"]["rsi_14"],
            })
            rebound_list.append({
                "rank": rank,
                "symbol": symbol,
                "name": name,
                "ri": data["rebound"]["ri"],
                "p1_pl": data["rebound"]["p1_pl"],
                "p5_pl": data["rebound"]["p5_pl"],
                "d5_d1_gain_ratio": data["rebound"]["d5_d1_gain_ratio"],
                "rsi_14": data["rebound"]["rsi_14"],
                "curve_shape": data["rebound"]["curve_shape"],
            })
    perf_list.sort(key=lambda x: x["rank"])
    rebound_list.sort(key=lambda x: x["rank"])
    if qqq_data is None:
        for p in perf_list:
            if p.get("symbol") == "QQQ":
                qqq_data = {"perf1d": p.get("perf1d"), "perf5d": p.get("perf5d"), "perf20d": p.get("perf20d"), "perf60d": p.get("perf60d")}
                break
    return {
        "data": {
            "perf": perf_list,
            "rebound": rebound_list,
            "qqq": qqq_data or {},
        },
    }


def run():
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    run()

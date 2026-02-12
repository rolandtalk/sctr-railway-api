"""
SCTR Picks API: Scrape StockCharts SCTR Top 30 + yfinance 5D/20D/60D performance.
Deploy to Railway, Render, or Fly.io. Frontend: Cloudflare Pages or your own domain.

Two separate APIs for clear error attribution:
  - GET /api/sctr-top30       → scrape only (stage: "scrape")
  - GET/POST /api/price-performance → yfinance only (stage: "performance")
Combined: GET/POST /api/sctr-performance; errors include "stage" so you know which step failed.
"""
from typing import Dict, List, Optional

import yfinance as yf
from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from fetch_sctr import fetch_sctr_top30

app = FastAPI(title="SCTR Picks API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
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
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trading days for 5D, 20D, 60D (we need n+1 bars: current + n days ago)
TRADING_DAYS_5 = 6   # need close[-6] and close[-1]
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
    # Current close: regularMarketPrice (Yahoo's current), else last Close from history
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
    """Get 1D (Close–Previous Close %), 5D, 20D, 60D % for a symbol using yfinance."""
    ticker = yf.Ticker(symbol)
    hist = ticker.history(period="4mo")  # ~84 trading days
    if hist is None or len(hist) < TRADING_DAYS_60:
        perf1d = _perf1d_from_yfinance(ticker)
        return {"perf1d": perf1d, "perf5d": None, "perf20d": None, "perf60d": None}
    closes = hist["Close"].dropna()
    if len(closes) < TRADING_DAYS_60:
        perf1d = _perf1d_from_yfinance(ticker)
        return {"perf1d": perf1d, "perf5d": None, "perf20d": None, "perf60d": None}
    last = float(closes.iloc[-1])
    # 1D: yfinance Close vs Previous Close (with history fallback for current close)
    perf1d = _perf1d_from_yfinance(ticker, last_close_from_hist=last)
    perf5d = _pct_change(last, float(closes.iloc[-TRADING_DAYS_5])) if len(closes) >= TRADING_DAYS_5 else None
    perf20d = _pct_change(last, float(closes.iloc[-TRADING_DAYS_20])) if len(closes) >= TRADING_DAYS_20 else None
    perf60d = _pct_change(last, float(closes.iloc[-TRADING_DAYS_60])) if len(closes) >= TRADING_DAYS_60 else None
    return {"perf1d": perf1d, "perf5d": perf5d, "perf20d": perf20d, "perf60d": perf60d}


# ---------------------------------------------------------------------------
# Rebound Index (RI): (P1-PL)/PL * (P5-PL)/PL * 1e6; P1..P5 = last 5 closes, PL = min
# (D5-D1) gain ratio = (P5-P1)/P1; RSI(14) = standard 14-period RSI
# ---------------------------------------------------------------------------
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


def get_rebound_data(symbol: str) -> Dict[str, Optional[float]]:
    """RI, P1-PL, P5-PL (gain ratio × 1000), (D5-D1) gain ratio, RSI(14) from last 5 and 15 trading days."""
    ticker = yf.Ticker(symbol)
    hist = ticker.history(period="1mo")
    if hist is None or len(hist) < 15:
        return {"ri": None, "p1_pl": None, "p5_pl": None, "d5_d1_gain_ratio": None, "rsi_14": None, "curve_shape": None}
    closes = hist["Close"].dropna().tolist()
    if len(closes) < 15:
        return {"ri": None, "p1_pl": None, "p5_pl": None, "d5_d1_gain_ratio": None, "rsi_14": None, "curve_shape": None}
    # P1 = 5 days ago, P5 = latest (index -5 and -1)
    p1 = float(closes[-REBOUND_DAYS])
    p5 = float(closes[-1])
    last5 = [float(closes[i]) for i in range(-REBOUND_DAYS, 0)]
    pl = min(last5)
    # Curve shape: V (trough in middle), way_up, A (peak in middle), way_down
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
    # (P1-PL)/PL and (P5-PL)/PL × 1000 for display
    if pl is None or pl <= 0:
        ri = p1_pl = p5_pl = None
    else:
        g1 = (p1 - pl) / pl
        g5 = (p5 - pl) / pl
        ri = round(g1 * g5 * 1_000_000, 2)
        p1_pl = round(g1 * 1000, 2)
        p5_pl = round(g5 * 1000, 2)
    # (D5-D1) gain ratio = (P5-P1)/P1
    d5_d1 = round((p5 - p1) / p1, 4) if p1 and p1 != 0 else None
    rsi_14 = _rsi(closes, RSI_PERIOD)
    return {"ri": ri, "p1_pl": p1_pl, "p5_pl": p5_pl, "d5_d1_gain_ratio": d5_d1, "rsi_14": rsi_14, "curve_shape": curve_shape}


@app.get("/")
def root():
    return {"service": "sctr-railway-api", "docs": "/docs", "health": "/health"}


@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# 1. Scrape only – error response has stage: "scrape"
# ---------------------------------------------------------------------------

@app.get("/api/sctr-top30")
def api_sctr_top30():
    """
    Scrape StockCharts SCTR page and return top 30 symbols only.
    If this fails, error response includes "stage": "scrape".
    """
    try:
        rows = fetch_sctr_top30()
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


# ---------------------------------------------------------------------------
# 2. Price performance only (yfinance) – error response has stage: "performance"
# ---------------------------------------------------------------------------

@app.get("/api/price-performance")
def api_price_performance_get(symbols: str = ""):
    """
    Compute 5D/20D/60D % for given symbols via yfinance.
    Query: ?symbols=AAPL,MSFT,GOOGL
    If this fails, error response includes "stage": "performance".
    """
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    if not symbol_list:
        raise HTTPException(status_code=400, detail={"error": "symbols required (e.g. ?symbols=AAPL,MSFT)", "stage": "performance"})
    return _compute_price_performance(symbol_list)


@app.post("/api/price-performance")
def api_price_performance_post(symbols: List[str] = Body(..., embed=False)):
    """
    Compute 5D/20D/60D % for given symbols via yfinance.
    Body: ["AAPL", "MSFT", "GOOGL"]
    If this fails, error response includes "stage": "performance".
    """
    if not symbols:
        raise HTTPException(status_code=400, detail={"error": "symbols required (e.g. [\"AAPL\", \"MSFT\"])", "stage": "performance"})
    return _compute_price_performance(symbols)


def _compute_price_performance(symbols: List[str]) -> dict:
    try:
        result = []
        for symbol in symbols:
            perf = get_price_performance(symbol)
            result.append({
                "symbol": symbol,
                "perf1d": perf["perf1d"],
                "perf5d": perf["perf5d"],
                "perf20d": perf["perf20d"],
                "perf60d": perf["perf60d"],
            })
        return {"data": result, "stage": "performance"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "stage": "performance"},
        )


# ---------------------------------------------------------------------------
# 3. Combined (scrape + performance) – errors include stage: "scrape" or "performance"
# ---------------------------------------------------------------------------

@app.post("/api/sctr-performance")
@app.get("/api/sctr-performance")
def sctr_performance():
    """
    Scrape StockCharts SCTR Top 30, then compute 5D/20D/60D % for each symbol via yfinance.
    Returns list of { rank, symbol, name?, perf5d, perf20d, perf60d }.
    On failure, detail includes "stage": "scrape" or "performance" so you know which step failed.
    """
    try:
        rows = fetch_sctr_top30()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "stage": "scrape"},
        )
    result = []
    try:
        for i, row in enumerate(rows, start=1):
            symbol = row.get("Symbol") or row.get("symbol") or ""
            name = row.get("Name") or row.get("name") or ""
            perf = get_price_performance(symbol)
            result.append({
                "rank": i,
                "symbol": symbol,
                "name": name,
                "perf1d": perf["perf1d"],
                "perf5d": perf["perf5d"],
                "perf20d": perf["perf20d"],
                "perf60d": perf["perf60d"],
            })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "stage": "performance"},
        )
    return {"data": result}


# ---------------------------------------------------------------------------
# 4. Rebound Index table: RNK/SYM, RI, (D5-D1) gain ratio, RSI(14)
# ---------------------------------------------------------------------------

@app.get("/api/rebound-index")
def api_rebound_index():
    """
    SCTR Top 30 with Rebound Index (RI), (D5-D1) gain ratio, and RSI(14).
    RI = (P1-PL)/PL * (P5-PL)/PL * 1e6; P1=first of 5D, P5=last, PL=low in 5D.
    """
    try:
        rows = fetch_sctr_top30()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "stage": "scrape"},
        )
    result = []
    try:
        for i, row in enumerate(rows, start=1):
            symbol = row.get("Symbol") or row.get("symbol") or ""
            name = row.get("Name") or row.get("name") or ""
            reb = get_rebound_data(symbol)
            result.append({
                "rank": i,
                "symbol": symbol,
                "name": name,
                "ri": reb["ri"],
                "p1_pl": reb["p1_pl"],
                "p5_pl": reb["p5_pl"],
                "d5_d1_gain_ratio": reb["d5_d1_gain_ratio"],
                "rsi_14": reb["rsi_14"],
                "curve_shape": reb["curve_shape"],
            })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "stage": "rebound"},
        )
    return {"data": result}


def run():
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    run()

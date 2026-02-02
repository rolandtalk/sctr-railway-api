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
        "https://sctrpicks.pages.dev",  # add your frontend origin if different
        "http://localhost:5173",
        "http://127.0.0.1:5173",
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


def get_price_performance(symbol: str) -> Dict[str, Optional[float]]:
    """Get 5D, 20D, 60D % price change for a symbol using yfinance."""
    ticker = yf.Ticker(symbol)
    hist = ticker.history(period="4mo")  # ~84 trading days
    if hist is None or len(hist) < TRADING_DAYS_60:
        return {"perf5d": None, "perf20d": None, "perf60d": None}
    closes = hist["Close"].dropna()
    if len(closes) < TRADING_DAYS_60:
        return {"perf5d": None, "perf20d": None, "perf60d": None}
    last = float(closes.iloc[-1])
    perf5d = _pct_change(last, float(closes.iloc[-TRADING_DAYS_5])) if len(closes) >= TRADING_DAYS_5 else None
    perf20d = _pct_change(last, float(closes.iloc[-TRADING_DAYS_20])) if len(closes) >= TRADING_DAYS_20 else None
    perf60d = _pct_change(last, float(closes.iloc[-TRADING_DAYS_60])) if len(closes) >= TRADING_DAYS_60 else None
    return {"perf5d": perf5d, "perf20d": perf20d, "perf60d": perf60d}


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


def run():
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    run()

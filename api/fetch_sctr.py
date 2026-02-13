"""
Fetch SCTR Top 300 using Playwright. Inlined for 300-stock app deploy (no parent dependency).
"""
import io

import pandas as pd
from playwright.sync_api import sync_playwright

SCTR_URL = "https://stockcharts.com/freecharts/sctr.html"
SCTR_TOP_N = 300
TABLE_READY_JS = f"() => document.querySelectorAll('table tbody tr').length >= {SCTR_TOP_N}"
PAGE_LOAD_TIMEOUT_MS = 45 * 1000
TABLE_WAIT_TIMEOUT_MS = 40 * 1000


def _block_heavy_resources(route):
    resource_type = route.request.resource_type
    if resource_type in ("image", "font", "media"):
        return route.abort()
    route.continue_()


def fetch_sctr_top300() -> list[dict]:
    """Fetch SCTR Top 300 from StockCharts. Returns list of dicts for JSON/API use."""
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--disable-dev-shm-usage",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-gpu",
                "--disable-extensions",
                "--disable-background-networking",
            ],
        )
        page = browser.new_page()
        page.route("**/*", _block_heavy_resources)
        page.set_default_timeout(PAGE_LOAD_TIMEOUT_MS)
        page.goto(SCTR_URL, wait_until="domcontentloaded")
        page.wait_for_function(TABLE_READY_JS, timeout=TABLE_WAIT_TIMEOUT_MS)
        table_html = page.locator("table").first.evaluate("el => el.outerHTML")
        browser.close()

    rankings = pd.read_html(io.StringIO(table_html))[0]
    rankings = rankings.dropna(axis=1, how="all")
    top300 = rankings.head(SCTR_TOP_N)
    return top300.to_dict(orient="records")

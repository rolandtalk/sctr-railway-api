"""
Fetch SCTR Top 300 using Playwright. Inlined for 300-stock app deploy (no parent dependency).
"""
import os

# Must set before importing playwright so it uses Docker image browsers
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = os.environ.get("PLAYWRIGHT_BROWSERS_PATH") or "/app/ms-playwright"

import io
from typing import Optional

import pandas as pd
from playwright.sync_api import sync_playwright

# Docker/Railway: resolve Chromium executable under PLAYWRIGHT_BROWSERS_PATH
def _chromium_executable_path():
    # type: () -> Optional[str]
    base = os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "")
    if not base or not os.path.isdir(base):
        return None
    # Prefer chromium_headless_shell (newer), fallback to chromium
    for name in ("chromium_headless_shell", "chromium"):
        for d in os.listdir(base):
            if d.startswith(name + "-"):
                dirpath = os.path.join(base, d)
                if not os.path.isdir(dirpath):
                    continue
                # chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell
                shell_dir = os.path.join(dirpath, "chrome-headless-shell-linux64")
                shell = os.path.join(shell_dir, "chrome-headless-shell")
                if os.path.isfile(shell) and os.access(shell, os.X_OK):
                    return shell
                # chromium-1234/chrome-linux/chrome
                chrome_dir = os.path.join(dirpath, "chrome-linux")
                chrome = os.path.join(chrome_dir, "chrome")
                if os.path.isfile(chrome) and os.access(chrome, os.X_OK):
                    return chrome
    return None

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
        launch_opts: dict = {
            "headless": True,
            "args": [
                "--disable-dev-shm-usage",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-gpu",
                "--disable-extensions",
                "--disable-background-networking",
            ],
        }
        exe = _chromium_executable_path()
        if exe:
            launch_opts["executable_path"] = exe
        browser = p.chromium.launch(**launch_opts)
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

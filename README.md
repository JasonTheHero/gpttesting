# Simple Stock Tracker

A lightweight client-side stock tracker with:
- single or multi-ticker comparison (up to 5 symbols)
- selectable ranges: 1 Day, 1 Week, 1 Month, 1 Year, Lifetime
- up/down color indicators (green/red)
- light/dark mode toggle
- a News tab showing upcoming earnings events for notable companies

## Run locally

1. Open a terminal.
2. Change into this project folder (the one containing `index.html`, `styles.css`, and `app.js`):
   ```bash
   cd /workspace/gpttesting
   ```
3. Start a local static server:
   ```bash
   python3 -m http.server 4173
   ```
4. Open your browser at:
   ```
   http://127.0.0.1:4173/index.html
   ```

> This is a local folder on your machine/dev environment, not the GitHub website UI.

## Quick usage

### Tracker tab
- Enter tickers like `AAPL, MSFT, GOOGL`
- Click **Track**
- Change range buttons (1D/1W/1M/1Y/Lifetime)

### News tab
- Click **News** to view upcoming earnings events for notable companies.
- Events are sorted by date and grouped as upcoming relative to today.

## Basic checks

```bash
node --check app.js
python3 -m http.server 4173
```

const form = document.getElementById("ticker-form");
const tickerInput = document.getElementById("ticker-input");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const rangeButtons = document.querySelectorAll(".range-button");
const themeToggle = document.getElementById("theme-toggle");

const rangeDays = {
  "1d": 1,
  "1w": 7,
  "1m": 30,
  "1y": 365,
  all: Number.POSITIVE_INFINITY,
};

let selectedRange = "1d";
let currentTickers = [];
const tickerSeries = new Map();

const asCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

const normalizeTicker = (value) => value.trim().toUpperCase();

const parseTickers = (raw) => {
  const unique = [];
  raw
    .split(",")
    .map(normalizeTicker)
    .filter(Boolean)
    .forEach((ticker) => {
      if (!unique.includes(ticker)) {
        unique.push(ticker);
      }
    });

  return unique.slice(0, 5);
};

const getStooqSymbol = (ticker) => {
  if (ticker.includes(".")) {
    return ticker.toLowerCase();
  }

  return `${ticker.toLowerCase()}.us`;
};

const fetchDailySeries = async (ticker) => {
  const stooqSymbol = getStooqSymbol(ticker);
  const sourceUrl = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSymbol)}&i=d`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(sourceUrl)}`;
  const response = await fetch(proxyUrl);

  if (!response.ok) {
    throw new Error("Unable to reach stock data provider.");
  }

  const csv = await response.text();
  const rows = csv.trim().split("\n");

  if (rows.length < 3 || csv.includes("N/D")) {
    throw new Error("No data found.");
  }

  const parsed = rows
    .slice(1)
    .map((line) => {
      const [date, open, high, low, close] = line.split(",");
      return {
        date: new Date(`${date}T00:00:00Z`),
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
      };
    })
    .filter((point) => Number.isFinite(point.close));

  if (parsed.length < 2) {
    throw new Error("Not enough history.");
  }

  return parsed;
};

const pickRangePoints = (allPoints, range) => {
  if (!allPoints.length) {
    return [];
  }

  if (range === "all") {
    return allPoints;
  }

  const days = rangeDays[range] ?? 1;
  const latest = allPoints[allPoints.length - 1].date;

  const filtered = allPoints.filter((point) => {
    const diff = (latest - point.date) / (1000 * 60 * 60 * 24);
    return diff <= days;
  });

  if (filtered.length >= 2) {
    return filtered;
  }

  return allPoints.slice(-2);
};

const getTickerSnapshot = (points) => {
  const rangeSlice = pickRangePoints(points, selectedRange);
  const first = rangeSlice[0];
  const last = rangeSlice[rangeSlice.length - 1];
  const delta = last.close - first.close;
  const pct = first.close === 0 ? 0 : (delta / first.close) * 100;

  return {
    last: last.close,
    delta,
    pct,
    isUp: delta > 0,
    isDown: delta < 0,
  };
};

const cardMarkup = (ticker, snapshot, error = "") => {
  if (error) {
    return `<article class="result-card"><h3 class="result-symbol">${ticker}</h3><p class="result-change down">${error}</p></article>`;
  }

  const trendClass = snapshot.isUp ? "up" : snapshot.isDown ? "down" : "neutral";
  const arrow = snapshot.isUp ? "▲" : snapshot.isDown ? "▼" : "•";
  const sign = snapshot.delta > 0 ? "+" : "";

  return `
    <article class="result-card">
      <h3 class="result-symbol">${ticker}</h3>
      <p class="result-price ${trendClass}">${asCurrency(snapshot.last)}</p>
      <p class="result-change ${trendClass}">
        ${arrow} ${sign}${asCurrency(snapshot.delta)} (${sign}${snapshot.pct.toFixed(2)}%)
      </p>
    </article>
  `;
};

const renderResults = () => {
  if (!currentTickers.length) {
    resultsEl.innerHTML = "";
    return;
  }

  const cards = currentTickers.map((ticker) => {
    const data = tickerSeries.get(ticker);

    if (!data) {
      return cardMarkup(ticker, null, "Data unavailable");
    }

    if (data.error) {
      return cardMarkup(ticker, null, data.error);
    }

    const snapshot = getTickerSnapshot(data.points);
    return cardMarkup(ticker, snapshot);
  });

  resultsEl.innerHTML = cards.join("");
  statusEl.textContent = `Showing ${selectedRange.toUpperCase()} performance for ${currentTickers.length} ticker${currentTickers.length > 1 ? "s" : ""}.`;
};

const setLoading = (loading) => {
  if (loading) {
    statusEl.textContent = "Loading stock data...";
  }

  form.querySelector("button").disabled = loading;
  rangeButtons.forEach((button) => {
    button.disabled = loading;
  });
};

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️ Light" : "🌙 Dark";
};

const initTheme = () => {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") {
    applyTheme(saved);
    return;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(prefersDark ? "dark" : "light");
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const tickers = parseTickers(tickerInput.value);

  if (!tickers.length) {
    statusEl.textContent = "Please enter at least one ticker.";
    return;
  }

  currentTickers = tickers;
  tickerSeries.clear();
  setLoading(true);

  await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const points = await fetchDailySeries(ticker);
        tickerSeries.set(ticker, { points });
      } catch (error) {
        tickerSeries.set(ticker, { error: error.message || "Unable to load." });
      }
    })
  );

  renderResults();
  setLoading(false);
});

rangeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    rangeButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    selectedRange = button.dataset.range;

    if (currentTickers.length) {
      renderResults();
    }
  });
});

themeToggle.addEventListener("click", () => {
  const currentTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  applyTheme(currentTheme === "dark" ? "light" : "dark");
});

initTheme();

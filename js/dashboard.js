const API_URL = '/api/stocks';
let marketData = {};
let currentSector = 'ALL';
let watchlist = [];
fetchWatchlist();

async function toggleWatchlist(symbol, event) {
  event.stopPropagation();
  event.preventDefault();
  try {
    const res = await fetch('/api/db-watchlist/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol })
    });
    const data = await res.json();
    if (data.status === 'added') watchlist.push(symbol);
    else {
      const index = watchlist.indexOf(symbol);
      if (index > -1) watchlist.splice(index, 1);
    }
  } catch (e) {
    const index = watchlist.indexOf(symbol);
    if (index > -1) watchlist.splice(index, 1);
    else watchlist.push(symbol);
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
  }
  const sInput = document.getElementById('globalSearch');
  renderGrid(sInput ? sInput.value : '');
}

async function fetchWatchlist() {
  try {
    const res = await fetch('/api/db-watchlist');
    if (res.ok) {
      watchlist = await res.json();
      renderGrid();
    }
  } catch (e) {
    watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
  }
}

function setSector(sector) {
  currentSector = sector;
  document.querySelectorAll('.sector-tab').forEach(tab => tab.classList.remove('active-tab'));
  const clicked = document.querySelector(`.sector-tab[data-sector="${sector}"]`);
  if (clicked) clicked.classList.add('active-tab');
  const sInput = document.getElementById('globalSearch');
  renderGrid(sInput ? sInput.value : '');
}

async function fetchMarketData() {
  try {
    console.info(`[MarketData] Fetching from ${API_URL}...`);
    const response = await fetch(API_URL);
    if (response.ok) {
      const data = await response.json();
      // If data is an array, convert to object with symbols as keys
      if (Array.isArray(data)) {
        marketData = data.reduce((acc, stock) => {
          acc[stock.symbol] = stock;
          return acc;
        }, {});
      } else {
        marketData = data;
      }
      console.info(`[MarketData] Successfully loaded ${Object.keys(marketData).length} stocks.`);
      sessionStorage.setItem('cachedMarketData', JSON.stringify(marketData));
      renderGrid();
      renderMetalsTrack();
      hideGlobalLoading();
    }
  } catch (err) {
    hideGlobalLoading();
    // If we have cached data, don't show error, just rely on cache
    if (!Object.keys(marketData).length) {
      console.error("[MarketData] Fetch failed and no cache available:", err);
      const grid = document.getElementById('stockGrid');
      if (grid) {
        grid.innerHTML =
          `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-wifi-slash"></i><p>Backend not connected. Please navigate to <strong>http://localhost:8001</strong> instead of double-clicking the file.</p></div></td></tr>`;
      }
    }
  }
}

function renderMetalsTrack() {
  const track = document.getElementById('metalsTrack');
  if (!track) return;

  const metals = Object.keys(marketData)
    .filter(sym => {
      const s = marketData[sym].sector;
      return s === 'Metals' || s === 'Commodities';
    })
    .map(sym => ({ symbol: sym, ...marketData[sym] }));

  if (metals.length === 0) {
    track.innerHTML = '<div class="loading-metals">No commodity data available.</div>';
    return;
  }

  track.innerHTML = metals.map(m => {
    const isPos = m.change >= 0;
    return `
      <div class="metal-card" onclick="window.location.href='stock.html?symbol=${m.symbol}'">
        <div class="mc-header">
          <span class="mc-sym">${m.symbol}</span>
          <span class="mc-type">${m.sector}</span>
        </div>
        <span class="mc-price">₹${m.price.toLocaleString('en-IN', { minimumFractionDigits: 1 })}</span>
        <div class="mc-chg ${isPos ? 'pos' : 'neg'}">
          <i class="fas fa-caret-${isPos ? 'up' : 'down'}"></i>
          ${isPos ? '+' : ''}${m.changePercent.toFixed(2)}%
        </div>
      </div>
    `;
  }).join('');
}

function getLogoColors(symbol) {
  const colors = [
    ['#4361ee', '#7B3FE4'], ['#05cd99', '#00a896'], ['#ee5d50', '#f72585'],
    ['#f77f00', '#f4a261'], ['#3a86ff', '#4cc9f0'], ['#8338ec', '#ff006e']
  ];
  let hash = 0;
  for (let c of symbol) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function renderGrid(filter = '') {
  const tbody = document.getElementById('stockGrid');
  if (!tbody) return;

  tbody.innerHTML = '';
  filter = filter.toUpperCase();

  Object.keys(marketData).forEach(symbol => {
    const stock = marketData[symbol];
    if (filter && !symbol.includes(filter) && !stock.name.toUpperCase().includes(filter)) return;
    if (currentSector === 'WATCHLIST' && !watchlist.includes(symbol)) return;
    if (currentSector !== 'ALL' && currentSector !== 'WATCHLIST' && stock.sector !== currentSector) return;

    const isPositive = stock.change >= 0;
    const prefix = isPositive ? '+' : '';
    const isFav = watchlist.includes(symbol);
    const [c1, c2] = getLogoColors(symbol);
    const initials = symbol.slice(0, 2);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="symbol-cell">
          <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleWatchlist('${symbol}', event)" title="${isFav ? 'Remove from watchlist' : 'Add to watchlist'}">
            <i class="fa${isFav ? 's' : 'r'} fa-heart"></i>
          </button>
          <div class="stock-logo" style="background:linear-gradient(135deg,${c1},${c2})">${initials}</div>
          <span class="sym-badge">${symbol}</span>
        </div>
      </td>
      <td>
        <div class="co-name">${stock.name}</div>
        <div class="co-sector">${stock.sector}</div>
      </td>
      <td class="td-right">
        <span class="price-cell">₹${stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </td>
      <td class="td-right">
        <span class="chg-pill ${isPositive ? 'pos' : 'neg'}">
          <i class="fas fa-caret-${isPositive ? 'up' : 'down'}"></i>
          ${prefix}${stock.changePercent.toFixed(2)}%
        </span>
      </td>
      <td class="td-right"><span class="vol-cell">${stock.volume}</span></td>
      <td class="td-center">
        <div style="display: flex; gap: 0.5rem; justify-content: center;">
          <button class="refresh-btn" onclick="refreshSingleStock('${symbol}')" title="Refresh ${symbol}" style="background:none; border:none; color:var(--muted); cursor:pointer; padding:5px; transition:0.2s;">
            <i class="fas fa-sync-alt" id="sync-icon-${symbol}"></i>
          </button>
          <a href="stock.html?symbol=${symbol}" class="predict-btn">
            <i class="fas fa-brain"></i> Predict
          </a>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (tbody.innerHTML === '') {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
      <i class="fas fa-search-minus"></i>
      <p>No stocks found in <strong>${currentSector === 'WATCHLIST' ? 'your watchlist' : 'this sector'}</strong>.</p>
    </div></td></tr>`;
  }
}

async function refreshSingleStock(symbol) {
  const icon = document.getElementById(`sync-icon-${symbol}`);
  if (icon) icon.classList.add('fa-spin');
  try {
    const response = await fetch(`${API_URL}?symbols=${symbol}`);
    if (response.ok) {
      const data = await response.json();
      if (data[symbol]) {
        marketData[symbol] = data[symbol];
        sessionStorage.setItem('cachedMarketData', JSON.stringify(marketData));
        // Only re-render the grid if we are not actively typing in search
        // or just force re-render with current filter
        const sInput = document.getElementById('globalSearch');
        renderGrid(sInput ? sInput.value : '');
      }
    }
  } catch (err) {
    console.error(`Failed to refresh ${symbol}`, err);
  } finally {
    if (icon) icon.classList.remove('fa-spin');
  }
}

async function searchCustomStock(symbol) {
  symbol = symbol.toUpperCase();
  if (!symbol) return;
  try {
    if (marketData[symbol]) { renderGrid(symbol); return; }
    const response = await fetch(`${API_URL}?symbols=${symbol}`);
    if (response.ok) {
      const data = await response.json();
      if (data[symbol] && data[symbol].price) {
        marketData[symbol] = data[symbol];
        renderGrid();
      } else {
        alert(`Stock symbol '${symbol}' not found. Try a valid NSE ticker.`);
      }
    }
  } catch (err) { console.error('Custom search failed', err); }
}

const globalSearchInput = document.getElementById('globalSearch');
if (globalSearchInput) {
  globalSearchInput.addEventListener('keyup', (e) => {
    const term = e.target.value.trim();
    if (e.key === 'Enter') {
      searchCustomStock(term);
      document.querySelector('.table-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      renderGrid(term);
    }
  });
}

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}/ws/market`);
  const dot = document.getElementById('wsDot');
  const txt = document.getElementById('wsText');
  const badge = document.getElementById('wsStatus');

  ws.onopen = () => {
    console.info("[WebSocket] Connected to market stream.");
    if (dot) dot.style.background = 'var(--green)';
    if (txt) txt.textContent = 'Live Stream Connected';
    if (badge) badge.classList.remove('disconnected');
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.indices) {
      const pulse = document.getElementById('pulseContent');
      if (pulse) {
        pulse.innerHTML = Object.entries(data.indices).map(([name, val]) => `
            <div class="pulse-item">
              <span class="pulse-sym">${name}</span>
              <span class="pulse-val ${val.change >= 0 ? 'pulse-up' : 'pulse-down'}">
                ₹${val.price.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
                <i class="fas fa-caret-${val.change >= 0 ? 'up' : 'down'}"></i>
                ${val.percent.toFixed(2)}%
              </span>
            </div>
          `).join('');
      }
    }
    const stocks = data.stocks || data;
    if (Array.isArray(stocks)) {
      stocks.forEach(stock => {
        if (stock.symbol) {
          if (marketData[stock.symbol]) Object.assign(marketData[stock.symbol], stock);
          else marketData[stock.symbol] = stock;
        }
      });
    } else {
      for (const sym in stocks) {
        if (marketData[sym]) Object.assign(marketData[sym], stocks[sym]);
        else marketData[sym] = stocks[sym];
      }
    }

    const sInput = document.getElementById('globalSearch');
    renderGrid(sInput ? sInput.value : '');
    renderMetalsTrack();
  };

  ws.onclose = () => {
    if (dot) {
      dot.style.background = 'var(--red)';
      dot.style.animation = 'none';
    }
    if (txt) txt.textContent = 'Disconnected. Retrying…';
    if (badge) badge.classList.add('disconnected');
    setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = (err) => {
    console.warn("[WebSocket] Error occurred, closing connection...", err);
    ws.close();
  };
}

// Initial calls removed to wait for DOMContentLoaded

// --- News Shorts Feature ---
const marketNewsShorts = [
  {
    id: 1,
    source: "Moneycontrol",
    title: "Reliance Industries announces massive green energy investment.",
    time: "2 hours ago",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=400",
    desc: "Reliance Industries Ltd (RIL) has committed to a massive multi-billion dollar investment in its green energy initiatives over the next 5 years. The company plans to build large-scale solar and hydrogen facilities as part of its transition towards sustainable energy, signaling a strong long-term outlook for green tech investors.",
    link: "https://www.moneycontrol.com/"
  },
  {
    id: 2,
    source: "Economic Times",
    title: "TCS reports record Q3 margins despite global headwinds.",
    time: "4 hours ago",
    image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=400",
    desc: "Tata Consultancy Services announced its Q3 results today, beating market estimates with record operating margins. Despite concerns of a global tech slowdown, the IT giant secured several large enterprise deals in the AI and cloud sectors, boosting investor confidence.",
    link: "https://economictimes.indiatimes.com/"
  },
  {
    id: 3,
    source: "Mint",
    title: "RBI holds repo rate steady; markets react positively.",
    time: "5 hours ago",
    image: "https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&q=80&w=400",
    desc: "The Reserve Bank of India has decided to keep the benchmark repo rate unchanged in its latest monetary policy meeting. The central bank highlighted cooling inflation and stable growth metrics. Banking and auto stocks saw an immediate uptick following the announcement.",
    link: "https://www.livemint.com/"
  },
  {
    id: 4,
    source: "CNBC TV18",
    title: "Auto sector sees 15% YoY growth in domestic car sales.",
    time: "8 hours ago",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400",
    desc: "Led by strong rural demand and premium SUV purchases, major auto players like Tata Motors and M&M reported a 15% year-on-year increase in passenger vehicle sales. The Auto index rallied 2% in today's trading session.",
    link: "https://www.cnbctv18.com/"
  },
  {
    id: 5,
    source: "Bloomberg Quint",
    title: "FIIs turn net buyers in Indian equities this month.",
    time: "12 hours ago",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=400",
    desc: "Foreign Institutional Investors (FIIs) have reversed their selling streak, pouring over ₹12,000 crore into Indian markets in the first two weeks of the month. Experts suggest this is driven by India's robust macroeconomic indicators compared to emerging market peers.",
    link: "https://www.bqprime.com/"
  }
];

async function fetchMarketSentiment() {
  const container = document.getElementById('marketSentiment');
  if (!container) return;
  
  try {
    const res = await fetch('/api/market-sentiment');
    if (!res.ok) throw new Error();
    const data = await res.json();
    
    container.innerHTML = `
      <div class="sent-header">
        <span class="sent-label">AI Market Sentiment</span>
        <span class="sent-score">${data.score}%</span>
      </div>
      <div class="sent-value" style="color: ${data.color}">
        ${data.sentiment}
        <i class="fas fa-${data.sentiment.includes('Bullish') ? 'trending-up' : data.sentiment.includes('Bearish') ? 'trending-down' : 'minus'}"></i>
      </div>
      <div class="sent-outlook">${data.outlook}</div>
    `;
  } catch (err) {
    container.innerHTML = '<div class="sent-outlook" style="color:var(--red)">AI Analysis Timeout</div>';
  }
}

async function renderNewsShorts() {
  const track = document.getElementById('newsShortsTrack');
  if (!track) return;

  try {
    const res = await fetch('/api/top-news');
    const dynamicNews = await res.json();

    // Save to cache
    sessionStorage.setItem('cachedTopNews', JSON.stringify(dynamicNews));

    if (!dynamicNews || !dynamicNews.length) {
      track.innerHTML = '<p style="padding:1rem; color:var(--muted); font-size:0.8rem;">No market updates available.</p>';
      return;
    }

    track.innerHTML = '';
    dynamicNews.forEach(news => {
      const card = document.createElement('div');
      card.className = 'news-short-card';
      card.onclick = () => {
        // Find in local news or just open modal with this data
        openNewsModalFromData(news);
      };

      card.innerHTML = `
        <div class="ns-img" style="background-image: url('${news.image}')">
          <span class="ns-sentiment ${news.sentiment.toLowerCase()}">${news.sentiment}</span>
        </div>
        <div class="ns-content">
          <div class="ns-source">${news.source}</div>
          <div class="ns-title">${news.title}</div>
          <div class="ns-time">${news.time}</div>
        </div>
      `;
      track.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to load news shorts", err);
    track.innerHTML = '<p style="padding:1rem; color:var(--red); font-size:0.8rem;">News feed unavailable.</p>';
  }
}

function openNewsModalFromData(news) {
  if (!news) return;
  document.getElementById('newsModalImg').style.backgroundImage = `url('${news.image}')`;
  document.getElementById('newsModalTitle').textContent = news.title;
  document.getElementById('newsModalSource').textContent = news.source;
  document.getElementById('newsModalTime').textContent = news.time;
  document.getElementById('newsModalDesc').textContent = news.desc;
  document.getElementById('newsModalLink').href = news.link;

  const modal = document.getElementById('newsShortModal');
  if (modal) modal.style.display = 'flex';
}

function openNewsModal(id) {
  const news = marketNewsShorts.find(n => n.id === id);
  if (!news) return;

  document.getElementById('newsModalImg').style.backgroundImage = `url('${news.image}')`;
  document.getElementById('newsModalTitle').textContent = news.title;
  document.getElementById('newsModalSource').textContent = news.source;
  document.getElementById('newsModalTime').textContent = news.time;
  document.getElementById('newsModalDesc').textContent = news.desc;
  document.getElementById('newsModalLink').href = news.link;

  const modal = document.getElementById('newsShortModal');
  if (modal) modal.style.display = 'flex';
}

function closeNewsModal() {
  const modal = document.getElementById('newsShortModal');
  if (modal) modal.style.display = 'none';
}

async function renderTopPicks() {
  const grid = document.getElementById('topPicksGrid');
  if (!grid) return;

  try {
    const res = await fetch('/api/top-picks');
    const picks = await res.json();

    // Save to cache
    sessionStorage.setItem('cachedTopPicks', JSON.stringify(picks));

    if (!picks || !picks.length) {
      grid.innerHTML = '<p style="padding:1rem; color:var(--muted); font-size:0.8rem; grid-column:1/-1; text-align:center;">No high-confidence signals at this moment.</p>';
      return;
    }

    grid.innerHTML = picks.map(pick => `
      <div class="top-pick-card" onclick="window.location.href='stock.html?symbol=${pick.symbol}'">
        <div class="pick-header">
          <span class="pick-sym">${pick.symbol}</span>
          <span class="pick-badge">${pick.confidence}% Conf.</span>
        </div>
        <div class="pick-name">${pick.name}</div>
        <div class="pick-footer">
          <span class="pick-price">₹${Math.round(pick.price || 0).toLocaleString('en-IN')}</span>
          <span class="pick-signal sig-${pick.signal.toLowerCase()}">${pick.signal}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("Failed to load top picks", err);
    // Don't clear grid if we failed, might have cached data
  }
}

async function loadDashboardData() {
  const stockGrid = document.getElementById('stockGrid');
  const newsTrack = document.getElementById('newsShortsTrack');
  const topPicksGrid = document.getElementById('topPicksGrid');

  let hasCache = false;

  // Hydrate from cache immediately for instant UI
  const cachedData = sessionStorage.getItem('cachedMarketData');
  const cachedPicks = sessionStorage.getItem('cachedTopPicks');
  const cachedNews = sessionStorage.getItem('cachedTopNews');

  if (cachedData) {
    try {
      marketData = JSON.parse(cachedData);
      if (Object.keys(marketData).length > 0) {
        renderGrid();
        renderMetalsTrack();
        hideGlobalLoading();
        hasCache = true;
      }
    } catch (e) { }
  }

  if (cachedNews && newsTrack) {
    try {
      const dynamicNews = JSON.parse(cachedNews);
      if (dynamicNews && dynamicNews.length > 0) {
        newsTrack.innerHTML = '';
        dynamicNews.forEach(news => {
          const card = document.createElement('div');
          card.className = 'news-short-card';
          card.onclick = () => openNewsModalFromData(news);
          card.innerHTML = `
            <div class="ns-img" style="background-image: url('${news.image}')">
              <span class="ns-sentiment ${news.sentiment.toLowerCase()}">${news.sentiment}</span>
            </div>
            <div class="ns-content">
              <div class="ns-source">${news.source}</div>
              <div class="ns-title">${news.title}</div>
              <div class="ns-time">${news.time}</div>
            </div>
          `;
          newsTrack.appendChild(card);
        });
      }
    } catch (e) { }
  }

  if (cachedPicks && topPicksGrid) {
    try {
      const picks = JSON.parse(cachedPicks);
      if (picks && picks.length > 0) {
        topPicksGrid.innerHTML = picks.map(pick => `
                <div class="top-pick-card" onclick="window.location.href='stock.html?symbol=${pick.symbol}'">
                  <div class="pick-header">
                    <span class="pick-sym">${pick.symbol}</span>
                    <span class="pick-badge">${pick.confidence}% Conf.</span>
                  </div>
                  <div class="pick-name">${pick.name}</div>
                  <div class="pick-footer">
                    <span class="pick-price">₹${Math.round(pick.price || 0).toLocaleString('en-IN')}</span>
                    <span class="pick-signal sig-${pick.signal.toLowerCase()}">${pick.signal}</span>
                  </div>
                </div>
              `).join('');
      }
    } catch (e) { }
  }

  // Show skeletons only if NO cache exists
  if (!hasCache) {
    if (stockGrid) {
      stockGrid.innerHTML = Array(5).fill(0).map(() => `
        <tr class="skeleton-row">
          <td colspan="6" class="skeleton-shimmer"></td>
        </tr>
      `).join('');
    }
    if (topPicksGrid && !cachedPicks) {
      topPicksGrid.innerHTML = Array(3).fill(0).map(() => `
        <div class="skeleton-news-card skeleton-shimmer" style="height:140px; margin-bottom:1rem;"></div>
      `).join('');
    }
    if (newsTrack && !cachedNews) {
      newsTrack.innerHTML = Array(4).fill(0).map(() => `
        <div class="skeleton-news-card skeleton-shimmer"></div>
      `).join('');
    }
  }

  try {
    // Fetch in background to update cache seamlessly
    await Promise.all([
      fetchMarketData(),
      renderNewsShorts(),
      renderTopPicks()
    ]);
  } catch (err) {
    console.error("Critical load failure", err);
  }

  // Auto-refresh every 10 minutes (600000 ms) instead of 5 minutes
  setInterval(() => {
    console.log("Refreshing live data...");
    renderNewsShorts();
    renderTopPicks();
    renderMetalsTrack();
  }, 10 * 60 * 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.protocol === 'file:') {
    console.error("FATAL: App opened via file:// protocol. API calls will fail. Please use http://localhost:8001");
    alert("Warning: You opened this via double-clicking the file. Please type 'http://localhost:8001' in your browser for it to work correctly.");
  }
  
  loadDashboardData();
  fetchMarketSentiment();
  
  // Refresh sentiment every 1 minute
  setInterval(fetchMarketSentiment, 60000);

  // Connect WS after initial load
  connectWebSocket();

  const modal = document.getElementById('newsShortModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeNewsModal();
    });
  }

  // Premium Autocomplete
  const gSearch = document.getElementById('globalSearch');
  const suggestions = document.getElementById('searchSuggestions');

  if (gSearch && suggestions) {
    let debounceTimer;

    gSearch.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const query = e.target.value.trim().toUpperCase();

      if (query.length < 1) {
        suggestions.style.display = 'none';
        return;
      }

      debounceTimer = setTimeout(() => {
        // Corrected variable name: marketData (not market_data)
        const entries = Object.entries(marketData).map(([sym, data]) => ({ symbol: sym, ...data }));
        const matches = entries
          .filter(stock => stock.symbol.includes(query) || stock.name.toUpperCase().includes(query))
          .slice(0, 6);

        if (matches.length > 0) {
          suggestions.innerHTML = matches.map(stock => {
            const initials = stock.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            return `
              <div class="suggestion-item" onclick="window.location.href='stock.html?symbol=${stock.symbol}'">
                <div class="sugg-logo" style="background: linear-gradient(135deg, var(--accent), var(--accent-2))">${initials}</div>
                <div class="sugg-info">
                  <span class="sugg-sym">${stock.symbol}</span>
                  <span class="sugg-name">${stock.name}</span>
                </div>
                <div class="sugg-price">₹${stock.price.toLocaleString('en-IN')}</div>
              </div>
            `;
          }).join('');
          suggestions.style.display = 'block';
        } else {
          suggestions.style.display = 'none';
        }
      }, 200);
    });

    document.addEventListener('click', (e) => {
      if (!gSearch.contains(e.target) && !suggestions.contains(e.target)) {
        suggestions.style.display = 'none';
      }
    });
  }
});

// AI PORTFOLIO WIZARD LOGIC (Migrated to js/portfolio.js)

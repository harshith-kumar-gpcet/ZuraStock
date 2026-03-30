const stockData = {
    "RELIANCE": { price: 2785.60, change: 32.40, changePercent: 1.18, sector: "Energy", name: "Reliance Industries Ltd." },
    "TCS": { price: 3920.10, change: 21.30, changePercent: 0.55, sector: "IT Services", name: "Tata Consultancy Services" },
    "INFY": { price: 1542.30, change: -5.20, changePercent: -0.34, sector: "IT Services", name: "Infosys Ltd." },
    "HDFCBANK": { price: 1680.55, change: 34.10, changePercent: 2.07, sector: "Banking", name: "HDFC Bank Ltd." },
    "WIPRO": { price: 456.80, change: -5.10, changePercent: -1.11, sector: "IT Services", name: "Wipro Ltd." },
    "MARUTI": { price: 8920.50, change: 45.20, changePercent: 0.51, sector: "Automobile", name: "Maruti Suzuki Ltd." },
    "ICICIBANK": { price: 926.70, change: 12.05, changePercent: 1.31, sector: "Banking", name: "ICICI Bank Ltd." },
    "SBIN": { price: 618.30, change: -8.45, changePercent: -1.35, sector: "Banking", name: "State Bank of India" }
};

const params = new URLSearchParams(window.location.search);
let currentSymbol = params.get('symbol') || 'RELIANCE';
let currentTradeType = 'buy';
let currentPeriod = '1M';
let chartView = 'candle'; // 'candle' or 'line'
let mainChart = null;
let forecastChart = null;
let growthChart = null;

async function fetchStockFromAPI(symbol) {
    try {
        const response = await fetch(`/api/stocks?symbols=${symbol}`);
        if (response.ok) {
            const data = await response.json();
            if (data[symbol]) { stockData[symbol] = data[symbol]; return true; }
        }
    } catch (error) { console.warn(`Failed to fetch ${symbol} from API:`, error); }
    return false;
}

function populateStockSelector() {
    const selector = document.getElementById('stockSelector');
    if (!selector) return;
    selector.innerHTML = '';
    Object.keys(stockData).forEach(symbol => {
        const option = document.createElement('option');
        option.value = symbol;
        option.textContent = `${symbol} - ${stockData[symbol].name}`;
        selector.appendChild(option);
    });
    selector.value = currentSymbol;
}

async function initializeSelectedStock() {
    console.log("Initializing stock:", currentSymbol);
    if (!stockData[currentSymbol]) {
        const fetched = await fetchStockFromAPI(currentSymbol);
        if (!fetched) {
            console.error(`Cannot initialize: ${currentSymbol} not found.`);
            hideGlobalLoading();
            showToast(`Could not load data for ${currentSymbol}`, '#ee5d50');
            return;
        }
    }

    // Safety check in case fetch stock failed but didn't throw
    if (!stockData[currentSymbol]) return;

    setupChartToggle();
    updateStockInfo(currentSymbol);
    updateWatchlistUI();

    // Start data fetches concurrently but safely
    try {
        await Promise.allSettled([
            loadMainChart(),
            fetchFundamentals(currentSymbol),
            fetchLiveAnalysis(currentSymbol),
            fetchNewsSentiment(currentSymbol)
        ]);
    } catch (e) {
        console.error("Initialization fetch error:", e);
    }
}

function setupChartToggle() {
    const btn = document.getElementById('toggleChartBtn');
    if (btn) {
        btn.onclick = () => {
            chartView = chartView === 'candle' ? 'line' : 'candle';
            btn.textContent = chartView === 'candle' ? 'Switch to Line View' : 'Switch to Candle View';
            loadMainChart();
        };
    }
}

async function changeStock(symbol) {
    if (!symbol) return;
    try {
        if (!stockData[symbol]) {
            const fetched = await fetchStockFromAPI(symbol);
            if (!fetched) {
                showToast(`Could not fetch data for ${symbol}`, '#ee5d50');
                return;
            }
        }

        currentSymbol = symbol;
        window.history.pushState({}, '', `stock.html?symbol=${symbol}`);
        populateStockSelector(); // Ensure dropdown reflects the new stock if it was unlisted
        document.getElementById('stockSelector').value = symbol;

        updateStockInfo(currentSymbol);
        updateWatchlistUI();

        await loadMainChart();
        await fetchFundamentals(currentSymbol);
        await fetchLiveAnalysis(currentSymbol);
        await fetchNewsSentiment(currentSymbol);
    } catch (e) {
        console.error("Error during changeStock:", e);
        showToast("Error rendering stock: " + e.message, '#ee5d50');
    }
}

// Trade Logic Removed

document.addEventListener('DOMContentLoaded', () => {
    // Failsafe: remove loader after 4 seconds anyway
    setTimeout(hideGlobalLoading, 4000);

    initializeSelectedStock().then(() => {
        populateStockSelector();
        const selector = document.getElementById('stockSelector');
        if (selector) {
            selector.addEventListener('change', (e) => { if (e.target.value) changeStock(e.target.value); });
        }

        // Hide loader after key data is in
        Promise.allSettled([
            fetchLiveStockData(),
            fetchFundamentals(currentSymbol),
            fetchLiveAnalysis(currentSymbol)
        ]).then(() => {
            console.log("Initial data load complete");
            setTimeout(hideGlobalLoading, 800);
        });

        setupReadMore();
    }).catch(err => {
        console.error("Initialization Failed:", err);
        hideGlobalLoading();
    });
});

function updateStockInfo(symbol) {
    const stock = stockData[symbol];
    if (!stock) return;
    try {
        document.getElementById('stockName').textContent = symbol;
        document.getElementById('stockSymbol').textContent = `NSE: ${symbol}`;
        document.getElementById('stockSector').textContent = stock.sector || '--';

        const aboutName = document.getElementById('aboutCompanyName');
        const aboutSector = document.getElementById('aboutSectorTag');
        if (aboutName) aboutName.textContent = stock.name || symbol;
        if (aboutSector) aboutSector.textContent = stock.sector || '—';

        document.getElementById('stockPrice').textContent = `₹${stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        const isPos = stock.change >= 0;
        const changeEl = document.getElementById('stockChange');
        if (changeEl) {
            const prefix = isPos ? '+' : '';
            changeEl.className = `price-change ${isPos ? 'pos' : 'neg'}`;
            changeEl.innerHTML = `<i class="fas fa-caret-${isPos ? 'up' : 'down'}"></i><span>${prefix}₹${Math.abs(stock.change).toFixed(2)} (${prefix}${stock.changePercent.toFixed(2)}%)</span>`;
        }

        if (stock.open) document.getElementById('stockOpen').textContent = `₹${stock.open.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        if (stock.high) document.getElementById('stockHigh').textContent = `₹${stock.high.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        if (stock.low) document.getElementById('stockLow').textContent = `₹${stock.low.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        if (stock.volume) document.getElementById('stockVolume').textContent = stock.volume;

        const buyEl = document.getElementById('buyPrice');
        const sellEl = document.getElementById('sellPrice');
        if (buyEl) buyEl.textContent = `₹${(stock.price + 0.40).toFixed(2)}`;
        if (sellEl) sellEl.textContent = `₹${(stock.price - 0.40).toFixed(2)}`;
    } catch (e) { console.warn("UI Update Error:", e); }
}

async function fetchLiveStockData() {
    try {
        const res = await fetch(`/api/stocks`);
        if (res.ok) {
            const data = await res.json();
            if (data[currentSymbol]) {
                stockData[currentSymbol] = { ...stockData[currentSymbol], ...data[currentSymbol] };
                updateStockInfo(currentSymbol);
            }
        }
    } catch (e) { }

    try {
        const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${wsProto}//${window.location.host}/ws/market`);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const stocks = data.stocks || data;
            if (stocks[currentSymbol]) {
                stockData[currentSymbol] = { ...stockData[currentSymbol], ...stocks[currentSymbol] };
                updateStockInfo(currentSymbol);
            }
        };
    } catch (e) { console.warn("WebSocket stream err:", e); }
}

async function fetchFundamentals(symbol) {
    try {
        const res = await fetch(`/api/fundamentals?symbol=${symbol}`);
        if (!res.ok) return;
        const data = await res.json();
        const fundamentals = data.fundamentals || {};
        const growthData = data.growth || [];

        const mcapEl = document.getElementById('valMarketCap');
        if (mcapEl) mcapEl.textContent = fundamentals.marketCap ? `₹${(fundamentals.marketCap / 10000000).toFixed(1)}Cr` : '--';

        const peEl = document.getElementById('valPE');
        if (peEl) peEl.textContent = fundamentals.peRatio ? fundamentals.peRatio.toFixed(2) : '--';
        
        // Update Company Profile section
        if (data.description) {
            const descEl = document.getElementById('companyDescription');
            if (descEl) descEl.textContent = data.description;
            const btn = document.getElementById('readMoreBtn');
            if (btn && data.description.length > 250) {
                btn.style.display = 'flex';
            }
        }
        if (data.country) {
            const cEl = document.getElementById('aboutCountry');
            if (cEl) cEl.textContent = data.country;
        }
        if (data.employees && data.employees !== "—") {
            const eEl = document.getElementById('aboutEmployees');
            if (eEl) eEl.textContent = Number(data.employees).toLocaleString('en-IN');
        }

        if (growthData.length) {
            renderGrowthChart(growthData);
        } else {
            const chartTarget = document.querySelector("#growthChart");
            if (chartTarget) {
                if (growthChart) growthChart.destroy();
                chartTarget.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--muted); font-size:0.85rem; text-align:center; padding:1rem;"><i class="fas fa-chart-line" style="margin-right:8px; opacity:0.5;"></i>Financial growth data is temporarily unavailable.</div>';
            }
        }
    } catch (e) {
        console.error('Fundamentals error:', e);
        const chartTarget = document.querySelector("#growthChart");
        if (chartTarget) {
            if (growthChart) growthChart.destroy();
            chartTarget.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--muted); font-size:0.85rem; text-align:center; padding:1rem;"><i class="fas fa-chart-line" style="margin-right:8px; opacity:0.5;"></i>Financial growth data is temporarily unavailable.</div>';
        }
    }
}

async function fetchLiveAnalysis(symbol) {
    const syncIcon = document.getElementById('sync-icon-analysis');
    if (syncIcon) syncIcon.classList.add('fa-spin');
    
    try {
        const res = await fetch(`/api/analysis?symbol=${symbol}&period=${currentPeriod}`);
        if (!res.ok) return;
        const data = await res.json();

        const signal = data.signal || 'HOLD';
        const sigEl = document.getElementById('aiSignal');
        if (sigEl) {
            sigEl.textContent = signal;
            sigEl.className = `signal-pill signal-${signal.toLowerCase()}`;
        }

        // Update Confidence and Weights
        if (data.confidence !== undefined) {
            const confEl = document.getElementById('aiConfidenceText');
            const confBar = document.getElementById('aiConfidenceBar');
            if (confEl) confEl.textContent = `${data.confidence}%`;
            if (confBar) confBar.style.width = `${data.confidence}%`;
        }

        if (data.explanation) {
            const expEl = document.getElementById('aiExplanation');
            if (expEl) expEl.textContent = data.explanation;
        }

        if (data.weights) {
            const w = data.weights;
            if (document.getElementById('weightTech')) document.getElementById('weightTech').style.width = `${(w.technical || 0) * 100}%`;
            if (document.getElementById('weightSent')) document.getElementById('weightSent').style.width = `${(w.sentiment || 0) * 100}%`;
            if (document.getElementById('weightFund')) document.getElementById('weightFund').style.width = `${(w.fundamental || 0) * 100}%`;

            if (document.getElementById('labelTech')) document.getElementById('labelTech').textContent = `${((w.technical || 0) * 100).toFixed(0)}%`;
            if (document.getElementById('labelSent')) document.getElementById('labelSent').textContent = `${((w.sentiment || 0) * 100).toFixed(0)}%`;
            if (document.getElementById('labelFund')) document.getElementById('labelFund').textContent = `${((w.fundamental || 0) * 100).toFixed(0)}%`;
        }

        if (data.insights) {
            const pros = document.getElementById('aiProsList');
            const cons = document.getElementById('aiConsList');
            if (pros && data.insights.pros?.length) pros.innerHTML = data.insights.pros.map(p => `<li><i class="fas fa-check"></i><span>${p}</span></li>`).join('');
            if (cons && data.insights.cons?.length) cons.innerHTML = data.insights.cons.map(c => `<li><i class="fas fa-times"></i><span>${c}</span></li>`).join('');
        }

        if (data.rsi !== undefined && document.getElementById('valRSI')) document.getElementById('valRSI').textContent = data.rsi.toFixed(1);
        if (data.sma20 !== undefined && document.getElementById('valSMA20')) document.getElementById('valSMA20').textContent = `₹${data.sma20.toLocaleString('en-IN')}`;

        if (data.forecast) {
            try {
                renderForecastChart(data.forecast);
            } catch (fcErr) { console.error("Forecast Render Error:", fcErr); }
        }

        updateSimpleInterpretation(data);
    } catch (e) {
        console.error('Analysis error details:', e);
        showToast('Error loading AI Analysis', '#ee5d50');
    } finally {
        if (syncIcon) syncIcon.classList.remove('fa-spin');
    }
}

async function loadMainChart() {
    const container = document.getElementById('tvChartContainer');
    if (!container) return;
    container.innerHTML = '<div id="mainChartInstance" style="width:100%; height:100%;"></div>';

    try {
        const res = await fetch(`/api/ohlc?symbol=${currentSymbol}&period=${currentPeriod}`);
        const data = await res.json();

        if (!data || data.length === 0) {
            container.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--muted); font-size:0.8rem;">Market data currently unavailable.</div>';
            return;
        }

        if (typeof ApexCharts === 'undefined') {
            console.error("ApexCharts not loaded");
            return;
        }

        const options = {
            series: [{
                name: currentSymbol,
                data: chartView === 'candle'
                    ? data.map(d => ({ x: new Date(d.time * 1000), y: [d.open, d.high, d.low, d.close] }))
                    : data.map(d => ({ x: new Date(d.time * 1000), y: d.close }))
            }],
            chart: {
                type: chartView === 'candle' ? 'candlestick' : 'area',
                height: 340,
                toolbar: { show: false },
                animations: { enabled: true },
                background: 'transparent',
                foreColor: 'rgba(160, 174, 192, 1)'
            },
            stroke: { curve: 'smooth', width: 2 },
            xaxis: { type: 'datetime' },
            yaxis: { tooltip: { enabled: true } },
            tooltip: { theme: 'dark' },
            colors: ['#4361ee'],
            grid: { borderColor: 'rgba(240, 242, 248, 0.05)' }
        };

        if (mainChart) mainChart.destroy();
        mainChart = new ApexCharts(document.querySelector("#mainChartInstance"), options);
        mainChart.render();
    } catch (e) { console.error('Chart error:', e); }
}

function renderForecastChart(forecast) {
    const target = document.querySelector("#forecastChart");
    if (!target || typeof ApexCharts === 'undefined') return;

    const options = {
        series: [{
            name: 'Projected',
            data: forecast.map(d => ({ x: `Day ${d.day}`, y: d.projected }))
        }],
        chart: { type: 'line', height: 260, toolbar: { show: false }, background: 'transparent', foreColor: '#a0aec0' },
        stroke: { curve: 'smooth', width: 3 },
        colors: ['#4361ee'],
        xaxis: { categories: forecast.map(d => `Day ${d.day}`) },
        grid: { borderColor: 'rgba(240, 242, 248, 0.05)' }
    };
    if (forecastChart) forecastChart.destroy();
    forecastChart = new ApexCharts(target, options);
    forecastChart.render();
}

function renderGrowthChart(growth) {
    const target = document.querySelector("#growthChart");
    if (!target || typeof ApexCharts === 'undefined') return;

    const options = {
        series: [
            {
                name: 'Revenue',
                data: growth.map(d => d.revenue)
            },
            {
                name: 'Net Profit',
                data: growth.map(d => d.netIncome)
            }
        ],
        chart: {
            type: 'bar',
            height: 220,
            toolbar: { show: false },
            background: 'transparent',
            foreColor: '#a0aec0',
            fontFamily: 'Outfit, sans-serif'
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%',
                endingShape: 'rounded',
                borderRadius: 4
            },
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            show: true,
            width: 2,
            colors: ['transparent']
        },
        colors: ['#4361ee', '#10b981'],
        xaxis: {
            categories: growth.map(d => d.date),
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: {
                formatter: function (val) {
                    if (val >= 10000000) return (val / 10000000).toFixed(1) + "Cr";
                    if (val >= 100000) return (val / 100000).toFixed(1) + "L";
                    return val.toLocaleString('en-IN');
                }
            }
        },
        fill: {
            opacity: 1
        },
        tooltip: {
            theme: 'dark',
            y: {
                formatter: function (val) {
                    return "₹" + val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
                }
            }
        },
        grid: {
            borderColor: 'rgba(240, 242, 248, 0.05)',
            strokeDashArray: 4
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            offsetY: -10
        }
    };
    if (growthChart) growthChart.destroy();
    growthChart = new ApexCharts(target, options);
    growthChart.render();
}

let watchlist = [];
async function fetchWatchlist() {
    try {
        const res = await fetch(`/api/db-watchlist`);
        if (res.ok) { watchlist = await res.json(); updateWatchlistUI(); }
    } catch (e) { }
}
fetchWatchlist();

function updateWatchlistUI() {
    const icon = document.getElementById('watchlistHeart');
    if (icon) icon.classList.toggle('active', watchlist.includes(currentSymbol));
}

function showToast(msg, color = '#4361ee') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.style.background = color;
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2200);
}

async function toggleWatchlistDetail() {
    try {
        const res = await fetch(`/api/db-watchlist/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: currentSymbol })
        });
        const data = await res.json();
        if (data.status === 'added') {
            watchlist.push(currentSymbol);
            showToast(`${currentSymbol} added to watchlist`);
        } else {
            watchlist = watchlist.filter(s => s !== currentSymbol);
            showToast(`${currentSymbol} removed from watchlist`);
        }
        updateWatchlistUI();
    } catch (e) { console.error('Watchlist Error', e); }
}

function updateTimeframe(period) {
    currentPeriod = period;
    document.querySelectorAll('.tf-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === period);
    });
    loadMainChart();
    fetchLiveAnalysis(currentSymbol);
}

function hideGlobalLoading() {
    const loader = document.getElementById('globalLoader');
    if (loader && loader.classList.contains('active')) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.classList.remove('active');
            loader.style.display = 'none';
        }, 500);
    }
}

function setupReadMore() {
    const btn = document.getElementById('readMoreBtn');
    const wrap = document.getElementById('descWrap');
    if (btn && wrap) {
        btn.onclick = () => {
            const isCollapsed = wrap.classList.toggle('collapsed');
            btn.querySelector('span').textContent = isCollapsed ? 'Read More' : 'Show Less';
        };
    }
}

async function fetchNewsSentiment(symbol) {
    try {
        const res = await fetch(`/api/news?symbol=${symbol}`);
        const data = await res.json();
        const badge = document.getElementById('moodBadge');
        if (badge && data.mood) {
            badge.textContent = data.mood;
            badge.className = `mood-badge ${data.mood === 'BULLISH' ? 'mood-bull' : data.mood === 'BEARISH' ? 'mood-bear' : ''}`;
        }
        if (data.news && data.news.length) {
            const list = document.getElementById('newsList');
            if (list) {
                list.innerHTML = data.news.map(item => `
                    <div class="news-item">
                        <a href="${item.link}" target="_blank" class="news-title">${item.title}</a>
                        <div class="news-meta">
                            <span class="news-pub">${item.publisher}</span>
                            <span class="news-sent ${item.sentiment === 'Positive' ? 'sent-pos' : item.sentiment === 'Negative' ? 'sent-neg' : 'sent-neu'}">${item.sentiment}</span>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (e) { console.warn("News error:", e); }
}

function updateSimpleInterpretation(data) {
    const summaryEl = document.getElementById('aiSimpleSummary');
    const riskTag = document.getElementById('riskTag');
    if (!summaryEl || !riskTag) return;

    const signal = data.signal || 'HOLD';
    const conf = data.confidence || 0;
    const rsi = data.rsi || 50;

    let summary = "";
    let risk = "med";
    let riskLabel = "Moderate Risk";

    if (signal === 'BUY') {
        if (conf > 80) {
            summary = "<strong>Strong Buying Opportunity:</strong> Multiple indicators show high momentum. This is considered a premium entry point by our AI ensemble.";
            risk = "low"; riskLabel = "Low Risk Entry";
        } else {
            summary = "<strong>Positive Trend:</strong> Most signals are turning bullish. It's a good time to consider a position, but watch for market volatility.";
            risk = "med"; riskLabel = "Moderate Risk";
        }
    } else if (signal === 'SELL') {
        if (conf > 80) {
            summary = "<strong>High Caution Advised:</strong> Major negative signals detected. Our AI suggests securing profits or avoiding new entries right now.";
            risk = "high"; riskLabel = "High Risk Alert";
        } else {
            summary = "<strong>Weakening Momentum:</strong> Indicators are starting to turn bearish. Consider setting stop-losses to protect your capital.";
            risk = "med"; riskLabel = "Moderate Risk";
        }
    } else {
        summary = "<strong>Market Consolidation:</strong> Currently no clear trend. The technicals and sentiment are balanced. Keeping this on your watchlist is the safest strategy.";
        risk = "low"; riskLabel = "Stable / Low Risk";
    }

    // Add RSI context if extreme
    if (rsi > 70) summary += " <br><span style='font-size:0.8rem; opacity:0.8;'>Note: RSI is high, suggesting the stock might be 'Overbought' (temporarily expensive).</span>";
    else if (rsi < 30) summary += " <br><span style='font-size:0.8rem; opacity:0.8;'>Note: RSI is very low, suggesting the stock is 'Oversold' (could be a bargain).</span>";

    summaryEl.innerHTML = summary;
    riskTag.className = `risk-tag risk-${risk}`;
    riskTag.textContent = riskLabel;
}

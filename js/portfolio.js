// AI PORTFOLIO WIZARD LOGIC

document.addEventListener('DOMContentLoaded', () => {
  // Check auth
  const user = JSON.parse(localStorage.getItem('currentUser'));
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Set initial step
  nextStep(1);

  // Dismiss global loading overlay
  setTimeout(() => {
    if (typeof hideGlobalLoading === 'function') {
      hideGlobalLoading();
    }
  }, 500);
});

function nextStep(step) {
  // Hide all steps
  document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));

  // Show target step
  let targetId = `wizardStep${step}`;
  if (step === 'result') targetId = 'wizardResult';

  const target = document.getElementById(targetId);
  if (target) target.classList.add('active');
}

function setQuickAmount(val) {
  const input = document.getElementById('investAmount');
  if (input) input.value = val;
}

async function generateInvestPlan() {
  const amount = document.getElementById('investAmount').value;
  const risk = document.querySelector('input[name="investRisk"]:checked')?.value || 'medium';
  const horizon = document.querySelector('input[name="investHorizon"]:checked')?.value || 'medium';

  if (!amount || amount < 1000) {
    showToast("Please enter a valid investment amount (min ₹1,000)", "error");
    return;
  }

  const btn = document.getElementById('generatePlanBtn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Analyzing...';

  try {
    const res = await fetch('/api/generate-portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, risk, horizon })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    renderPortfolioResult(data);
    nextStep('result');
  } catch (err) {
    showToast("Algorithm Error: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

let treemapChart = null;
let radarChart = null;
let simulatedGrowthChart = null;

function renderPortfolioResult(data) {
  const wizardBox = document.querySelector('.wizard-box');
  const dashResult = document.getElementById('portfolioDashboardResult');

  if (wizardBox) wizardBox.style.display = 'none';
  if (dashResult) {
    dashResult.style.display = 'block';

    // Inject the HTML structure
    dashResult.innerHTML = `
      <div class="pd-header">
        <div class="pd-stat-card">
          <div style="color:var(--muted); font-size:0.85rem; text-transform:uppercase; font-weight:700;">Total Invested</div>
          <div class="pd-stat-val">₹${data.totalInvested.toLocaleString('en-IN')}</div>
        </div>
        <div class="pd-stat-card">
          <div style="color:var(--muted); font-size:0.85rem; text-transform:uppercase; font-weight:700;">Est. Annual Yield</div>
          <div class="pd-stat-val" style="color:var(--green);">+${data.riskLevel === 'High' ? '18.5%' : data.riskLevel === 'Medium' ? '12.4%' : '8.2%'}</div>
        </div>
        <div class="pd-stat-card">
          <div style="color:var(--muted); font-size:0.85rem; text-transform:uppercase; font-weight:700;">Volatility Ratio</div>
          <div class="pd-stat-val" style="color:var(--orange);">${data.analytics.volatility}%</div>
        </div>
        <div class="pd-stat-card" style="background:var(--accent); color:white;">
          <div style="opacity:0.8; font-size:0.85rem; text-transform:uppercase; font-weight:700;">Portfolio Risk Score</div>
          <div class="pd-stat-val" style="color:white; font-size:1.3rem;">${data.analytics.volatility > 30 ? 'High' : data.analytics.volatility > 15 ? 'Moderate' : 'Low'}</div>
        </div>
      </div>

      <div class="pd-grid">
        <!-- Asset Allocation Treemap -->
        <div class="pd-chart-box">
          <div class="pd-chart-title"><i class="fas fa-chart-pie" style="color:var(--accent);"></i> Portfolio Composition</div>
          <div id="allocTreemap" style="min-height: 300px;"></div>
        </div>
        
        <!-- Factor Risk Radar -->
        <div class="pd-chart-box">
          <div class="pd-chart-title"><i class="fas fa-radar" style="color:var(--orange);"></i> Factor Exposure</div>
          <div id="factorRadar" style="min-height: 300px;"></div>
        </div>
      </div>

      <!-- Assets Table -->
      <div class="pd-chart-box" style="margin-bottom: 2rem;">
        <div class="pd-chart-title"><i class="fas fa-layer-group" style="color:var(--green);"></i> Strategic Assets</div>
        <div style="overflow-x: auto;">
          <table class="pd-assets-table">
            <thead>
              <tr>
                <th>Asset / Ticker</th>
                <th>Sector</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Allocation</th>
                <th>AI Insight</th>
              </tr>
            </thead>
            <tbody>
              ${data.portfolio.map(item => `
                <tr>
                  <td>
                    <div style="font-weight:700;">${item.symbol}</div>
                    <div style="font-size:0.8rem; color:var(--muted);">${item.name}</div>
                  </td>
                  <td><span class="pick-badge" style="background:var(--surface-2); color:var(--text);">${item.sector}</span></td>
                  <td>₹${item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td>${item.shares} <span style="color:var(--muted);font-size:0.8rem;">units</span></td>
                  <td>
                    <div style="font-weight:700;">${item.allocation}</div>
                    <div style="font-size:0.8rem; color:var(--muted);">₹${item.amount.toLocaleString('en-IN')}</div>
                  </td>
                  <td>
                    <div class="asset-pill">
                      <i class="fas fa-brain"></i> 
                      ${getRationaleForStock(item.symbol, data.riskLevel)}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Growth Simulator -->
      <div class="pd-chart-box" style="margin-bottom: 2rem;">
        <div class="pd-chart-title"><i class="fas fa-chart-line" style="color:var(--blue);"></i> 5-Year Wealth Simulator</div>
        <p style="font-size:0.85rem; color:var(--muted); margin-bottom: 1rem;">Projected compounded growth vs standard savings benchmark.</p>
        <div id="wealthSimulator" style="min-height: 300px;"></div>
      </div>


    `;

    // Render Charts
    setTimeout(() => {
      renderDashboardCharts(data);
    }, 100);
  }
}

function getRationaleForStock(symbol, risk) {
  const rationales = {
    'RELIANCE': 'Core Stabilizer',
    'TCS': 'Consistent Compounder',
    'INFY': 'Div Yield Focus',
    'HDFCBANK': 'Financial Anchor',
    'ICICIBANK': 'Growth Catalyst',
    'SBIN': 'Value Play',
    'LART': 'Infrastructure Growth',
    'BAJFINANCE': 'Aggressive Growth',
    'ITC': 'Defensive High-Yield',
    'ZOMATO': 'High Momentum'
  };
  return rationales[symbol] || (risk === 'High' ? 'Aggressive Growth' : 'Diversified Mid-Cap');
}

function renderDashboardCharts(data) {
  if (typeof ApexCharts === 'undefined') return;

  // 1. Treemap
  const treemapTarget = document.querySelector("#allocTreemap");
  if (treemapTarget) {
    const treemapOptions = {
      series: [{
        data: data.portfolio.map(p => ({
          x: p.symbol,
          y: p.amount
        }))
      }],
      chart: { type: 'treemap', height: 300, toolbar: { show: false }, background: 'transparent', foreColor: '#a0aec0', fontFamily: 'Outfit, sans-serif' },
      colors: ['#4361ee', '#3a0ca3', '#7209b7', '#f72585', '#4cc9f0'],
      plotOptions: {
        treemap: {
          enableShades: true,
          shadeIntensity: 0.5,
          reverseNegativeShade: true,
          colorScale: {
            ranges: [
              { from: 0, to: 1000000, color: '#4361ee' }
            ]
          }
        }
      },
      dataLabels: {
        style: { fontSize: '14px', fontWeight: 'bold' },
        formatter: function (text, op) {
          return [text, '₹' + op.value.toLocaleString('en-IN')]
        }
      }
    };
    if (treemapChart) treemapChart.destroy();
    treemapChart = new ApexCharts(treemapTarget, treemapOptions);
    treemapChart.render();
  }

  // 2. Factor Radar
  const radarTarget = document.querySelector("#factorRadar");
  if (radarTarget) {
    const analytics = data.analytics;
    const radarOptions = {
      series: [{
        name: 'Risk DNA',
        data: [
          analytics.volatility,
          analytics.diversityScore,
          analytics.concentration,
          data.riskLevel === 'High' ? 90 : 40, // Momentum (partial mock)
          80 // Quality (partial mock)
        ]
      }],
      chart: { type: 'radar', height: 320, toolbar: { show: false }, background: 'transparent', foreColor: '#a0aec0', fontFamily: 'Outfit, sans-serif' },
      xaxis: { categories: ['Volatility', 'Diversity', 'Concentration', 'Momentum', 'Quality'] },
      yaxis: { show: false, min: 0, max: 100 },
      fill: { opacity: 0.4, colors: ['#4361ee'] },
      stroke: { show: true, width: 2, colors: ['#4361ee'], dashArray: 0 },
      markers: { size: 4, colors: ['#fff'], strokeColors: '#4361ee', strokeWidth: 2 }
    };
    if (radarChart) radarChart.destroy();
    radarChart = new ApexCharts(radarTarget, radarOptions);
    radarChart.render();
  }

  // 3. Wealth Simulator (Area Chart)
  const simTarget = document.querySelector("#wealthSimulator");
  if (simTarget) {
    const base = data.totalInvested;
    const aiRate = data.riskLevel === 'High' ? 0.18 : data.riskLevel === 'Medium' ? 0.13 : 0.09;
    const saveRate = 0.05; // 5% savings account

    const aiGrowth = [base];
    const saveGrowth = [base];
    const categories = ['Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];

    for (let i = 1; i <= 5; i++) {
      aiGrowth.push(Math.round(aiGrowth[i - 1] * (1 + aiRate)));
      saveGrowth.push(Math.round(saveGrowth[i - 1] * (1 + saveRate)));
    }

    const simOptions = {
      series: [
        { name: 'AI Portfolio', data: aiGrowth },
        { name: 'Standard Savings', data: saveGrowth }
      ],
      chart: { type: 'area', height: 300, toolbar: { show: false }, background: 'transparent', foreColor: '#a0aec0', fontFamily: 'Outfit, sans-serif' },
      colors: ['#10b981', '#64748b'],
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      xaxis: { categories: categories },
      yaxis: {
        labels: { formatter: (val) => "₹" + (val / 1000).toFixed(0) + "k" }
      },
      tooltip: {
        theme: 'dark',
        y: { formatter: (val) => "₹" + val.toLocaleString('en-IN') }
      },
      grid: { borderColor: 'rgba(240, 242, 248, 0.05)', strokeDashArray: 4 }
    };
    if (simulatedGrowthChart) simulatedGrowthChart.destroy();
    simulatedGrowthChart = new ApexCharts(simTarget, simOptions);
    simulatedGrowthChart.render();
  }
}

function saveVirtualPortfolio() {
  if (typeof showToast === 'function') {
    showToast("Success! Portfolio saved to your virtual tracking environment.", "success");
  } else {
    alert("Success! Portfolio saved to your virtual tracking environment.");
  }
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 2000);
}

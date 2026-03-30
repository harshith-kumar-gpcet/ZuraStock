// Common functionality for ZuraStock

// Toast Notifications
function showToast(message, color = 'var(--accent)') {
    let container = document.getElementById('toastWrapper');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastWrapper';
        document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.className = 'toast';
    t.style.display = 'block';
    t.style.backgroundColor = color;
    t.innerHTML = message;
    container.appendChild(t);
    setTimeout(() => t.remove(), 2800);
}

// Clock Header (Common)
function updateClock() {
    const el = document.getElementById('clockBadge');
    if (!el) return;
    const now = new Date();
    el.textContent =
        now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
if (document.getElementById('clockBadge')) {
    setInterval(updateClock, 1000);
    updateClock();
}

// Theme Switching
function initTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') {
        document.documentElement.classList.add('dark-theme');
        updateThemeIcon(true);
    }

    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateThemeIcon(isDark);
        });
    }
}

function updateThemeIcon(isDark) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initMarketCalendar();
    initTheme();
    initSearchAutocomplete();
});

// --- Search Autocomplete ---
function initSearchAutocomplete() {
    const input = document.getElementById('globalSearch');
    if (!input) return;

    // Create dropdown container
    const container = document.createElement('div');
    container.className = 'search-dropdown-container';
    container.style.display = 'none';
    input.parentNode.appendChild(container);

    let debounceTimer;

    input.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();

        if (query.length < 1) {
            container.style.display = 'none';
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${query}`);
                if (!res.ok) throw new Error("Search failed");
                const matches = await res.json();

                if (matches.length > 0) {
                    const stocks = matches.filter(m => m.sector !== 'Mutual Funds' && m.sector !== 'Commodities');
                    const funds = matches.filter(m => m.sector === 'Mutual Funds' || m.sector === 'Commodities');

                    let html = '';
                    if (stocks.length > 0) {
                        html += `<div class="search-group-label">STOCKS</div>`;
                        html += stocks.map(stock => renderItem(stock)).join('');
                    }
                    if (funds.length > 0) {
                        html += `<div class="search-group-label">MUTUAL FUNDS & ETFS</div>`;
                        html += funds.map(fund => renderItem(fund)).join('');
                    }

                    container.innerHTML = html;
                    container.style.display = 'block';
                } else {
                    container.innerHTML = `<div class="search-dropdown-empty">No results found for "${query}"</div>`;
                    container.style.display = 'block';
                }
            } catch (err) {
                console.error(err);
            }
        }, 150);

        function renderItem(item) {
            const initials = item.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const color = (item.sector === 'Mutual Funds' || item.sector === 'Commodities') ? 'var(--purple)' : 'var(--accent)';
            return `
            <div class="search-dropdown-item" onclick="window.location.href='stock.html?symbol=${item.symbol}'">
                <div class="sdi-logo" style="background: ${color}">${initials}</div>
                <div class="sdi-info">
                <span class="sdi-sym">${item.symbol}</span>
                <span class="sdi-name">${item.name}</span>
                </div>
                <div class="sdi-sector">${item.sector}</div>
            </div>
            `;
        }
    });

    // Hide dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !container.contains(e.target)) {
            container.style.display = 'none';
        }
    });
}

// Websocket shared utility logic can go here in the future

function applyUserProfile() {
    // Update user profile globally
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
        try {
            const user = JSON.parse(currentUserStr);
            if (user && user.name) {
                const nameElements = document.querySelectorAll('.user-name, .h-user-name');
                nameElements.forEach(el => el.textContent = user.name);

                const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                const avatarElements = document.querySelectorAll('.user-avatar, .h-avatar');
                avatarElements.forEach(el => el.textContent = initials);
            }
        } catch (e) {
            console.error("Failed to parse user session", e);
        }
    }
}

applyUserProfile();

// Market Calendar
function initMarketCalendar() {
    const calEl = document.getElementById('marketCalendar');
    if (!calEl) return;

    let currentDate = new Date();

    const renderCalendar = () => {
        const monthYearEl = document.getElementById('mcMonthYear');
        const daysContainer = document.getElementById('mcDays');
        if (!monthYearEl || !daysContainer) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        monthYearEl.textContent = `${monthNames[month]} ${year}`;

        // Indian Stock Market Holidays 2026 (simplified example)
        const holidays = [
            '2026-01-26', // Republic Day
            '2026-03-03', // Mahashivratri
            '2026-03-23', // Holi
            '2026-04-10', // Good Friday
            '2026-04-14', // Ambedkar Jayanti
            '2026-05-01', // Maharashtra Day
            '2026-08-15', // Independence Day
            '2026-10-02', // Gandhi Jayanti
            '2026-10-20', // Dussehra
            '2026-11-09', // Diwali
            '2026-12-25'  // Christmas
        ];

        daysContainer.innerHTML = '';

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'mc-day empty';
            daysContainer.appendChild(emptyDay);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dayEl = document.createElement('div');
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayOfWeek = new Date(year, month, i).getDay();

            let status = 'open';
            if (dayOfWeek === 0 || dayOfWeek === 6 || holidays.includes(dateStr)) {
                status = 'closed';
            }

            let classes = ['mc-day', status];
            if (year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) {
                classes.push('today');
            }

            dayEl.className = classes.join(' ');
            dayEl.textContent = i;
            dayEl.title = status === 'open' ? 'Market Open' : 'Market Closed';
            daysContainer.appendChild(dayEl);
        }
    };

    const prevBtn = document.getElementById('mcPrevBtn');
    const nextBtn = document.getElementById('mcNextBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    }

    renderCalendar();
}

document.addEventListener('DOMContentLoaded', initMarketCalendar);
// In case DOM is already loaded (e.g. injected scripts)
if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(initMarketCalendar, 1);
}

// Global Loading Handlers
function showGlobalLoading(title, subtitle) {
    const loader = document.getElementById('globalLoader');
    if (!loader) return;

    if (title) loader.querySelector('.loading-title').textContent = title;
    if (subtitle) loader.querySelector('.loading-subtitle').textContent = subtitle;

    loader.classList.add('active');
}

function hideGlobalLoading() {
    const loader = document.getElementById('globalLoader');
    if (!loader) return;

    loader.classList.remove('active');
}

// Global Transition Helper for Links
document.addEventListener('click', (e) => {
    const target = e.target.closest('a');
    if (!target) return;

    const href = target.getAttribute('href');
    if (!href || href.startsWith('#') || href.includes('javascript:')) return;
    
    // Ignore links that are meant to open in a new tab
    if (target.getAttribute('target') === '_blank') return;

    // Smooth transitions for specific app links
    const isInternal = !href.startsWith('http') && (href.endsWith('.html') || href.includes('.html?'));

    if (isInternal) {
        e.preventDefault();

        // Context-aware messages
        let title = 'Loading';
        let sub = 'Please wait...';

        if (target.classList.contains('predict-btn')) {
            title = 'AI Analysis Initiated';
            sub = 'Crunching real-time market data...';
        } else if (href.includes('register.html')) {
            title = 'ZuraStock';
            sub = 'Opening registration...';
        } else if (href.includes('login.html')) {
            title = 'ZuraStock';
            sub = 'Returning to login...';
        } else if (href.includes('index.html')) {
            title = 'ZuraStock';
            sub = 'Initializing dashboard...';
        }

        showGlobalLoading(title, sub);
        setTimeout(() => {
            window.location.href = href;
        }, 400);
    }
});

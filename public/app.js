// ─── Config ───────────────────────────────────────────────────────────────────
// Calls go to our local proxy server which forwards to 2factor.in server-side
const PROXY = window.location.origin;
const TIMEOUT = 10000;

// ─── State ────────────────────────────────────────────────────────────────────
let mobile = '';
let timerInterval = null;

// ─── Theme ────────────────────────────────────────────────────────────────────
function _applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const track = document.getElementById('themeTrack');
  const label = document.getElementById('themeLabel');
  const icon  = document.getElementById('themeIcon');
  if (track) track.classList.toggle('on', dark);
  if (label) label.textContent = dark ? 'Light Mode' : 'Dark Mode';
  if (icon)  icon.innerHTML = dark
    ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
    : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next   = !isDark;
  localStorage.setItem('autopay_theme', next ? 'dark' : 'light');
  _applyTheme(next);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function _seedDemoHistory() {
  if (getHistory().length > 0) return; // don't overwrite real data
  const demos = [
    { name: 'Netflix',  amount: '199', date: '2026-03-01', status: 'success', method: 'AutoPay' },
    { name: 'YouTube',  amount: '129', date: '2026-03-10', status: 'success', method: 'AutoPay' },
    { name: 'Spotify',  amount: '119', date: '2026-03-18', status: 'success', method: 'AutoPay' },
  ];
  localStorage.setItem('autopay_history', JSON.stringify(demos));
}

document.addEventListener('DOMContentLoaded', () => {
  _seedDemoHistory();
  // Splash → login (or home if already logged in)
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    splash.style.transition = 'opacity 0.4s ease-out';
    splash.style.opacity = '0';
    setTimeout(() => {
      splash.style.display = 'none';
      const saved = localStorage.getItem('autopay_auth');
      if (saved) {
        const { mobile: m } = JSON.parse(saved);
        mobile = m;
        showHome(m);
      } else {
        showScreen('loginScreen');
      }
    }, 400);
  }, 2500);
});

// ─── Sidebar & Tab Navigation ─────────────────────────────────────────────────
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

const TAB_TITLES = { dashboard: 'Dashboard', history: 'History', analytics: 'Analytics', settings: 'Settings' };

function switchTab(tab) {
  document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const tabEl = document.getElementById(`tab-${tab}`);
  if (tabEl) tabEl.classList.add('active');
  const navEl = document.getElementById(`nav-${tab}`);
  if (navEl) navEl.classList.add('active');
  document.getElementById('dashTabTitle').textContent = TAB_TITLES[tab] || tab;
  closeSidebar();
  if (tab === 'history')   renderHistoryView();
  if (tab === 'analytics') renderAnalyticsView();
  if (tab === 'settings')  renderSettingsView();
}

// ─── Stats update ─────────────────────────────────────────────────────────────
function _updateStats(payments) {
  const monthly = payments.filter(p => p.type === 'monthly');
  const activeCount = monthly.filter(p => p.status !== 'paused').length;
  const monthlyTotal = monthly.filter(p => p.status !== 'paused').reduce((s, p) => s + Number(p.amount), 0);
  const el1 = document.getElementById('statMonthlySpend');
  const el2 = document.getElementById('statActiveSubs');
  if (el1) el1.textContent = `₹${monthlyTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (el2) el2.textContent = activeCount;
}

// ─── Recent Activity (last 3 from history) ───────────────────────────────────
function _renderRecentActivity() {
  const el = document.getElementById('recentActivityList');
  if (!el) return;
  const history = getHistory().slice(-3).reverse();
  el.innerHTML = '';
  if (history.length === 0) {
    el.innerHTML = '<p style="color:#6B7280;font-size:13px;text-align:center;padding:20px 0">No recent activity</p>';
    return;
  }
  history.forEach(h => {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid #F3F4F6',
    });
    const isSuccess = h.status === 'success';
    const left = document.createElement('div');
    left.style.display = 'flex'; left.style.alignItems = 'center'; left.style.gap = '10px';
    const info = document.createElement('div');
    const name = document.createElement('p');
    name.textContent = h.name;
    Object.assign(name.style, { color: '#1A1A2E', fontSize: '13px', fontWeight: '600', margin: '0 0 1px' });
    const ts = document.createElement('p');
    ts.textContent = _formatDate(h.date);
    Object.assign(ts.style, { color: '#6B7280', fontSize: '11px', margin: '0' });
    info.appendChild(name); info.appendChild(ts);
    left.appendChild(_serviceLogo(h.name, 28)); left.appendChild(info);
    const amt = document.createElement('p');
    amt.textContent = `₹${Number(h.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    Object.assign(amt.style, { color: isSuccess ? '#10B981' : '#EF4444', fontSize: '13px', fontWeight: '700', margin: '0' });
    row.appendChild(left); row.appendChild(amt);
    el.appendChild(row);
  });
}

// ─── History View ─────────────────────────────────────────────────────────────
function renderHistoryView() {
  const el = document.getElementById('historyList');
  if (!el) return;
  const history = getHistory().slice().reverse();
  el.innerHTML = '';

  // Update count badge
  const countEl = document.getElementById('historyCount');
  if (countEl) countEl.textContent = history.length > 0 ? `${history.length} records` : '';

  if (history.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:48px 0">
      <div style="width:56px;height:56px;background:#EEF1FF;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3D5AFE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      </div>
      <p style="color:#1A1A2E;font-size:15px;font-weight:600;margin:0 0 6px">No history yet</p>
      <p style="color:#6B7280;font-size:13px;margin:0">Payments will appear here once processed</p>
    </div>`;
    return;
  }

  // Table wrapper for horizontal scroll on mobile
  const wrap = document.createElement('div');
  wrap.style.overflowX = 'auto';

  const table = document.createElement('table');
  Object.assign(table.style, {
    width: '100%', borderCollapse: 'collapse', fontSize: '13px',
    fontFamily: 'Inter, Segoe UI, sans-serif',
  });

  // Header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Date', 'Service', 'Amount', 'Method', 'Status'].forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    Object.assign(th.style, {
      padding: '10px 16px', textAlign: col === 'Amount' || col === 'Status' ? 'right' : 'left',
      color: '#6B7280', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase',
      letterSpacing: '0.05em', borderBottom: '2px solid #F3F4F6', whiteSpace: 'nowrap',
      background: '#FAFAFA',
    });
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');
  history.forEach((h, i) => {
    const isSuccess = h.status === 'success';
    const tr = document.createElement('tr');
    tr.style.transition = 'background 0.15s';
    tr.addEventListener('mouseenter', () => tr.style.background = '#F9FAFB');
    tr.addEventListener('mouseleave', () => tr.style.background = 'transparent');

    const borderStyle = i < history.length - 1 ? '1px solid #F3F4F6' : 'none';

    // Date
    const tdDate = document.createElement('td');
    tdDate.textContent = _formatDate(h.date);
    Object.assign(tdDate.style, { padding: '14px 16px', color: '#6B7280', fontSize: '13px', borderBottom: borderStyle, whiteSpace: 'nowrap' });

    // Service
    const tdService = document.createElement('td');
    const serviceWrap = document.createElement('div');
    serviceWrap.style.display = 'flex';
    serviceWrap.style.alignItems = 'center';
    serviceWrap.style.gap = '10px';
    const avatar = document.createElement('div');
    Object.assign(avatar.style, {
      width: '32px', height: '32px', borderRadius: '8px', background: '#EEF1FF',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0',
      color: '#3D5AFE', fontSize: '12px', fontWeight: '700',
    });
    avatar.textContent = (h.name || '?')[0].toUpperCase();
    const svcName = document.createElement('span');
    svcName.textContent = h.name;
    Object.assign(svcName.style, { color: '#1A1A2E', fontWeight: '600' });
    serviceWrap.appendChild(avatar);
    serviceWrap.appendChild(svcName);
    tdService.appendChild(serviceWrap);
    Object.assign(tdService.style, { padding: '14px 16px', borderBottom: borderStyle });

    // Amount
    const tdAmt = document.createElement('td');
    tdAmt.textContent = `₹${Number(h.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    Object.assign(tdAmt.style, { padding: '14px 16px', textAlign: 'right', color: '#1A1A2E', fontWeight: '700', borderBottom: borderStyle, whiteSpace: 'nowrap' });

    // Method
    const tdMethod = document.createElement('td');
    tdMethod.textContent = h.method || 'AutoPay';
    Object.assign(tdMethod.style, { padding: '14px 16px', color: '#6B7280', borderBottom: borderStyle });

    // Status
    const tdStatus = document.createElement('td');
    tdStatus.style.padding = '14px 16px';
    tdStatus.style.textAlign = 'right';
    tdStatus.style.borderBottom = borderStyle;
    const badge = document.createElement('span');
    badge.textContent = isSuccess ? 'Success' : 'Failed';
    Object.assign(badge.style, {
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: '50px', fontSize: '11px', fontWeight: '600',
      color: isSuccess ? '#10B981' : '#EF4444',
      background: isSuccess ? '#ECFDF5' : '#FEF2F2',
    });
    badge.innerHTML = (isSuccess
      ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
      : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
    ) + badge.textContent;
    tdStatus.appendChild(badge);

    tr.appendChild(tdDate);
    tr.appendChild(tdService);
    tr.appendChild(tdAmt);
    tr.appendChild(tdMethod);
    tr.appendChild(tdStatus);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  el.appendChild(wrap);
}

// ─── Analytics View ───────────────────────────────────────────────────────────
let _chartPie = null;
let _chartBar = null;

function renderAnalyticsView() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;

  // Destroy old chart instances before re-rendering
  if (_chartPie) { _chartPie.destroy(); _chartPie = null; }
  if (_chartBar) { _chartBar.destroy(); _chartBar = null; }

  const payments = getPayments();
  const history  = getHistory();
  const monthly  = payments.filter(p => p.type === 'monthly' && p.status !== 'paused');
  const monthlyTotal  = monthly.reduce((s, p) => s + Number(p.amount), 0);
  const successCount  = history.filter(h => h.status === 'success').length;
  const failedCount   = history.filter(h => h.status === 'failed').length;
  const totalSpent    = history.filter(h => h.status === 'success').reduce((s, h) => s + Number(h.amount), 0);

  // ── Category colours ──
  const PALETTE = ['#3D5AFE','#6B8EFF','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6'];

  // ── Pie data: group payments by category (fallback to name) ──
  const catMap = {};
  payments.forEach(p => {
    const cat = p.category || p.name;
    catMap[cat] = (catMap[cat] || 0) + Number(p.amount);
  });
  const pieLabels = Object.keys(catMap);
  const pieData   = Object.values(catMap);

  // ── Bar data: last 6 months of successful history ──
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), year: d.getFullYear(), month: d.getMonth() };
  });
  const barData = months.map(m =>
    history.filter(h => {
      if (h.status !== 'success') return false;
      const d = new Date(h.date);
      return d.getFullYear() === m.year && d.getMonth() === m.month;
    }).reduce((s, h) => s + Number(h.amount), 0)
  );

  // ── Top 3 subscriptions ──
  const top3 = [...payments].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 3);

  function statCard(icon, label, value, color) {
    return `<div style="background:#fff;border-radius:14px;padding:18px 20px;box-shadow:0 2px 12px rgba(0,0,0,0.06);display:flex;align-items:center;gap:14px">
      <div style="width:46px;height:46px;border-radius:12px;background:#EEF1FF;display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon}</div>
      <div>
        <p style="font-size:11px;color:#6B7280;margin:0 0 3px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em">${label}</p>
        <p style="font-size:20px;font-weight:700;color:${color || '#1A1A2E'};margin:0">${value}</p>
      </div>
    </div>`;
  }

  el.innerHTML = `
    <!-- Stat cards row -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:16px;margin-bottom:20px">
      ${statCard('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3D5AFE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>','Monthly Commitment','₹'+monthlyTotal.toLocaleString('en-IN',{minimumFractionDigits:2}),'#3D5AFE')}
      ${statCard('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>','Successful',''+successCount,'#10B981')}
      ${statCard('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>','Failed',''+failedCount,'#EF4444')}
      ${statCard('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3D5AFE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>','Total Sent','₹'+totalSpent.toLocaleString('en-IN',{minimumFractionDigits:2}),'#1A1A2E')}
    </div>

    <!-- Charts row -->
    <div class="charts-row" style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
      <!-- Pie chart -->
      <div style="background:#fff;border-radius:14px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
        <h3 style="color:#1A1A2E;font-size:15px;font-weight:700;margin:0 0 16px">Spending by Subscription</h3>
        ${pieLabels.length === 0
          ? '<p style="color:#6B7280;font-size:13px;text-align:center;padding:40px 0">No data yet</p>'
          : '<div style="position:relative;height:220px"><canvas id="pieChart"></canvas></div>'
        }
      </div>
      <!-- Bar chart -->
      <div style="background:#fff;border-radius:14px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
        <h3 style="color:#1A1A2E;font-size:15px;font-weight:700;margin:0 0 16px">Monthly Spend (Last 6 Months)</h3>
        <div style="position:relative;height:220px"><canvas id="barChart"></canvas></div>
      </div>
    </div>

    <!-- Top subscriptions -->
    <div style="background:#fff;border-radius:14px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
      <h3 style="color:#1A1A2E;font-size:15px;font-weight:700;margin:0 0 16px">Top Subscriptions</h3>
      ${top3.length === 0
        ? '<p style="color:#6B7280;font-size:13px;text-align:center;padding:16px 0">No subscriptions yet</p>'
        : top3.map((p, i) => {
            const pct = monthlyTotal > 0 ? Math.round((Number(p.amount) / monthlyTotal) * 100) : 0;
            const medal = ['🥇','🥈','🥉'][i];
            return `<div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:${i < top3.length-1 ? '1px solid #F3F4F6' : 'none'}">
              <span style="font-size:22px;flex-shrink:0">${medal}</span>
              <div style="flex:1;min-width:0">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                  <span style="font-size:14px;font-weight:600;color:#1A1A2E">${p.name}</span>
                  <span style="font-size:14px;font-weight:700;color:#3D5AFE">₹${Number(p.amount).toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
                </div>
                <div style="height:6px;background:#EEF1FF;border-radius:50px;overflow:hidden">
                  <div style="height:100%;width:${pct}%;background:${PALETTE[i]};border-radius:50px;transition:width 0.6s ease"></div>
                </div>
              </div>
            </div>`;
          }).join('')
      }
    </div>`;

  // ── Render Pie Chart ──
  if (pieLabels.length > 0) {
    const pieCtx = document.getElementById('pieChart')?.getContext('2d');
    if (pieCtx) {
      _chartPie = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels: pieLabels,
          datasets: [{ data: pieData, backgroundColor: PALETTE.slice(0, pieLabels.length), borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: { position: 'bottom', labels: { color: '#6B7280', font: { family: 'Inter', size: 12 }, padding: 16, boxWidth: 12, boxHeight: 12 } },
            tooltip: {
              callbacks: {
                label: ctx => ` ₹${Number(ctx.raw).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              },
            },
          },
        },
      });
    }
  }

  // ── Render Bar Chart ──
  const barCtx = document.getElementById('barChart')?.getContext('2d');
  if (barCtx) {
    _chartBar = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: months.map(m => m.label),
        datasets: [{
          label: 'Spent (₹)',
          data: barData,
          backgroundColor: months.map((_, i) => i === months.length - 1 ? '#3D5AFE' : '#C7D2FE'),
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => ` ₹${Number(ctx.raw).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#6B7280', font: { family: 'Inter', size: 11 } } },
          y: {
            grid: { color: '#F3F4F6' },
            ticks: {
              color: '#6B7280', font: { family: 'Inter', size: 11 },
              callback: v => '₹' + Number(v).toLocaleString('en-IN'),
            },
            beginAtZero: true,
          },
        },
      },
    });
  }
}

// ─── Settings View ────────────────────────────────────────────────────────────
function renderSettingsView() {
  const el = document.getElementById('settingsContent');
  if (!el || el.dataset.rendered) return;
  el.dataset.rendered = '1';
  // Content is static HTML — already in the DOM, nothing to re-render
}

// ─── History Data Layer ───────────────────────────────────────────────────────
function getHistory() {
  try { return JSON.parse(localStorage.getItem('autopay_history') || '[]'); } catch (_) { return []; }
}
function addHistoryEntry(entry) {
  const history = getHistory();
  history.push(entry);
  // Keep last 100 entries
  if (history.length > 100) history.splice(0, history.length - 100);
  localStorage.setItem('autopay_history', JSON.stringify(history));
}

// ─── Screen Manager ───────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.animation = '';
  });
  const el = document.getElementById(id);
  el.classList.add('active');
  // Trigger fade-up
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  requestAnimationFrame(() => {
    el.style.transition = 'opacity 0.35s ease-out, transform 0.35s ease-out';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
}

// ─── Mobile Input ─────────────────────────────────────────────────────────────
function onMobileInput(input) {
  if (input.value.length > 10) input.value = input.value.slice(0, 10);
  setMobileError('');
  const valid = /^[6-9]\d{9}$/.test(input.value);
  setSendBtn(valid);
  if (input.value.length === 10) {
    if (valid) triggerSendOtp();
    else setMobileError('Enter a valid Indian mobile number (starts with 6–9).');
  }
}

function setSendBtn(enabled) {
  const btn = document.getElementById('sendOtpBtn');
  btn.disabled = !enabled;
  btn.style.opacity = enabled ? '1' : '0.4';
  btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
  btn.style.transform = '';
}

function setMobileError(msg) {
  const el = document.getElementById('mobileError');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
  document.getElementById('mobileInputWrap').style.borderColor = msg ? '#EF4444' : '#E5E7EB';
}

function setMobileLoading(on) {
  document.getElementById('mobileLoader').style.display = on ? 'block' : 'none';
  document.getElementById('mobileInput').disabled = on;
  setSendBtn(!on);
}

// ─── Send OTP ─────────────────────────────────────────────────────────────────
async function triggerSendOtp() {
  const val = document.getElementById('mobileInput').value.trim();
  if (!/^[6-9]\d{9}$/.test(val)) return;
  mobile = val;
  setMobileLoading(true);
  setMobileError('');
  try {
    const data = await apiFetch(`${PROXY}/api/send/${mobile}`);
    if (data.Status === 'Success') {
      goToOtp();
    } else {
      setMobileError(data.Details || 'Failed to send OTP. Try again.');
    }
  } catch (e) {
    setMobileError(e.message === 'timeout' ? 'Request timed out. Check your connection.' : 'Network error. Please try again.');
  } finally {
    setMobileLoading(false);
  }
}

// ─── OTP Screen ───────────────────────────────────────────────────────────────
function goToOtp() {
  const masked = mobile.slice(0, 3) + 'XXXXXXX' + mobile.slice(-3);
  document.getElementById('otpSubtitle').textContent = `OTP sent to +91 ${masked}`;
  buildBoxes();
  showScreen('otpScreen');
  startTimer();
  setTimeout(() => document.querySelector('.otp-box')?.focus(), 400);
  tryWebOtp();
}

function buildBoxes() {
  const wrap = document.getElementById('otpBoxes');
  wrap.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.inputMode = 'numeric';
    inp.className = 'otp-box';
    inp.dataset.i = i;
    Object.assign(inp.style, {
      width: '44px', height: '54px', textAlign: 'center', fontSize: '20px',
      fontWeight: '700', border: '2px solid #E5E7EB', borderRadius: '12px',
      outline: 'none', transition: 'all 0.2s', fontFamily: 'inherit',
      color: '#1A1A2E', background: 'white',
    });
    inp.addEventListener('input',   onBoxInput);
    inp.addEventListener('keydown', onBoxKey);
    inp.addEventListener('paste',   onBoxPaste);
    wrap.appendChild(inp);
  }
}

function boxes() { return [...document.querySelectorAll('.otp-box')]; }
function otpVal() { return boxes().map(b => b.value).join(''); }

function onBoxInput(e) {
  const b = e.target, i = +b.dataset.i;
  if (b.value.length > 1) b.value = b.value.slice(-1);
  setOtpError('');
  if (b.value && i < 5) boxes()[i + 1].focus();
  checkComplete();
}

function onBoxKey(e) {
  const b = e.target, i = +b.dataset.i;
  if (e.key === 'Backspace' && !b.value && i > 0) boxes()[i - 1].focus();
}

function onBoxPaste(e) {
  e.preventDefault();
  const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
  const bs = boxes();
  digits.split('').forEach((d, i) => { if (bs[i]) bs[i].value = d; });
  bs[Math.min(digits.length, 5)].focus();
  checkComplete();
}

function checkComplete() {
  const done = otpVal().length === 6;
  const btn = document.getElementById('verifyBtn');
  btn.disabled = !done;
  btn.style.opacity = done ? '1' : '0.4';
  btn.style.cursor = done ? 'pointer' : 'not-allowed';
  if (done) triggerVerifyOtp();
}

function setOtpError(msg) {
  const el = document.getElementById('otpError');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
  if (msg) shakeBoxes();
}

function shakeBoxes() {
  const wrap = document.getElementById('otpBoxes');
  wrap.style.animation = 'none';
  requestAnimationFrame(() => {
    wrap.style.animation = 'shake 0.4s ease-in-out';
  });
}

// ─── Web OTP API ──────────────────────────────────────────────────────────────
async function tryWebOtp() {
  if (!('OTPCredential' in window)) return;
  try {
    const cred = await navigator.credentials.get({ otp: { transport: ['sms'] } });
    if (cred?.code) {
      await animateFill(cred.code);
      triggerVerifyOtp();
    }
  } catch (_) {}
}

async function animateFill(otp) {
  const bs = boxes();
  for (let i = 0; i < Math.min(otp.length, 6); i++) {
    await wait(120 * i);
    bs[i].value = otp[i];
    bs[i].style.animation = 'bounce-in 0.3s ease-out';
    bs[i].style.borderColor = '#3D5AFE';
    bs[i].style.background = '#EEF1FF';
    setTimeout(() => { bs[i].style.animation = ''; }, 350);
  }
}

// ─── Verify OTP ───────────────────────────────────────────────────────────────
async function triggerVerifyOtp() {
  const otp = otpVal();
  if (otp.length !== 6) return;
  setVerifyLoading(true);
  setOtpError('');
  try {
    const data = await apiFetch(`${PROXY}/api/verify/${mobile}/${otp}`);
    if (data.Status === 'Success' && data.Details === 'OTP Matched') {
      localStorage.setItem('autopay_auth', JSON.stringify({ mobile, ts: Date.now() }));
      showHome(mobile);
    } else if (data.Details === 'OTP Expired') {
      setOtpError('OTP has expired. Please resend.');
    } else if (data.Details === 'OTP Mismatch') {
      setOtpError('Incorrect OTP. Please try again.');
    } else {
      setOtpError(data.Details || 'Verification failed.');
    }
  } catch (e) {
    setOtpError(e.message === 'timeout' ? 'Request timed out.' : 'Network error. Try again.');
  } finally {
    setVerifyLoading(false);
  }
}

function setVerifyLoading(on) {
  document.getElementById('verifyBtnText').textContent = on ? 'Verifying...' : 'Verify OTP';
  document.getElementById('verifyLoader').style.display = on ? 'block' : 'none';
  document.getElementById('verifyBtn').disabled = on;
  boxes().forEach(b => b.disabled = on);
}

// ─── Resend Timer ─────────────────────────────────────────────────────────────
function startTimer() {
  clearInterval(timerInterval);
  let s = 30;
  const countEl = document.getElementById('timerCount');
  const btn = document.getElementById('resendBtn');
  const timerEl = document.getElementById('resendTimer');
  btn.disabled = true; btn.style.opacity = '0.4'; btn.style.cursor = 'not-allowed';
  timerEl.style.display = 'block';
  timerInterval = setInterval(() => {
    countEl.textContent = --s;
    if (s <= 0) {
      clearInterval(timerInterval);
      btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer';
      timerEl.style.display = 'none';
    }
  }, 1000);
}

async function resendOtp() {
  try {
    const data = await apiFetch(`${PROXY}/api/send/${mobile}`);
    if (data.Status === 'Success') {
      buildBoxes();
      setOtpError('');
      startTimer();
      setTimeout(() => document.querySelector('.otp-box')?.focus(), 100);
    } else {
      setOtpError(data.Details || 'Failed to resend.');
    }
  } catch (_) { setOtpError('Network error. Try again.'); }
}

// ─── Add Payment Modal ────────────────────────────────────────────────────────
// ─── Add / Edit Payment Modal ─────────────────────────────────────────────────
// Pass an existing payment object to open in edit mode; omit for add mode.
function openAddPaymentModal(existing) {
  if (document.getElementById('apModal-overlay')) return;

  const isEdit = !!existing;

  // ── Overlay ──
  const overlay = document.createElement('div');
  overlay.id = 'apModal-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.5)',
    zIndex: '1000', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '16px', opacity: '0', transition: 'opacity 0.25s ease-in',
  });

  // ── Card ──
  const card = document.createElement('div');
  Object.assign(card.style, {
    background: '#FFFFFF', borderRadius: '16px', padding: '24px',
    width: '100%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    transform: 'translateY(40px)', opacity: '0',
    transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
    fontFamily: 'Inter, Segoe UI, sans-serif',
  });

  // ── Title ──
  const title = document.createElement('h2');
  title.textContent = isEdit ? 'Edit Payment' : 'Add Payment';
  Object.assign(title.style, { color: '#1A1A2E', fontSize: '18px', fontWeight: '700', margin: '0 0 20px' });
  card.appendChild(title);

  // ── Save error ──
  const saveErr = document.createElement('p');
  saveErr.id = 'apModal-saveError';
  Object.assign(saveErr.style, { color: '#EF4444', fontSize: '12px', margin: '0 0 12px', display: 'none' });
  card.appendChild(saveErr);

  // ── Helper: field builder ──
  function makeField(labelText, inputEl, errorId) {
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '16px';
    const lbl = document.createElement('label');
    lbl.textContent = labelText;
    Object.assign(lbl.style, { display: 'block', color: '#1A1A2E', fontSize: '13px', fontWeight: '600', marginBottom: '6px' });
    const errEl = document.createElement('p');
    errEl.id = errorId;
    Object.assign(errEl.style, { color: '#EF4444', fontSize: '12px', margin: '4px 0 0', display: 'none' });
    Object.assign(inputEl.style, {
      width: '100%', padding: '12px 14px', border: '2px solid #E5E7EB',
      borderRadius: '12px', fontSize: '14px', color: '#1A1A2E',
      outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
      transition: 'border-color 0.2s',
    });
    inputEl.addEventListener('focus', () => inputEl.style.borderColor = '#3D5AFE');
    inputEl.addEventListener('blur',  () => inputEl.style.borderColor = '#E5E7EB');
    wrap.appendChild(lbl);
    wrap.appendChild(inputEl);
    wrap.appendChild(errEl);
    return { wrap, errEl };
  }

  // ── Fields ──
  const nameInput = document.createElement('input');
  nameInput.type = 'text'; nameInput.placeholder = 'e.g. Netflix Subscription';
  if (isEdit) nameInput.value = existing.name;
  const { wrap: nameWrap, errEl: nameErr } = makeField('Payment Name', nameInput, 'apErr-name');

  const amountInput = document.createElement('input');
  amountInput.type = 'number'; amountInput.placeholder = '0.00'; amountInput.min = '0.01'; amountInput.step = '0.01';
  if (isEdit) amountInput.value = existing.originalAmount || existing.amount;
  const { wrap: amountWrap, errEl: amountErr } = makeField('Amount', amountInput, 'apErr-amount');

  // ── Currency selector row ──
  const currencyRow = document.createElement('div');
  Object.assign(currencyRow.style, { display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '16px' });

  const CURRENCIES = [
    { code: 'INR', symbol: '₹', label: '₹ INR' },
    { code: 'USD', symbol: '$', label: '$ USD' },
    { code: 'EUR', symbol: '€', label: '€ EUR' },
    { code: 'GBP', symbol: '£', label: '£ GBP' },
  ];

  const currencySelect = document.createElement('select');
  CURRENCIES.forEach(c => {
    const o = document.createElement('option');
    o.value = c.code; o.textContent = c.label;
    currencySelect.appendChild(o);
  });
  if (isEdit && existing.currency) currencySelect.value = existing.currency;
  Object.assign(currencySelect.style, {
    padding: '12px 10px', border: '2px solid #E5E7EB', borderRadius: '12px',
    fontSize: '13px', color: '#1A1A2E', outline: 'none', fontFamily: 'inherit',
    background: '#fff', cursor: 'pointer', flexShrink: '0',
    transition: 'border-color 0.2s',
  });
  currencySelect.addEventListener('focus', () => currencySelect.style.borderColor = '#3D5AFE');
  currencySelect.addEventListener('blur',  () => currencySelect.style.borderColor = '#E5E7EB');

  // Conversion preview pill
  const convPreview = document.createElement('div');
  Object.assign(convPreview.style, {
    flex: '1', padding: '10px 14px', background: '#EEF1FF', borderRadius: '12px',
    fontSize: '12px', color: '#3D5AFE', fontWeight: '600', display: 'none',
    alignItems: 'center', gap: '6px', minHeight: '46px',
  });
  convPreview.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3D5AFE" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg><span id="convText">≈ ₹—</span>`;

  currencyRow.appendChild(currencySelect);
  currencyRow.appendChild(convPreview);

  // Replace amountWrap label to show currency symbol
  const amtLabel = amountWrap.querySelector('label');
  if (amtLabel) amtLabel.textContent = 'Amount';

  // Live conversion logic
  let _convRate = 1;
  let _convTimer = null;

  async function fetchAndPreview() {
    const cur = currencySelect.value;
    const val = parseFloat(amountInput.value);
    if (cur === 'INR') {
      convPreview.style.display = 'none';
      _convRate = 1;
      return;
    }
    if (!val || val <= 0) { convPreview.style.display = 'none'; return; }
    convPreview.style.display = 'flex';
    document.getElementById('convText').textContent = 'Fetching rate…';
    try {
      const res  = await fetch(`/api/exchange/${cur}`);
      const data = await res.json();
      _convRate = data.conversion_rates?.INR || 1;
      const inr = (val * _convRate).toFixed(2);
      document.getElementById('convText').textContent =
        `≈ ₹${Number(inr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    } catch (_) {
      document.getElementById('convText').textContent = 'Rate unavailable';
    }
  }

  function debouncedPreview() {
    clearTimeout(_convTimer);
    _convTimer = setTimeout(fetchAndPreview, 500);
  }

  amountInput.addEventListener('input', debouncedPreview);
  currencySelect.addEventListener('change', debouncedPreview);

  // If editing a foreign currency payment, show existing conversion
  if (isEdit && existing.currency && existing.currency !== 'INR') {
    _convRate = existing.convertedAmountINR / existing.originalAmount || 1;
    convPreview.style.display = 'flex';
    const sym = CURRENCIES.find(c => c.code === existing.currency)?.symbol || '';
    document.getElementById('convText').textContent =
      `≈ ₹${Number(existing.convertedAmountINR).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  }

  const typeSelect = document.createElement('select');
  [['monthly','Monthly'],['one-time','One-time']].forEach(([v,t]) => {
    const o = document.createElement('option'); o.value = v; o.textContent = t; typeSelect.appendChild(o);
  });
  if (isEdit) typeSelect.value = existing.type;
  const { wrap: typeWrap } = makeField('Payment Type', typeSelect, 'apErr-type');

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  if (isEdit) dateInput.value = existing.date;
  const { wrap: dateWrap, errEl: dateErr } = makeField('Date', dateInput, 'apErr-date');

  [nameWrap, amountWrap, currencyRow, typeWrap, dateWrap].forEach(w => card.appendChild(w));

  // Clear errors on input
  nameInput.addEventListener('input',  () => { nameErr.style.display = 'none'; nameInput.style.borderColor = '#E5E7EB'; });
  amountInput.addEventListener('input',() => { amountErr.style.display = 'none'; amountInput.style.borderColor = '#E5E7EB'; });
  dateInput.addEventListener('change', () => { dateErr.style.display = 'none'; dateInput.style.borderColor = '#E5E7EB'; });

  // ── Buttons ──
  const btnRow = document.createElement('div');
  Object.assign(btnRow.style, { display: 'flex', gap: '12px', marginTop: '8px' });

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  Object.assign(cancelBtn.style, {
    flex: '1', padding: '13px', border: '2px solid #3D5AFE', borderRadius: '50px',
    background: 'transparent', color: '#3D5AFE', fontWeight: '700', fontSize: '14px',
    cursor: 'pointer', fontFamily: 'inherit',
  });

  const submitBtn = document.createElement('button');
  submitBtn.textContent = isEdit ? 'Save Changes' : 'Add Payment';
  Object.assign(submitBtn.style, {
    flex: '1', padding: '13px', border: 'none', borderRadius: '50px',
    background: 'linear-gradient(135deg, #3D5AFE, #6B8EFF)', color: '#FFFFFF',
    fontWeight: '700', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 16px rgba(61,90,254,0.3)',
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(submitBtn);
  card.appendChild(btnRow);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // ── Animate in ──
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';
  });

  // ── Close helper ──
  function closeModal() {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 250);
  }

  // ── Cancel / backdrop ──
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  // ── Submit ──
  submitBtn.addEventListener('click', () => {
    const { valid, errors } = _validateForm({
      name: nameInput.value, amount: amountInput.value, date: dateInput.value,
    });
    if (!valid) {
      if (errors.name)   { nameErr.textContent = errors.name;     nameErr.style.display = 'block';   nameInput.style.borderColor = '#EF4444'; }
      if (errors.amount) { amountErr.textContent = errors.amount; amountErr.style.display = 'block'; amountInput.style.borderColor = '#EF4444'; }
      if (errors.date)   { dateErr.textContent = errors.date;     dateErr.style.display = 'block';   dateInput.style.borderColor = '#EF4444'; }
      return;
    }
    try {
      const payments = getPayments();
      const cur = currencySelect.value;
      const origAmt = parseFloat(amountInput.value);
      const convAmt = cur === 'INR' ? origAmt : parseFloat((origAmt * _convRate).toFixed(2));

      if (isEdit) {
        const idx = payments.findIndex(x => x.id === existing.id);
        if (idx !== -1) {
          payments[idx] = {
            ...payments[idx],
            name: nameInput.value.trim(),
            amount: convAmt,
            originalAmount: origAmt,
            currency: cur,
            convertedAmountINR: convAmt,
            date: _calculateDate(dateInput.value, typeSelect.value),
            type: typeSelect.value,
          };
        }
      } else {
        payments.push({
          id: _generateId(),
          name: nameInput.value.trim(),
          amount: convAmt,
          originalAmount: origAmt,
          currency: cur,
          convertedAmountINR: convAmt,
          date: _calculateDate(dateInput.value, typeSelect.value),
          type: typeSelect.value,
          status: 'active',
        });
      }
      savePayments(payments);
    } catch (e) {
      saveErr.textContent = 'Failed to save. Please try again.';
      saveErr.style.display = 'block';
      return;
    }
    closeModal();
    setTimeout(() => _rerender(), 260);
  });
}
function createEmptyStateCard({ onAddPayment } = {}) {
  if (!onAddPayment) {
    console.warn('createEmptyStateCard: onAddPayment not provided');
    onAddPayment = () => {};
  }

  // Card
  const card = document.createElement('div');
  card.className = 'empty-state-card';
  Object.assign(card.style, {
    background: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    padding: '24px',
    textAlign: 'center',
    opacity: '0',
    transform: 'scale(0.95)',
    transition: 'opacity 0.35s ease-out, transform 0.35s ease-out',
  });

  // Icon container
  const iconWrap = document.createElement('div');
  Object.assign(iconWrap.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    width: '56px',
    height: '56px',
    background: '#EEF1FF',
    borderRadius: '10px',
  });
  iconWrap.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3D5AFE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4M14 15h2"/></svg>`;
  card.appendChild(iconWrap);

  // Title
  const title = document.createElement('h3');
  title.textContent = 'No transactions yet';
  Object.assign(title.style, {
    color: '#1A1A2E',
    fontSize: '16px',
    fontWeight: '700',
    margin: '0 0 8px',
    fontFamily: 'inherit',
  });
  card.appendChild(title);

  // Subtitle
  const subtitle = document.createElement('p');
  subtitle.textContent = 'Start by adding your first payment';
  Object.assign(subtitle.style, {
    color: '#6B7280',
    fontSize: '13px',
    margin: '0 0 20px',
    lineHeight: '1.5',
    fontFamily: 'inherit',
  });
  card.appendChild(subtitle);

  // CTA button
  const btn = document.createElement('button');
  btn.textContent = 'Add Payment';
  Object.assign(btn.style, {
    background: 'linear-gradient(135deg, #3D5AFE, #6B8EFF)',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '14px',
    border: 'none',
    borderRadius: '50px',
    padding: '12px 28px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 4px 16px rgba(61,90,254,0.3)',
  });
  btn.addEventListener('click', () => onAddPayment());
  card.appendChild(btn);

  return card;
}

// ─── Dashboard Helpers ────────────────────────────────────────────────────────
function _getStatus(dateStr) {
  if (!dateStr) return 'unknown';
  const due = new Date(dateStr);
  if (isNaN(due)) return 'unknown';
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.floor((due - today) / 86400000);
  if (diff < 0) return 'completed';
  if (diff <= 2) return 'due-soon';
  return 'upcoming';
}

// Returns days until due (negative = past)
function _daysUntil(dateStr) {
  const due = new Date(dateStr);
  if (isNaN(due)) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.floor((due - today) / 86400000);
}

function _formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Brand Logo Helpers ───────────────────────────────────────────────────────
const DOMAIN_MAP = {
  'netflix': 'netflix.com', 'youtube': 'youtube.com', 'spotify': 'spotify.com',
  'amazon prime': 'amazon.com', 'amazon': 'amazon.com', 'prime video': 'primevideo.com',
  'hotstar': 'hotstar.com', 'disney': 'disneyplus.com', 'disney+': 'disneyplus.com',
  'apple music': 'apple.com', 'apple tv': 'apple.com', 'icloud': 'apple.com',
  'google one': 'google.com', 'google': 'google.com', 'youtube premium': 'youtube.com',
  'microsoft': 'microsoft.com', 'xbox': 'xbox.com', 'office': 'microsoft.com',
  'adobe': 'adobe.com', 'figma': 'figma.com', 'notion': 'notion.so',
  'slack': 'slack.com', 'zoom': 'zoom.us', 'dropbox': 'dropbox.com',
  'github': 'github.com', 'gitlab': 'gitlab.com', 'jira': 'atlassian.com',
  'linkedin': 'linkedin.com', 'twitter': 'twitter.com', 'x': 'x.com',
  'instagram': 'instagram.com', 'facebook': 'facebook.com',
  'swiggy': 'swiggy.com', 'zomato': 'zomato.com', 'uber': 'uber.com',
  'ola': 'olacabs.com', 'phonepe': 'phonepe.com', 'paytm': 'paytm.com',
  'gpay': 'pay.google.com', 'razorpay': 'razorpay.com',
  'jio': 'jio.com', 'airtel': 'airtel.in', 'bsnl': 'bsnl.in',
  'zee5': 'zee5.com', 'sonyliv': 'sonyliv.com', 'mxplayer': 'mxplayer.in',
};

function getDomain(serviceName) {
  const key = (serviceName || '').toLowerCase().trim();
  if (DOMAIN_MAP[key]) return DOMAIN_MAP[key];
  // fuzzy: check if any map key is contained in the name
  for (const [k, v] of Object.entries(DOMAIN_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  // fallback: guess domain from name
  return key.replace(/\s+/g, '') + '.com';
}

function _serviceLogo(name, size = 32) {
  const domain  = getDomain(name);
  const initial = (name || '?')[0].toUpperCase();

  const wrap = document.createElement('div');
  Object.assign(wrap.style, {
    width: `${size}px`, height: `${size}px`, borderRadius: '8px',
    background: '#fff', border: '1px solid #E5E7EB',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: '0', overflow: 'hidden',
  });

  const img = document.createElement('img');
  img.src     = `https://logo.clearbit.com/${domain}`;
  img.alt     = name;
  img.loading = 'lazy';
  img.width   = size;
  img.height  = size;
  Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'contain', display: 'block' });

  // fallback: replace with initial letter on error
  img.onerror = () => {
    wrap.removeChild(img);
    wrap.style.background = '#EEF1FF';
    wrap.style.border = 'none';
    const letter = document.createElement('span');
    letter.textContent = initial;
    Object.assign(letter.style, { color: '#3D5AFE', fontSize: `${Math.round(size * 0.4)}px`, fontWeight: '700', fontFamily: 'Inter, sans-serif' });
    wrap.appendChild(letter);
  };

  wrap.appendChild(img);
  return wrap;
}

// ─── Icon helpers ─────────────────────────────────────────────────────────────
function _iconBtn(svgInner, color, bg) {
  const btn = document.createElement('button');
  Object.assign(btn.style, {
    width: '30px', height: '30px', borderRadius: '8px', border: 'none',
    background: bg, cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: '0', transition: 'opacity 0.15s',
  });
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${svgInner}</svg>`;
  btn.addEventListener('mouseenter', () => btn.style.opacity = '0.75');
  btn.addEventListener('mouseleave', () => btn.style.opacity = '1');
  return btn;
}

function _rerender() {
  const payments = getPayments();
  renderHomeContent(payments, document.getElementById('dashLeft'));
  _checkBufferAlert(payments);
  _updateStats(payments);
  _renderRecentActivity();
}

function renderHomeContent(transactions, container) {
  if (!container) return;
  const txns = transactions ?? [];
  container.innerHTML = '';

  if (txns.length === 0) {
    const card = createEmptyStateCard({ onAddPayment: () => openAddPaymentModal() });
    container.appendChild(card);
    requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = 'scale(1)'; });
    return;
  }

  // ── Analytics Card ──
  const monthly = txns.filter(p => p.type === 'monthly');
  const activeCount = monthly.filter(p => p.status !== 'paused').length;
  const monthlyTotal = monthly.filter(p => p.status !== 'paused').reduce((s, p) => s + Number(p.amount), 0);

  const analytics = document.createElement('div');
  Object.assign(analytics.style, {
    background: '#FFFFFF', borderRadius: '12px', padding: '16px 20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', gap: '12px',
    transition: 'box-shadow 0.2s, transform 0.2s',
  });
  analytics.addEventListener('mouseenter', () => { analytics.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; analytics.style.transform = 'translateY(-1px)'; });
  analytics.addEventListener('mouseleave', () => { analytics.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; analytics.style.transform = 'translateY(0)'; });

  function statCell(label, value) {
    const cell = document.createElement('div');
    Object.assign(cell.style, { flex: '1', textAlign: 'center' });
    const v = document.createElement('p');
    v.textContent = value;
    Object.assign(v.style, { color: '#3D5AFE', fontSize: '18px', fontWeight: '700', margin: '0 0 2px' });
    const l = document.createElement('p');
    l.textContent = label;
    Object.assign(l.style, { color: '#6B7280', fontSize: '11px', margin: '0' });
    cell.appendChild(v); cell.appendChild(l);
    return cell;
  }

  const divider = document.createElement('div');
  Object.assign(divider.style, { width: '1px', background: '#E5E7EB', margin: '4px 0' });

  analytics.appendChild(statCell('Monthly Spend', `₹${monthlyTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`));
  analytics.appendChild(divider);
  analytics.appendChild(statCell('Active Subscriptions', activeCount));
  container.appendChild(analytics);

  // ── Transactions List ──
  const list = document.createElement('div');
  Object.assign(list.style, {
    background: '#FFFFFF', borderRadius: '12px', padding: '16px 20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    transition: 'box-shadow 0.2s',
  });

  const listHeader = document.createElement('div');
  Object.assign(listHeader.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' });
  const listTitle = document.createElement('h3');
  listTitle.textContent = 'Transactions';
  Object.assign(listTitle.style, { color: '#1A1A2E', fontSize: '15px', fontWeight: '700', margin: '0' });
  const addBtn = document.createElement('button');
  addBtn.textContent = '+ Add';
  Object.assign(addBtn.style, {
    background: 'linear-gradient(135deg,#3D5AFE,#6B8EFF)', color: '#FFFFFF',
    border: 'none', borderRadius: '50px', padding: '6px 14px',
    fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
    transition: 'opacity 0.15s',
  });
  addBtn.addEventListener('mouseenter', () => addBtn.style.opacity = '0.85');
  addBtn.addEventListener('mouseleave', () => addBtn.style.opacity = '1');
  addBtn.addEventListener('click', () => openAddPaymentModal());
  listHeader.appendChild(listTitle);
  listHeader.appendChild(addBtn);
  list.appendChild(listHeader);

  // status colors: red=due-soon, yellow=upcoming, green=completed
  const statusColors  = { completed: '#10B981', 'due-soon': '#EF4444', upcoming: '#F59E0B' };
  const statusLabels  = { completed: 'Completed', 'due-soon': 'Due Soon', upcoming: 'Upcoming' };

  txns.forEach((p, i) => {
    const status = _getStatus(p.date);

    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0',
      borderBottom: i < txns.length - 1 ? '1px solid #F3F4F6' : 'none',
      gap: '8px', transition: 'background 0.15s', borderRadius: '8px', margin: '0 -8px', padding: '12px 8px',
    });
    row.addEventListener('mouseenter', () => row.style.background = '#F9FAFB');
    row.addEventListener('mouseleave', () => row.style.background = 'transparent');

    // Left: logo + info
    const left = document.createElement('div');
    Object.assign(left.style, { display: 'flex', alignItems: 'center', gap: '12px', flex: '1', minWidth: '0' });

    const info = document.createElement('div');
    info.style.minWidth = '0';
    const name = document.createElement('p');
    name.textContent = p.name;
    Object.assign(name.style, { color: '#1A1A2E', fontSize: '14px', fontWeight: '600', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
    const meta = document.createElement('p');
    meta.textContent = `${p.type === 'monthly' ? 'Monthly' : 'One-time'} · ${_formatDate(p.date)}`;
    Object.assign(meta.style, { color: '#6B7280', fontSize: '12px', margin: '0' });
    info.appendChild(name); info.appendChild(meta);
    left.appendChild(_serviceLogo(p.name, 36)); left.appendChild(info);

    // Right: amount + badge + actions
    const right = document.createElement('div');
    Object.assign(right.style, { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: '0' });

    const amtBadge = document.createElement('div');
    Object.assign(amtBadge.style, { textAlign: 'right' });
    const amount = document.createElement('p');
    // Show original currency if not INR: e.g. "$15 / ₹1,250"
    const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
    const inrFormatted = `₹${Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (p.currency && p.currency !== 'INR' && p.originalAmount) {
      const sym = CURRENCY_SYMBOLS[p.currency] || p.currency;
      amount.textContent = `${sym}${Number(p.originalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} / ${inrFormatted}`;
      amount.style.fontSize = '12px';
    } else {
      amount.textContent = inrFormatted;
    }
    Object.assign(amount.style, { color: '#1A1A2E', fontWeight: '700', margin: '0 0 2px' });
    const badge = document.createElement('span');
    badge.textContent = statusLabels[status] || 'Unknown';
    Object.assign(badge.style, {
      fontSize: '11px', fontWeight: '600', color: statusColors[status] || '#9CA3AF',
      background: (statusColors[status] || '#9CA3AF') + '18',
      padding: '2px 8px', borderRadius: '50px', display: 'block',
    });
    amtBadge.appendChild(amount); amtBadge.appendChild(badge);

    // Edit button
    const editBtn = _iconBtn(
      '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
      '#3D5AFE', '#EEF1FF'
    );
    editBtn.title = 'Edit';
    editBtn.addEventListener('click', () => openAddPaymentModal(p));

    // Mark as Paid button (checkmark) — only shown when not already completed
    const paidBtn = _iconBtn(
      '<polyline points="20 6 9 17 4 12"/>',
      '#10B981', '#ECFDF5'
    );
    paidBtn.title = 'Mark as Paid';
    // Dim if already completed (one-time past date) — still clickable for monthly to advance
    if (status === 'completed' && p.type !== 'monthly') {
      paidBtn.style.opacity = '0.35';
      paidBtn.style.cursor = 'not-allowed';
      paidBtn.style.pointerEvents = 'none';
    }
    paidBtn.addEventListener('click', () => {
      const payments = getPayments();
      const idx = payments.findIndex(x => x.id === p.id);
      if (idx === -1) return;

      if (payments[idx].type === 'monthly') {
        // Advance to next month's due date
        payments[idx].date = _calculateDate(payments[idx].date, 'monthly');
      } else {
        // One-time: set date to today so status becomes completed
        const today = new Date();
        payments[idx].date = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      }
      savePayments(payments);

      // Brief flash animation on the row before re-render
      row.style.transition = 'opacity 0.15s';
      row.style.opacity = '0.4';
      setTimeout(() => { row.style.opacity = '1'; _rerender(); }, 200);
    });

    // Delete button
    const delBtn = _iconBtn(
      '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
      '#EF4444', '#FEF2F2'
    );
    delBtn.title = 'Delete';
    delBtn.addEventListener('click', () => {
      row.style.transition = 'opacity 0.2s, transform 0.2s';
      row.style.opacity = '0';
      row.style.transform = 'translateX(16px)';
      setTimeout(() => {
        const updated = getPayments().filter(x => x.id !== p.id);
        savePayments(updated);
        _rerender();
      }, 200);
    });

    right.appendChild(amtBadge);
    right.appendChild(paidBtn);
    right.appendChild(editBtn);
    right.appendChild(delBtn);
    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  });

  container.appendChild(list);

  // ── AutoPay Section (monthly only) ──
  if (monthly.length > 0) {
    const apSection = document.createElement('div');
    Object.assign(apSection.style, {
      background: '#FFFFFF', borderRadius: '12px', padding: '16px 20px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    });

    const apTitle = document.createElement('h3');
    apTitle.textContent = 'AutoPay';
    Object.assign(apTitle.style, { color: '#1A1A2E', fontSize: '15px', fontWeight: '700', margin: '0 0 12px' });
    apSection.appendChild(apTitle);

    monthly.forEach((p, i) => {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 0', gap: '8px',
        borderBottom: i < monthly.length - 1 ? '1px solid #F3F4F6' : 'none',
      });

      const left = document.createElement('div');
      Object.assign(left.style, { display: 'flex', alignItems: 'center', gap: '12px', flex: '1', minWidth: '0' });
      const logoEl = _serviceLogo(p.name, 34);
      const textWrap = document.createElement('div');
      const pName = document.createElement('p');
      pName.textContent = p.name;
      Object.assign(pName.style, { color: '#1A1A2E', fontSize: '14px', fontWeight: '600', margin: '0 0 2px' });
      const pDue = document.createElement('p');
      pDue.textContent = `Next due: ${_formatDate(p.date)}`;
      Object.assign(pDue.style, { color: '#6B7280', fontSize: '12px', margin: '0' });
      textWrap.appendChild(pName); textWrap.appendChild(pDue);
      left.appendChild(logoEl); left.appendChild(textWrap);

      const right = document.createElement('div');
      Object.assign(right.style, { display: 'flex', alignItems: 'center', gap: '10px', flexShrink: '0' });

      const amt = document.createElement('p');
      amt.textContent = `₹${Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      Object.assign(amt.style, { color: '#1A1A2E', fontSize: '14px', fontWeight: '700', margin: '0' });

      // Toggle
      const toggle = document.createElement('div');
      const isActive = p.status !== 'paused';
      Object.assign(toggle.style, {
        width: '40px', height: '22px', borderRadius: '50px', cursor: 'pointer',
        background: isActive ? '#3D5AFE' : '#E5E7EB',
        position: 'relative', transition: 'background 0.2s ease', flexShrink: '0',
      });
      const knob = document.createElement('div');
      Object.assign(knob.style, {
        width: '16px', height: '16px', borderRadius: '50%', background: '#FFFFFF',
        position: 'absolute', top: '3px',
        left: isActive ? '21px' : '3px', transition: 'left 0.2s ease',
      });
      toggle.appendChild(knob);
      toggle.addEventListener('click', () => {
        const payments = getPayments();
        const idx = payments.findIndex(x => x.id === p.id);
        if (idx === -1) return;
        payments[idx].status = payments[idx].status === 'paused' ? 'active' : 'paused';
        savePayments(payments);
        const nowActive = payments[idx].status !== 'paused';
        toggle.style.background = nowActive ? '#3D5AFE' : '#E5E7EB';
        knob.style.left = nowActive ? '21px' : '3px';
      });

      right.appendChild(amt);
      right.appendChild(toggle);
      row.appendChild(left);
      row.appendChild(right);
      apSection.appendChild(row);
    });

    container.appendChild(apSection);
  }
}

// ─── Data Layer ───────────────────────────────────────────────────────────────
function getPayments() {
  try {
    return JSON.parse(localStorage.getItem('autopay_payments') || '[]');
  } catch (_) { return []; }
}

function savePayments(arr) {
  localStorage.setItem('autopay_payments', JSON.stringify(arr));
}

function getBalance() {
  return parseFloat(localStorage.getItem('autopay_balance') || '0');
}

function saveBalance(amount) {
  localStorage.setItem('autopay_balance', String(amount));
}

function getSentTotal() {
  return parseFloat(localStorage.getItem('autopay_sent') || '0');
}

function saveSentTotal(amount) {
  localStorage.setItem('autopay_sent', String(amount));
}

function saveBalanceFromInput() {
  const input = document.getElementById('balanceInput');
  const val = parseFloat(input.value);
  if (isNaN(val) || val < 0) return;
  saveBalance(val);
  _updateBalanceDisplay();
  _checkBufferAlert(getPayments());
  input.value = '';
  // brief confirmation flash
  input.placeholder = '✓ Saved';
  setTimeout(() => { input.placeholder = 'e.g. 5000'; }, 1500);
}

// ─── Top-Up Modal ─────────────────────────────────────────────────────────────
function openTopUpModal() {
  const overlay = document.getElementById('topUpOverlay');
  const modal   = document.getElementById('topUpModal');
  const balEl   = document.getElementById('topUpCurrentBal');
  if (balEl) balEl.textContent = `₹${getBalance().toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById('topUpInput').value = '';
  document.getElementById('topUpError').style.display = 'none';
  document.querySelectorAll('.quick-amt-btn').forEach(b => b.classList.remove('selected'));
  overlay.style.display = 'flex';
  modal.style.display = 'block';
  requestAnimationFrame(() => {
    modal.style.opacity = '1';
    modal.style.transform = 'translate(-50%,-50%) scale(1)';
  });
  setTimeout(() => document.getElementById('topUpInput').focus(), 200);
}

function closeTopUpModal() {
  const modal   = document.getElementById('topUpModal');
  const overlay = document.getElementById('topUpOverlay');
  modal.style.opacity = '0';
  modal.style.transform = 'translate(-50%,-48%) scale(0.95)';
  setTimeout(() => {
    modal.style.display = 'none';
    overlay.style.display = 'none';
  }, 220);
}

function setTopUpAmount(amount) {
  document.getElementById('topUpInput').value = amount;
  document.getElementById('topUpError').style.display = 'none';
  document.getElementById('topUpInputWrap').style.borderColor = '#3D5AFE';
  document.querySelectorAll('.quick-amt-btn').forEach(b => {
    b.classList.toggle('selected', parseInt(b.textContent.replace(/[^0-9]/g, '')) === amount);
  });
}

function submitTopUp() {
  const input = document.getElementById('topUpInput');
  const errEl = document.getElementById('topUpError');
  const val   = parseFloat(input.value);

  if (isNaN(val) || val <= 0) {
    errEl.textContent = 'Please enter a valid amount greater than ₹0';
    errEl.style.display = 'block';
    document.getElementById('topUpInputWrap').style.borderColor = '#EF4444';
    return;
  }

  const newBalance = parseFloat((getBalance() + val).toFixed(2));
  saveBalance(newBalance);
  _updateBalanceDisplay();
  _checkBufferAlert(getPayments());

  // Update the modal's current balance display
  const balEl = document.getElementById('topUpCurrentBal');
  if (balEl) balEl.textContent = `₹${newBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  closeTopUpModal();
  _showTopUpSuccessToast(val);
}

function _showTopUpSuccessToast(amount, customMsg) {
  const id = 'ap-topup-toast';
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = id;
  Object.assign(toast.style, {
    position: 'fixed', bottom: '28px', left: '50%',
    transform: 'translateX(-50%) translateY(80px)',
    zIndex: '3000', background: '#1A1A2E', borderRadius: '14px',
    padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
    transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
    fontFamily: 'Inter, Segoe UI, sans-serif',
    borderLeft: '4px solid #10B981',
    minWidth: '260px',
  });

  const iconWrap = document.createElement('div');
  Object.assign(iconWrap.style, {
    width: '32px', height: '32px', borderRadius: '50%',
    background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0',
  });
  iconWrap.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  const text = document.createElement('div');
  const title = document.createElement('p');
  title.textContent = customMsg ? 'Success' : 'Funds Added';
  Object.assign(title.style, { color: '#fff', fontSize: '14px', fontWeight: '700', margin: '0 0 2px' });
  const sub = document.createElement('p');
  sub.textContent = customMsg || `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} added to your balance`;
  Object.assign(sub.style, { color: 'rgba(255,255,255,0.65)', fontSize: '12px', margin: '0' });
  text.appendChild(title); text.appendChild(sub);

  toast.appendChild(iconWrap); toast.appendChild(text);
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(16px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function _updateBalanceDisplay() {
  const el = document.getElementById('balanceDisplay');
  if (el) el.textContent = `₹${getBalance().toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function _updateSentDisplay() {
  const el = document.getElementById('sentDisplay');
  if (el) el.textContent = `₹${getSentTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// ─── Payment Helpers ──────────────────────────────────────────────────────────
function _generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function _calculateDate(dateStr, type) {
  if (type !== 'monthly') return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  let nextMonth = m; // 1-based
  let nextYear = y;
  if (nextMonth === 12) { nextMonth = 1; nextYear++; } else { nextMonth++; }
  const daysInNext = new Date(nextYear, nextMonth, 0).getDate();
  const clampedDay = Math.min(d, daysInNext);
  return `${nextYear}-${String(nextMonth).padStart(2,'0')}-${String(clampedDay).padStart(2,'0')}`;
}

function _validateForm({ name, amount, date }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Payment name is required';
  if (!amount) errors.amount = 'Amount is required';
  else if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) errors.amount = 'Amount must be greater than 0';
  if (!date) errors.date = 'Date is required';
  return { valid: Object.keys(errors).length === 0, errors };
}

// ─── Auto-Deduction Logic ─────────────────────────────────────────────────────
// Runs on every dashboard load. For each active payment whose due date has
// arrived or passed:
//   • If balance is sufficient  → deduct, add to Sent, advance monthly date
//   • If balance is insufficient → show "Payment Failed" toast, leave date as-is
// Uses localStorage key 'autopay_deducted_<id>_<date>' to prevent double-deduction
// within the same cycle.
function _advanceOverdueMonthly() {
  const payments = getPayments();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let paymentsChanged = false;
  const failedPayments = [];

  payments.forEach(p => {
    if (p.status === 'paused') return;

    const due = new Date(p.date);
    if (isNaN(due) || due > today) return; // not due yet

    // Dedup key — one deduction per payment per due-date cycle
    const dedupKey = `autopay_deducted_${p.id}_${p.date}`;
    if (sessionStorage.getItem(dedupKey)) {
      // Already processed this cycle — just advance date if monthly
      if (p.type === 'monthly') {
        p.date = _calculateDate(p.date, 'monthly');
        paymentsChanged = true;
      }
      return;
    }

    const balance = getBalance();
    const amount  = Number(p.amount);

    if (balance < amount) {
      // ── Insufficient funds ──
      failedPayments.push(p);
      addHistoryEntry({ name: p.name, amount: p.amount, date: new Date().toISOString().slice(0,10), status: 'failed' });
      triggerPaymentEmail('failed', p);
      // Leave date unchanged so it stays overdue / visible
    } else {
      // ── Deduct ──
      saveBalance(parseFloat((balance - amount).toFixed(2)));
      saveSentTotal(parseFloat((getSentTotal() + amount).toFixed(2)));
      sessionStorage.setItem(dedupKey, '1');
      addHistoryEntry({ name: p.name, amount: p.amount, date: new Date().toISOString().slice(0,10), status: 'success' });
      triggerPaymentEmail('success', p);

      if (p.type === 'monthly') {
        p.date = _calculateDate(p.date, 'monthly');
      }
      // one-time payments: leave date in past so status shows "Completed"
      paymentsChanged = true;
    }
  });

  if (paymentsChanged) savePayments(payments);

  // Show failed-payment toasts (one per failed payment)
  failedPayments.forEach(p => _showFailedPaymentToast(p));

  return getPayments(); // return fresh copy after save
}

// ─── Email Notifications ──────────────────────────────────────────────────────
async function triggerPaymentEmail(type, sub) {
  try {
    const res  = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        name:   sub.name,
        amount: Number(sub.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        date:   new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      }),
    });
    const data = await res.json();
    if (data.ok) {
      const isSuccess = type === 'success';
      _showEmailSentToast(sub.name, isSuccess);
    } else {
      console.warn('[email] API error:', data.error);
    }
  } catch (e) {
    console.warn('[email] failed to send:', e.message);
  }
}

function _showEmailSentToast(serviceName, isSuccess) {
  const id = `ap-email-toast-${Date.now()}`;
  const toast = document.createElement('div');
  toast.id = id;
  Object.assign(toast.style, {
    position: 'fixed', bottom: '28px', right: '24px',
    transform: 'translateY(80px)',
    zIndex: '3000', background: '#1A1A2E', borderRadius: '12px',
    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
    boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
    transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s',
    fontFamily: 'Inter, Segoe UI, sans-serif',
    borderLeft: `4px solid ${isSuccess ? '#10B981' : '#F59E0B'}`,
    maxWidth: '300px',
  });
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${isSuccess ? '#10B981' : '#F59E0B'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
    <div>
      <p style="color:#fff;font-size:13px;font-weight:700;margin:0 0 1px">Email Sent</p>
      <p style="color:rgba(255,255,255,0.6);font-size:11px;margin:0">${serviceName} · ${isSuccess ? 'Payment confirmed' : 'Failure alert'}</p>
    </div>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.transform = 'translateY(0)'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function _showEmailErrorToast(msg) {
  const id = 'ap-email-err-toast';
  document.getElementById(id)?.remove();
  const toast = document.createElement('div');
  toast.id = id;
  Object.assign(toast.style, {
    position: 'fixed', bottom: '28px', left: '50%',
    transform: 'translateX(-50%) translateY(80px)',
    zIndex: '3000', background: '#1A1A2E', borderRadius: '14px',
    padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)', transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
    fontFamily: 'Inter, Segoe UI, sans-serif', borderLeft: '4px solid #EF4444', minWidth: '260px', maxWidth: '360px',
  });
  toast.innerHTML = `
    <div style="width:32px;height:32px;border-radius:50%;background:#EF4444;display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </div>
    <div>
      <p style="color:#fff;font-size:14px;font-weight:700;margin:0 0 2px">Email Failed</p>
      <p style="color:rgba(255,255,255,0.65);font-size:12px;margin:0;word-break:break-word">${msg}</p>
    </div>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.transform = 'translateX(-50%) translateY(0)'; });
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(16px)';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

function _showFailedPaymentToast(payment) {
  const toastId = `ap-fail-${payment.id}`;
  if (document.getElementById(toastId)) return; // already showing

  const toast = document.createElement('div');
  toast.id = toastId;
  Object.assign(toast.style, {
    position: 'fixed', bottom: '24px', left: '50%',
    transform: 'translateX(-50%) translateY(80px)',
    zIndex: '3000', background: '#1A1A2E', borderRadius: '12px',
    padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px',
    maxWidth: '360px', width: 'calc(100% - 32px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
    fontFamily: 'Inter, Segoe UI, sans-serif',
    borderLeft: '4px solid #EF4444',
  });

  const iconWrap = document.createElement('div');
  Object.assign(iconWrap.style, {
    width: '32px', height: '32px', borderRadius: '8px', background: '#FEE2E2',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0',
  });
  iconWrap.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  const body = document.createElement('div');
  body.style.flex = '1';
  const h = document.createElement('p');
  h.textContent = 'Payment Failed: Insufficient Funds';
  Object.assign(h.style, { color: '#FFFFFF', fontSize: '13px', fontWeight: '700', margin: '0 0 2px' });
  const sub = document.createElement('p');
  sub.textContent = `${payment.name} · ₹${Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  Object.assign(sub.style, { color: '#9CA3AF', fontSize: '12px', margin: '0' });
  body.appendChild(h); body.appendChild(sub);

  toast.appendChild(iconWrap);
  toast.appendChild(body);
  document.body.appendChild(toast);

  requestAnimationFrame(() => { toast.style.transform = 'translateX(-50%) translateY(0)'; });

  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(80px)';
    setTimeout(() => toast.remove(), 350);
  }, 5000);
}

function _showDueReminders(payments) {
  if (sessionStorage.getItem('reminders_shown')) return;
  const dueSoon = payments.filter(p => p.type === 'monthly' && p.status !== 'paused' && _getStatus(p.date) === 'due-soon');
  if (dueSoon.length === 0) return;

  sessionStorage.setItem('reminders_shown', '1');

  // Build per-payment message: "Netflix due today", "Spotify due in 1 day", etc.
  const messages = dueSoon.map(p => {
    const d = _daysUntil(p.date);
    const when = d === 0 ? 'today' : d === 1 ? 'in 1 day' : `in ${d} days`;
    return `${p.name} due ${when}`;
  });

  const banner = document.createElement('div');
  banner.id = 'ap-reminder-banner';
  Object.assign(banner.style, {
    position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%) translateY(-120px)',
    zIndex: '2000', background: '#FFFFFF', borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(61,90,254,0.2)', padding: '14px 18px',
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    maxWidth: '360px', width: 'calc(100% - 32px)',
    transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
    fontFamily: 'Inter, Segoe UI, sans-serif',
    borderLeft: '4px solid #EF4444',
  });

  const icon = document.createElement('div');
  Object.assign(icon.style, {
    width: '36px', height: '36px', borderRadius: '10px', flexShrink: '0',
    background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center',
  });
  icon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;

  const text = document.createElement('div');
  text.style.flex = '1';
  const heading = document.createElement('p');
  heading.textContent = dueSoon.length === 1 ? 'Payment Due Soon' : `${dueSoon.length} Payments Due Soon`;
  Object.assign(heading.style, { color: '#1A1A2E', fontSize: '13px', fontWeight: '700', margin: '0 0 4px' });
  text.appendChild(heading);

  messages.forEach(msg => {
    const line = document.createElement('p');
    line.textContent = msg;
    Object.assign(line.style, { color: '#6B7280', fontSize: '12px', margin: '0 0 2px', lineHeight: '1.4' });
    text.appendChild(line);
  });

  const close = document.createElement('button');
  close.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  Object.assign(close.style, { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: '0' });
  close.addEventListener('click', dismissBanner);

  banner.appendChild(icon);
  banner.appendChild(text);
  banner.appendChild(close);
  document.body.appendChild(banner);

  requestAnimationFrame(() => { banner.style.transform = 'translateX(-50%) translateY(0)'; });

  function dismissBanner() {
    banner.style.transform = 'translateX(-50%) translateY(-120px)';
    setTimeout(() => banner.remove(), 350);
  }

  setTimeout(dismissBanner, 6000);
}

// ─── Buffer Alert ─────────────────────────────────────────────────────────────
// Sums all active payments due within the next 7 days and warns if balance is short.
function _checkBufferAlert(payments) {
  const BANNER_ID = 'ap-buffer-banner';
  // Remove any existing banner first so it re-evaluates cleanly
  document.getElementById(BANNER_ID)?.remove();

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in7 = new Date(today); in7.setDate(today.getDate() + 7);

  const upcoming7 = payments.filter(p => {
    if (p.status === 'paused') return false;
    const due = new Date(p.date);
    if (isNaN(due)) return false;
    return due >= today && due <= in7;
  });

  if (upcoming7.length === 0) return;

  const totalDue = upcoming7.reduce((s, p) => s + Number(p.amount), 0);
  const balance  = getBalance();

  if (balance >= totalDue) return; // all good

  const shortfall = totalDue - balance;

  const banner = document.createElement('div');
  banner.id = BANNER_ID;
  Object.assign(banner.style, {
    background: '#FEF2F2', borderRadius: '12px', padding: '14px 16px',
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    boxShadow: '0 2px 12px rgba(239,68,68,0.15)',
    borderLeft: '4px solid #EF4444',
    fontFamily: 'Inter, Segoe UI, sans-serif',
    animation: 'fadeInDown 0.35s ease-out both',
  });

  // Inject keyframe once
  if (!document.getElementById('ap-buffer-style')) {
    const s = document.createElement('style');
    s.id = 'ap-buffer-style';
    s.textContent = `@keyframes fadeInDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`;
    document.head.appendChild(s);
  }

  const iconWrap = document.createElement('div');
  Object.assign(iconWrap.style, {
    width: '32px', height: '32px', borderRadius: '8px', background: '#FEE2E2',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0',
  });
  iconWrap.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

  const body = document.createElement('div');
  body.style.flex = '1';

  const heading = document.createElement('p');
  heading.textContent = 'Low balance for upcoming payments';
  Object.assign(heading.style, { color: '#991B1B', fontSize: '13px', fontWeight: '700', margin: '0 0 3px' });

  const detail = document.createElement('p');
  detail.textContent = `₹${totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} due in 7 days · ₹${shortfall.toLocaleString('en-IN', { minimumFractionDigits: 2 })} short`;
  Object.assign(detail.style, { color: '#B91C1C', fontSize: '12px', margin: '0' });

  body.appendChild(heading);
  body.appendChild(detail);

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  Object.assign(closeBtn.style, { background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: '0' });
  closeBtn.addEventListener('click', () => banner.remove());

  banner.appendChild(iconWrap);
  banner.appendChild(body);
  banner.appendChild(closeBtn);

  // Insert at top of homeContentArea
  const container = document.getElementById('homeContentArea');
  if (container) container.insertBefore(banner, container.firstChild);
}

function showHome(m) {
  document.getElementById('welcomeMsg').textContent = `+91 ${m}`;
  document.getElementById('settingsMobile').textContent = `+91 ${m}`;
  showScreen('homeScreen');
  _updateBalanceDisplay();
  _updateSentDisplay();
  const payments = _advanceOverdueMonthly();
  _updateBalanceDisplay();
  _updateSentDisplay();
  _updateStats(payments);
  _showDueReminders(payments);
  renderHomeContent(payments, document.getElementById('dashLeft'));
  _checkBufferAlert(payments);
  _renderRecentActivity();
  _maybeSendWelcomeEmail(m);
}

// ─── Welcome Email (one-time) ─────────────────────────────────────────────────
async function _maybeSendWelcomeEmail(mobile) {
  const FLAG = 'autopay_welcome_sent';
  if (localStorage.getItem(FLAG)) return; // already sent
  localStorage.setItem(FLAG, '1');         // set immediately to prevent double-fire

  try {
    const balance = getBalance().toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const res  = await fetch('/api/welcome-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balance, mobile }),
    });
    const data = await res.json();
    if (data.ok) {
      _showWelcomeToast();
      console.log('[welcome-email] sent, id:', data.id);
    } else {
      console.warn('[welcome-email] API error:', data.error);
    }
  } catch (e) {
    console.warn('[welcome-email] failed:', e.message);
  }
}

function _showWelcomeToast() {
  const toast = document.createElement('div');
  toast.id = 'ap-welcome-toast';
  Object.assign(toast.style, {
    position: 'fixed', bottom: '28px', right: '24px',
    transform: 'translateY(80px)', opacity: '0',
    zIndex: '3000', background: '#1A1A2E', borderRadius: '12px',
    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
    boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
    transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s',
    fontFamily: 'Inter, Segoe UI, sans-serif',
    borderLeft: '4px solid #3D5AFE', maxWidth: '300px',
  });
  toast.innerHTML = `
    <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#3D5AFE,#6B8EFF);display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
    </div>
    <div>
      <p style="color:#fff;font-size:13px;font-weight:700;margin:0 0 1px">Welcome email sent!</p>
      <p style="color:rgba(255,255,255,0.6);font-size:11px;margin:0">Check your inbox for a getting started guide</p>
    </div>`;
  document.body.appendChild(toast);
  // slight delay so it appears after the dashboard loads
  setTimeout(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  }, 1200);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => toast.remove(), 300);
  }, 6000);
}

function toggleSettings() {
  const p = document.getElementById('settingsPanel');
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

function logout() {
  localStorage.removeItem('autopay_auth');
  mobile = '';
  document.getElementById('mobileInput').value = '';
  setMobileError('');
  setSendBtn(false);
  showScreen('loginScreen');
}

function goBack() {
  clearInterval(timerInterval);
  showScreen('loginScreen');
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function apiFetch(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return await res.json();
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'timeout' : e.message);
  } finally {
    clearTimeout(t);
  }
}

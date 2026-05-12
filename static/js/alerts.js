// ============================================
// NivAI — alerts.js
// UI alert bell — polls /api/alerts/count
// Shows badge + dropdown for department dashboard
// ============================================

let alertInterval = null;

export function initAlerts() {
  // Only run on dashboard page
  const bell = document.getElementById('alert-bell');
  if (!bell) return;

  pollAlerts();
  alertInterval = setInterval(pollAlerts, 15000); // poll every 15s

  bell.addEventListener('click', toggleAlertDropdown);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#alert-bell-wrapper')) closeAlertDropdown();
  });
}

async function pollAlerts() {
  try {
    const r = await fetch('/api/alerts/count');
    const d = await r.json();
    if (d.success) updateBadge(d.data.count);
  } catch {}
}

function updateBadge(count) {
  const badge = document.getElementById('alert-badge');
  const bell  = document.getElementById('alert-bell');
  if (!badge || !bell) return;

  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'flex';
    bell.classList.add('has-alerts');
  } else {
    badge.style.display = 'none';
    bell.classList.remove('has-alerts');
  }
}

async function toggleAlertDropdown() {
  const dropdown = document.getElementById('alert-dropdown');
  if (!dropdown) return;

  if (dropdown.classList.contains('open')) {
    closeAlertDropdown();
    return;
  }

  dropdown.classList.add('open');
  dropdown.innerHTML = '<div style="padding:16px;text-align:center;color:#6b7280">Loading...</div>';

  try {
    const r = await fetch('/api/alerts?unread=false');
    const d = await r.json();
    if (d.success) renderAlerts(d.data);
    // Mark all as read
    await fetch('/api/alerts/read', { method: 'POST' });
    updateBadge(0);
  } catch {
    dropdown.innerHTML = '<div style="padding:16px;color:#c81e1e">Failed to load alerts</div>';
  }
}

function closeAlertDropdown() {
  document.getElementById('alert-dropdown')?.classList.remove('open');
}

function renderAlerts(alerts) {
  const dropdown = document.getElementById('alert-dropdown');
  if (!dropdown) return;

  if (!alerts || !alerts.length) {
    dropdown.innerHTML = '<div style="padding:20px;text-align:center;color:#6b7280;font-size:.875rem">No alerts yet</div>';
    return;
  }

  const urgencyColor = { HIGH: '#c81e1e', MEDIUM: '#c27803', LOW: '#057a55' };
  const urgencyIcon  = { HIGH: '🚨', MEDIUM: '⚠️', LOW: '✅', COMPLAINT_REGISTERED: '📋' };

  dropdown.innerHTML = `
    <div style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:700;font-size:.875rem;color:#111827">
      🔔 Recent Alerts
    </div>
    ${alerts.slice(0, 15).map(a => `
      <div style="padding:12px 16px;border-bottom:1px solid #f3f4f6;cursor:pointer;transition:background .15s"
           onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background=''"
           onclick="window.location.href='/tracking?id=${a.ticket_id}'">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:.8rem;font-weight:700;color:${urgencyColor[a.urgency] || '#1a56db'}">
            ${urgencyIcon[a.type] || '📋'}  ${a.urgency} — ${a.category}
          </span>
          <span style="font-size:.72rem;color:#9ca3af">${_timeAgo(a.timestamp)}</span>
        </div>
        <div style="font-size:.8rem;color:#4b5563;font-family:monospace">${a.ticket_id}</div>
        <div style="font-size:.78rem;color:#6b7280;margin-top:2px">${(a.summary || '').slice(0, 70)}</div>
      </div>
    `).join('')}
    <div style="padding:10px 16px;text-align:center">
      <a href="/dashboard" style="font-size:.8rem;color:#1a56db">View all complaints →</a>
    </div>
  `;
}

function _timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

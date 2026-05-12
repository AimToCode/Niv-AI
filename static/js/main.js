// main.js — global utilities & nav
export function showToast(msg, type='default', duration=3000) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  const icons = {success:'✅', error:'❌', warning:'⚠️', default:'ℹ️'};
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
  });
}

export function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

export function urgencyClass(u) {
  return {HIGH:'badge-high', MEDIUM:'badge-medium', LOW:'badge-low'}[u] || 'badge-neutral';
}

export function getResponseTime(u) {
  return {HIGH:'24 hours', MEDIUM:'48 hours', LOW:'72 hours'}[u] || '72 hours';
}

export function setLoading(btn, loading, text='') {
  if (loading) {
    btn.disabled = true;
    btn._orig = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> ${text||'Loading...'}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn._orig || text;
  }
}

export function sanitize(s) {
  return s ? String(s).replace(/</g,'&lt;').replace(/>/g,'&gt;').trim() : '';
}

export function generateTicketId() {
  const d = new Date().toISOString().slice(0,10).replace(/-/g,'');
  return `GRV-${d}-${Math.floor(1000+Math.random()*9000)}`;
}

// Hamburger nav
const ham = document.getElementById('hamburger');
const mob = document.getElementById('nav-mobile');
if (ham && mob) {
  ham.addEventListener('click', () => {
    ham.classList.toggle('open');
    mob.classList.toggle('open');
  });
}

console.log('🏛️ Nivaran ready');

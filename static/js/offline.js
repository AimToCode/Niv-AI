// offline.js — FIXED offline/PWA logic
const DB_NAME = 'nivai-offline';
const STORE = 'complaints-queue';

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = e => e.target.result.createObjectStore(STORE, {keyPath:'id', autoIncrement:true});
    r.onsuccess = e => res(e.target.result);
    r.onerror = () => rej(r.error);
  });
}

export async function queueOfflineComplaint(payload) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add({...payload, queued_at: new Date().toISOString()});
    updateCount();
  } catch(e) { console.error('[Offline]', e); }
}

async function getQueued() {
  try {
    const db = await openDB();
    return new Promise(res => {
      const r = db.transaction(STORE,'readonly').objectStore(STORE).getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => res([]);
    });
  } catch { return []; }
}

async function removeFromQueue(id) {
  try {
    const db = await openDB();
    db.transaction(STORE,'readwrite').objectStore(STORE).delete(id);
  } catch {}
}

async function syncQueue() {
  const items = await getQueued();
  if (!items.length) return;
  let synced = 0;
  for (const item of items) {
    try {
      const {id, ...payload} = item;
      const r = await fetch('/api/submit', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      if (r.ok) { await removeFromQueue(id); synced++; }
    } catch {}
  }
  if (synced > 0) {
    const c = document.getElementById('toast-container');
    if (c) {
      const t = document.createElement('div');
      t.className = 'toast toast-success';
      t.textContent = `✅ ${synced} complaint(s) synced!`;
      c.appendChild(t);
      setTimeout(() => t.remove(), 4000);
    }
    updateCount();
  }
}

async function updateCount() {
  const items = await getQueued();
  const el = document.getElementById('offline-queue-count');
  if (el) el.textContent = items.length > 0 ? `(${items.length} queued)` : '';
}

const banner = document.getElementById('offline-banner');
window.addEventListener('offline', () => {
  if (banner) banner.classList.add('show');
  document.body.classList.add('offline-mode');
  updateCount();
});
window.addEventListener('online', () => {
  if (banner) banner.classList.remove('show');
  document.body.classList.remove('offline-mode');
  syncQueue();
});
if (!navigator.onLine && banner) banner.classList.add('show');
else updateCount();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/offline/service-worker.js')
      .then(() => console.log('✅ SW registered'))
      .catch(e => console.warn('SW failed:', e));
  });
}

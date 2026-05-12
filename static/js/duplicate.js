// duplicate.js — FIXED
import { apiPost } from './api.js';

export async function checkDuplicate(text, category, pincode) {
  if (!text || text.length < 20) return { is_duplicate: false };
  try {
    const r = await apiPost('/api/check-duplicate', { text, category, pincode });
    if (r.success) return r.data;
  } catch {}
  return { is_duplicate: false };
}

export function showDuplicateBanner(dupTicketId) {
  const banner = document.getElementById('duplicate-banner');
  const el = document.getElementById('dup-ticket-id');
  if (!banner) return;
  if (el) el.textContent = dupTicketId || '';
  banner.classList.add('show');
  banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('dup-view-btn')?.addEventListener('click', () => {
  const id = document.getElementById('dup-ticket-id')?.textContent;
  if (id) window.location.href = `/tracking?id=${id}`;
});

// tracking.js
import { trackComplaint } from './api.js';
import { showToast, formatDate } from './main.js';

const LANG_NAMES = {
  hi:'Hindi', gu:'Gujarati', bn:'Bengali', ta:'Tamil', te:'Telugu',
  mr:'Marathi', kn:'Kannada', ml:'Malayalam', pa:'Punjabi', ur:'Urdu',
  or:'Odia', as:'Assamese', ne:'Nepali', sa:'Sanskrit', en:'English',
};

const STEPS = [
  { key:'Submitted',    icon:'📋', label:'Submitted',       note:'Complaint received' },
  { key:'Classified',   icon:'🤖', label:'Classified',       note:'AI classified category & urgency' },
  { key:'Assigned',     icon:'🏛️', label:'Assigned to Dept', note:'Routed to department' },
  { key:'In Progress',  icon:'⚙️', label:'In Progress',      note:'Department is working on it' },
  { key:'Resolved',     icon:'✅', label:'Resolved',          note:'Issue has been resolved' },
  { key:'Closed',       icon:'🔒', label:'Closed',            note:'Complaint closed' },
];

const trackBtn = document.getElementById('track-btn');
const ticketIn = document.getElementById('ticket-input');
const stepSec  = document.getElementById('stepper-section');
const notFound = document.getElementById('not-found-card');

if (trackBtn) trackBtn.addEventListener('click', doTrack);
if (ticketIn) {
  ticketIn.addEventListener('keydown', e => { if (e.key === 'Enter') doTrack(); });
  ticketIn.addEventListener('input',   e => { e.target.value = e.target.value.toUpperCase(); });
}

// Auto-track from URL param ?id=GRV-...
const urlId = new URLSearchParams(window.location.search).get('id');
if (urlId && ticketIn) { ticketIn.value = urlId.toUpperCase(); doTrack(); }

async function doTrack() {
  const id = ticketIn?.value?.trim().toUpperCase();
  if (!id || id.length < 6) return showToast('Please enter a valid Ticket ID', 'error');

  if (trackBtn) { trackBtn.disabled = true; trackBtn.innerHTML = '<span class="spinner"></span> Tracking…'; }
  stepSec?.classList.add('hidden');
  notFound?.classList.add('hidden');

  const result = await trackComplaint(id);

  if (trackBtn) {
    trackBtn.disabled = false;
    trackBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Track`;
  }

  if (!result.success || !result.data?.ticket_id) {
    notFound?.classList.remove('hidden');
    return;
  }
  render(result.data);
}

function render(d) {
  // Ticket ID
  setText('detail-ticket-id', d.ticket_id || '—');

  // Urgency badge
  const ub = document.getElementById('detail-urgency-badge');
  if (ub) {
    const urg = (d.urgency || '').toLowerCase();
    const label = urg === 'high' ? 'high urgency' : urg === 'medium' ? 'medium urgency' : urg === 'low' ? 'low urgency' : d.urgency || '—';
    ub.textContent = label;
    ub.className = `urgency-pill urgency-${urg}`;
  }

  // Row 1
  setText('detail-category',   d.category   || '—');
  setText('detail-department', d.department  || '—');
  setText('detail-filed',      formatDate(d.timestamp));

  // Row 2 — show the language the complaint was written in
  const rawLang = d.detected_language || d.user_language || 'en';
  const langCode = rawLang === 'unknown' ? (d.user_language || 'en') : rawLang;
  const langDisplay = LANG_NAMES[langCode] || (langCode !== 'en' ? langCode.toUpperCase() : 'English');
  setText('detail-language', langDisplay);
  setText('detail-location', d.location || '—');
  setText('detail-status',   d.status   || '—');

  // AI Summary
  setText('detail-summary', d.summary || '—');

  // Original complaint + translation
  setText('detail-original', d.original_text || d.translated_text || '—');
  const englishEl = document.getElementById('detail-english');
  if (englishEl) {
    if (d.is_translated && d.translated_text && d.translated_text !== d.original_text) {
      englishEl.innerHTML = `<strong>English:</strong> ${d.translated_text}`;
      englishEl.style.display = 'block';
    } else if (d.translated_text && d.original_text && d.translated_text !== d.original_text) {
      englishEl.innerHTML = `<strong>English:</strong> ${d.translated_text}`;
      englishEl.style.display = 'block';
    } else {
      englishEl.style.display = 'none';
    }
  }

  // Journey stepper
  renderJourney(d.status, d.status_history || [], d.category, d.urgency);

  stepSec?.classList.remove('hidden');
  stepSec?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderJourney(current, history, category, urgency) {
  const list = document.getElementById('steps-list');
  if (!list) return;

  const ci = STEPS.findIndex(s => s.key === current);

  list.innerHTML = STEPS.map((step, i) => {
    const done   = i < ci || current === 'Resolved' || current === 'Closed';
    const active = i === ci && current !== 'Resolved' && current !== 'Closed';
    const h      = history.find(x => x.status === step.key);
    const timeStr = h ? formatDate(h.timestamp) : '';

    // Dynamic note for classified step
    let note = step.note;
    if (step.key === 'Classified' && category && urgency) {
      note = `AI classified as ${category.toLowerCase()} (${urgency.toLowerCase()} urgency)`;
    }

    return `
      <div class="step-item ${done ? 'completed' : active ? 'current' : ''}">
        <div class="step-left">
          <div class="step-icon">${step.icon}</div>
        </div>
        <div class="step-content">
          <div class="step-row">
            <div class="step-name">${step.label}</div>
            ${timeStr ? `<div class="step-time">${timeStr}</div>` : ''}
          </div>
          ${(done || active) ? `<div class="step-note">${note}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

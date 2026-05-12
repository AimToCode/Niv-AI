// complaint.js — with same-user duplicate modal (multilingual)
import { submitComplaint } from './api.js';
import { showToast, getResponseTime, urgencyClass, setLoading, sanitize } from './main.js';

let selectedCategory  = null;
let photoBase64        = null;
let _pendingUserDupSubmit = null; // stores payload to re-submit if user clicks "anyway"

// ── Multilingual strings for the user-duplicate modal ────────────
const USER_DUP_STRINGS = {
  hi: {
    title:  'आपने पहले से यह शिकायत दर्ज की है',
    body:   'हमारे रिकॉर्ड के अनुसार, आप पहले ही इसी तरह की शिकायत दर्ज करा चुके हैं।',
    ticket: '🎫 आपका टिकट नंबर',
    view:   '🔍 मौजूदा शिकायत देखें →',
    anyway: 'फिर भी नई शिकायत दर्ज करें',
    dismiss:'बंद करें',
  },
  en: {
    title:  'You have already filed this complaint',
    body:   'Our records show that you have already submitted a similar complaint recently.',
    ticket: '🎫 Your ticket',
    view:   '🔍 View existing complaint →',
    anyway: 'Submit as a new complaint anyway',
    dismiss:'Dismiss',
  },
  bn: {
    title:  'আপনি ইতিমধ্যে এই অভিযোগ দায়ের করেছেন',
    body:   'আমাদের রেকর্ড অনুযায়ী, আপনি ইতিমধ্যে একটি অনুরূপ অভিযোগ দাখিল করেছেন।',
    ticket: '🎫 আপনার টিকেট',
    view:   '🔍 বিদ্যমান অভিযোগ দেখুন →',
    anyway: 'তবুও নতুন অভিযোগ দাখিল করুন',
    dismiss:'বাতিল',
  },
  te: {
    title:  'మీరు ఇప్పటికే ఈ ఫిర్యాదు దాఖలు చేశారు',
    body:   'మీరు ఇటీవల ఇదే విధమైన ఫిర్యాదును దాఖలు చేసినట్లు మా రికార్డులు చూపిస్తున్నాయి.',
    ticket: '🎫 మీ టికెట్',
    view:   '🔍 ఇప్పటికే ఉన్న ఫిర్యాదు చూడండి →',
    anyway: 'అయినప్పటికీ కొత్త ఫిర్యాదు దాఖలు చేయండి',
    dismiss:'మూసివేయి',
  },
  mr: {
    title:  'तुम्ही आधीच हीच तक्रार दाखल केली आहे',
    body:   'आमच्या नोंदीनुसार, तुम्ही आधीच अशाच प्रकारची तक्रार दाखल केली आहे.',
    ticket: '🎫 तुमचा तिकीट',
    view:   '🔍 विद्यमान तक्रार पहा →',
    anyway: 'तरीही नवीन तक्रार दाखल करा',
    dismiss:'बंद करा',
  },
  ta: {
    title:  'நீங்கள் ஏற்கனவே இந்த புகாரை தாக்கல் செய்துள்ளீர்கள்',
    body:   'நீங்கள் சமீபத்தில் இதேபோன்ற புகாரை தாக்கல் செய்துள்ளீர்கள் என்று எங்கள் பதிவுகள் காட்டுகின்றன.',
    ticket: '🎫 உங்கள் டிக்கெட்',
    view:   '🔍 ஏற்கனவே உள்ள புகாரை காண்க →',
    anyway: 'இருந்தாலும் புதிய புகாரை தாக்கல் செய்யவும்',
    dismiss:'மூடு',
  },
  ur: {
    title:  'آپ پہلے ہی یہ شکایت درج کرا چکے ہیں',
    body:   'ہمارے ریکارڈ کے مطابق، آپ پہلے ہی اسی طرح کی شکایت درج کرا چکے ہیں۔',
    ticket: '🎫 آپ کا ٹکٹ',
    view:   '🔍 موجودہ شکایت دیکھیں →',
    anyway: 'پھر بھی نئی شکایت درج کریں',
    dismiss:'بند کریں',
  },
  gu: {
    title:  'તમે પહેલેથી જ આ ફરિયાદ દાખલ કરી છે',
    body:   'અમારા રેકોર્ડ અનુસાર, તમે તાજેતરમાં જ આવી ફરિયાદ દાખલ કરી છે.',
    ticket: '🎫 તમારી ટિકિટ',
    view:   '🔍 હાલની ફરિયાદ જુઓ →',
    anyway: 'તોય નવી ફરિયાદ દાખલ કરો',
    dismiss:'બંધ કરો',
  },
  kn: {
    title:  'ನೀವು ಈಗಾಗಲೇ ಈ ದೂರು ದಾಖಲಿಸಿದ್ದೀರಿ',
    body:   'ನಮ್ಮ ದಾಖಲೆಗಳ ಪ್ರಕಾರ, ನೀವು ಇತ್ತೀಚೆಗೆ ಇದೇ ರೀತಿಯ ದೂರನ್ನು ದಾಖಲಿಸಿದ್ದೀರಿ.',
    ticket: '🎫 ನಿಮ್ಮ ಟಿಕೆಟ್',
    view:   '🔍 ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ ದೂರು ನೋಡಿ →',
    anyway: 'ಹೊಸ ದೂರನ್ನು ದಾಖಲಿಸಿ',
    dismiss:'ಮುಚ್ಚಿ',
  },
  ml: {
    title:  'നിങ്ങൾ ഇതിനകം ഈ പരാതി ഫയൽ ചെയ്തിട്ടുണ്ട്',
    body:   'ഞങ്ങളുടെ രേഖകൾ അനുസരിച്ച്, നിങ്ങൾ അടുത്തിടെ ഇതേ പോലൊരു പരാതി ഫയൽ ചെയ്തിട്ടുണ്ട്.',
    ticket: '🎫 നിങ്ങളുടെ ടിക്കറ്റ്',
    view:   '🔍 നിലവിലുള്ള പരാതി കാണുക →',
    anyway: 'എങ്കിലും പുതിയ പരാതി ഫയൽ ചെയ്യുക',
    dismiss:'അടയ്ക്കുക',
  },
  pa: {
    title:  'ਤੁਸੀਂ ਪਹਿਲਾਂ ਹੀ ਇਹ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕੀਤੀ ਹੈ',
    body:   'ਸਾਡੇ ਰਿਕਾਰਡ ਅਨੁਸਾਰ, ਤੁਸੀਂ ਹਾਲ ਹੀ ਵਿੱਚ ਇਸੇ ਤਰ੍ਹਾਂ ਦੀ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕੀਤੀ ਹੈ।',
    ticket: '🎫 ਤੁਹਾਡੀ ਟਿਕਟ',
    view:   '🔍 ਮੌਜੂਦਾ ਸ਼ਿਕਾਇਤ ਦੇਖੋ →',
    anyway: 'ਫਿਰ ਵੀ ਨਵੀਂ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰੋ',
    dismiss:'ਬੰਦ ਕਰੋ',
  },
  or: {
    title:  'ଆପଣ ଏହି ଅଭିଯୋଗ ଆଗରୁ ଦାଖଲ କରିଛନ୍ତି',
    body:   'ଆମ ରେକର୍ଡ ଅନୁଯାୟୀ, ଆପଣ ସମ୍ପ୍ରତି ଏହି ଅଭିଯୋଗ ଦାଖଲ କରିଛନ୍ତି।',
    ticket: '🎫 ଆପଣଙ୍କ ଟିକେଟ',
    view:   '🔍 ବିଦ୍ୟମାନ ଅଭିଯୋଗ ଦେଖନ୍ତୁ →',
    anyway: 'ତଥାପି ନୂଆ ଅଭିଯୋଗ ଦାଖଲ କରନ୍ତୁ',
    dismiss:'ବନ୍ଦ',
  },
  as: {
    title:  'আপুনি ইতিমধ্যে এই অভিযোগ দাখিল কৰিছে',
    body:   'আমাৰ ৰেকৰ্ড অনুযায়ী, আপুনি পূৰ্বতে একেই ধৰণৰ অভিযোগ দাখিল কৰিছে।',
    ticket: '🎫 আপোনাৰ টিকেট',
    view:   '🔍 বিদ্যমান অভিযোগ চাওক →',
    anyway: 'তথাপি নতুন অভিযোগ দাখিল কৰক',
    dismiss:'বন্ধ কৰক',
  },
  mai: {
    title:  'अहाँ पहिनहि ई शिकायत दाखिल कय चुकल छी',
    body:   'हमर अभिलेखक अनुसार अहाँ पहिनहि एहिना शिकायत दाखिल कय चुकल छी।',
    ticket: '🎫 अहाँक टिकट',
    view:   '🔍 विद्यमान शिकायत देखू →',
    anyway: 'तैयो नव शिकायत दाखिल करू',
    dismiss:'बंद करू',
  },
  ne: {
    title:  'तपाईंले पहिले नै यो उजुरी दर्ता गर्नुभएको छ',
    body:   'हाम्रो रेकर्डका अनुसार, तपाईंले हालै यस्तै उजुरी दर्ता गर्नुभएको छ।',
    ticket: '🎫 तपाईंको टिकट',
    view:   '🔍 अवस्थित उजुरी हेर्नुहोस् →',
    anyway: 'तैपनि नयाँ उजुरी दर्ता गर्नुहोस्',
    dismiss:'बन्द गर्नुहोस्',
  },
  sa: {
    title:  'भवान् पूर्वमेव एतां शिकायतं दाखिलाम् अकरोत्',
    body:   'अस्माकं अभिलेखानुसारम् भवान् इदानीमेव सदृशां शिकायतं प्रस्तुतवान्।',
    ticket: '🎫 भवतः टिकट',
    view:   '🔍 विद्यमानां शिकायतं पश्यतु →',
    anyway: 'तथापि नूतनां शिकायतं दाखिल करोतु',
    dismiss:'बन्द करोतु',
  },
  'hi-Latn': {
    title:  'Aapne pehle se yeh shikayat darj ki hai',
    body:   'Hamare record ke anusar, aap pehle hi isi tarah ki shikayat darj kara chuke hain.',
    ticket: '🎫 Aapka ticket',
    view:   '🔍 Maujuda shikayat dekhein →',
    anyway: 'Phir bhi nayi shikayat darj karein',
    dismiss:'Band karein',
  },
};

function getDupStrings(langCode) {
  return USER_DUP_STRINGS[langCode] || USER_DUP_STRINGS['en'];
}

// ── Modal helpers ─────────────────────────────────────────────────
function showUserDupModal(ticketId, langCode) {
  const s = getDupStrings(langCode);
  document.getElementById('user-dup-title').textContent    = s.title;
  document.getElementById('user-dup-body').textContent     = s.body;
  document.getElementById('user-dup-ticket-id').textContent = ticketId;
  document.getElementById('user-dup-view-btn').textContent  = s.view;
  document.getElementById('user-dup-anyway-btn').textContent = s.anyway;
  document.getElementById('user-dup-dismiss-btn').textContent = s.dismiss;

  document.getElementById('user-dup-view-btn').onclick = () => {
    window.open(`/tracking?id=${ticketId}`, '_blank');
  };

  document.getElementById('user-dup-overlay').classList.add('show');
}

function hideUserDupModal() {
  document.getElementById('user-dup-overlay').classList.remove('show');
  _pendingUserDupSubmit = null;
}

// Close on backdrop click
document.getElementById('user-dup-overlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('user-dup-overlay')) hideUserDupModal();
});
document.getElementById('user-dup-close')?.addEventListener('click',   hideUserDupModal);
document.getElementById('user-dup-dismiss-btn')?.addEventListener('click', hideUserDupModal);

// Keyboard — Escape closes modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') hideUserDupModal();
});

// "Submit anyway" — re-submit with both force flags set
document.getElementById('user-dup-anyway-btn')?.addEventListener('click', async () => {
  hideUserDupModal();
  if (!_pendingUserDupSubmit) return;
  const payload = { ..._pendingUserDupSubmit, force_duplicate: true, force_user_duplicate: true };
  const btn = document.getElementById('submit-btn');
  setLoading(btn, true, 'Submitting...');
  const result = await submitComplaint(payload);
  setLoading(btn, false);
  if (result.success && !result.is_duplicate && !result.is_user_duplicate) {
    showResultCard(result.data);
  } else {
    showToast('Submission failed. Please try again.', 'error');
  }
});

// ── Category buttons ─────────────────────────────────────────────
document.querySelectorAll('.category-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedCategory = btn.dataset.category;
  });
});

// Char count
const ta = document.getElementById('complaint-text');
const cc = document.getElementById('char-count');
if (ta && cc) ta.addEventListener('input', () => { cc.textContent = ta.value.length; });

// ── GPS ──────────────────────────────────────────────────────────
document.getElementById('gps-btn')?.addEventListener('click', () => {
  if (!navigator.geolocation) return showToast('Geolocation not supported', 'error');
  const btn = document.getElementById('gps-btn');
  btn.textContent = '⏳';
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      document.getElementById('lat-input').value = lat;
      document.getElementById('lng-input').value = lng;
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const d = await r.json();
        const addr = d.address || {};
        const parts = [
          addr.road || addr.pedestrian || addr.footway || '',
          addr.neighbourhood || addr.suburb || addr.quarter || addr.hamlet || '',
          addr.village || addr.town || addr.city_district || addr.city || addr.county || '',
          addr.state || '',
        ].map(s => s.trim()).filter(Boolean);
        const unique = parts.filter((v, i) => v !== parts[i - 1]);
        const displayAddr = unique.slice(0, 4).join(', ')
          || d.display_name?.split(',').slice(0, 3).join(', ')
          || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        document.getElementById('location-input').value = displayAddr;
        document.getElementById('pincode-input').value  = addr.postcode || '';
        const accMsg = accuracy ? ` (±${Math.round(accuracy)}m)` : '';
        showToast(`Location detected${accMsg}`, 'success');
      } catch {
        document.getElementById('location-input').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        showToast('Address lookup failed — coordinates saved', 'warning');
      }
      btn.textContent = '✅';
      setTimeout(() => { btn.textContent = '📍'; }, 2500);
    },
    err => {
      const msgs = {
        1: 'Location permission denied',
        2: 'Location unavailable — check GPS signal',
        3: 'Location request timed out — try again',
      };
      showToast(msgs[err.code] || 'Could not get location', 'warning');
      btn.textContent = '📍';
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
});

// ── Photo upload ─────────────────────────────────────────────────
document.getElementById('photo-upload')?.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) return showToast('File too large — max 5MB', 'error');
  const reader = new FileReader();
  reader.onload = ev => {
    photoBase64 = ev.target.result.split(',')[1];
    document.getElementById('upload-label').textContent = `✅ ${file.name}`;
    const prev = document.getElementById('upload-preview');
    if (prev) {
      prev.innerHTML = `<img src="${ev.target.result}" style="width:48px;height:48px;object-fit:cover;border-radius:6px"><span>${file.name}</span>`;
      prev.classList.remove('hidden');
    }
  };
  reader.readAsDataURL(file);
});

// ── Submit ────────────────────────────────────────────────────────
document.getElementById('submit-btn')?.addEventListener('click', handleSubmit);

async function handleSubmit() {
  const text     = ta?.value?.trim();
  const lang     = document.getElementById('lang-select')?.value || 'en';
  const location = document.getElementById('location-input')?.value?.trim();
  const pincode  = document.getElementById('pincode-input')?.value?.trim();
  const contact  = document.getElementById('contact-input')?.value?.trim();
  const lat      = document.getElementById('lat-input')?.value;
  const lng      = document.getElementById('lng-input')?.value;

  if (!text || text.length < 10) return showToast('Please write your complaint (min 10 characters)', 'error');
  if (!location)                 return showToast('Please enter your location', 'warning');

  if (!navigator.onLine) {
    showToast('You are offline — complaint saved, will submit when connected', 'warning', 4000);
    return;
  }

  const payload = {
    text: sanitize(text),
    language: lang,
    category_hint: selectedCategory,
    location: sanitize(location),
    pincode: sanitize(pincode),
    contact: sanitize(contact),
    lat: lat || null,
    lng: lng || null,
    photo_base64: photoBase64,
    force_duplicate: false,
    force_user_duplicate: false,
  };

  const btn = document.getElementById('submit-btn');
  setLoading(btn, true, 'Classifying...');
  const result = await submitComplaint(payload);
  setLoading(btn, false);

  if (result.success) {
    if (result.is_user_duplicate) {
      // Same user, same complaint — show centered multilingual modal
      _pendingUserDupSubmit = payload;
      showUserDupModal(result.data.duplicate_of, lang);
      return;
    }
    if (result.is_duplicate) {
      // Same area duplicate — show existing top banner
      const banner = document.getElementById('duplicate-banner');
      const tickEl = document.getElementById('dup-ticket-id');
      if (tickEl) tickEl.textContent = result.data.duplicate_of;
      if (banner)  banner.classList.add('show');
      return;
    }
    showResultCard(result.data);
  } else {
    showToast(result.error || 'Submission failed. Try again.', 'error');
  }
}

function showResultCard(data) {
  const card = document.getElementById('result-card');
  if (!card) return;
  document.getElementById('result-ticket-id').textContent   = data.ticket_id;
  document.getElementById('result-category').textContent    = data.category;
  document.getElementById('result-department').textContent  = data.department;
  const uEl = document.getElementById('result-urgency');
  if (uEl) uEl.innerHTML = `<span class="badge ${urgencyClass(data.urgency)}">${data.urgency}</span>`;
  document.getElementById('result-response-time').textContent = getResponseTime(data.urgency);
  const tl = document.getElementById('track-link');
  if (tl) tl.href = `/tracking?id=${data.ticket_id}`;
  card.classList.add('show');
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  document.getElementById('complaint-form-card')?.classList.add('hidden');
  showToast('Complaint submitted!', 'success');

  const regAlert  = document.getElementById('registered-alert');
  const regMsg    = document.getElementById('registered-alert-msg');
  const regTicket = document.getElementById('reg-ticket-display');
  const regUrg    = document.getElementById('reg-urgency-display');
  const regTrack  = document.getElementById('reg-track-link');
  if (regAlert) {
    if (regMsg)    regMsg.textContent = `Routed to: ${data.department} | Expected response: ${getResponseTime(data.urgency)}`;
    if (regTicket) regTicket.textContent = data.ticket_id;
    if (regUrg) {
      const colors = {
        HIGH:   'background:#fde8e8;color:#c81e1e',
        MEDIUM: 'background:#fdf6b2;color:#c27803',
        LOW:    'background:#def7ec;color:#057a55',
      };
      regUrg.setAttribute('style', (colors[data.urgency] || 'background:#FEF0E6;color:#D4500A') + ';border-radius:6px;padding:4px 12px;font-weight:700;font-size:.85rem');
      regUrg.textContent = data.urgency + ' URGENCY';
    }
    if (regTrack) regTrack.href = `/tracking?id=${data.ticket_id}`;
    regAlert.style.display = 'block';
    regAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// New complaint btn
document.getElementById('new-complaint-btn')?.addEventListener('click', () => {
  document.getElementById('result-card')?.classList.remove('show');
  document.getElementById('complaint-form-card')?.classList.remove('hidden');
  if (ta) ta.value = '';
  if (cc) cc.textContent = '0';
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));
  selectedCategory = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Area duplicate — submit anyway
document.getElementById('dup-submit-anyway')?.addEventListener('click', async () => {
  document.getElementById('duplicate-banner')?.classList.remove('show');
  const btn = document.getElementById('submit-btn');
  setLoading(btn, true, 'Submitting...');
  const result = await submitComplaint({
    text: sanitize(ta?.value?.trim()),
    language: document.getElementById('lang-select')?.value || 'en',
    category_hint: selectedCategory,
    location: sanitize(document.getElementById('location-input')?.value?.trim()),
    pincode:  sanitize(document.getElementById('pincode-input')?.value?.trim()),
    force_duplicate: true,
    force_user_duplicate: true,
  });
  setLoading(btn, false);
  if (result.success && !result.is_duplicate && !result.is_user_duplicate) showResultCard(result.data);
});

// Hero stats
(async () => {
  try {
    const r = await fetch('/api/health');
    const d = await r.json();
    if (d.success) {
      const t  = document.getElementById('stat-total');
      const rs = document.getElementById('stat-resolved');
      if (t)  t.textContent  = d.data.total?.toLocaleString('en-IN')    || '0';
      if (rs) rs.textContent = d.data.resolved?.toLocaleString('en-IN') || '0';
    }
  } catch {}
})();

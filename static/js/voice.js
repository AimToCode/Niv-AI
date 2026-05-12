// ============================================
// NivAI — voice.js: Web Speech API voice input
// Live transcription display added
// ============================================

import { showToast } from './main.js';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const SPEECH_LANG_MAP = {
  'hi': 'hi-IN', 'en': 'en-IN', 'bn': 'bn-IN', 'te': 'te-IN',
  'mr': 'mr-IN', 'ta': 'ta-IN', 'ur': 'ur-PK', 'gu': 'gu-IN',
  'kn': 'kn-IN', 'or': 'or-IN', 'ml': 'ml-IN', 'pa': 'pa-IN',
  'as': 'as-IN', 'mai': 'hi-IN', 'sa': 'sa-IN', 'kok': 'kok-IN',
  'doi': 'hi-IN', 'sd': 'sd-PK', 'mni': 'mni-IN', 'brx': 'hi-IN',
  'sat': 'sat-IN', 'ks': 'ks-IN', 'ne': 'ne-NP', 'hi-Latn': 'hi-IN'
};

let recognition = null;
let isRecording = false;

const voiceBtn  = document.getElementById('voice-btn');
const textarea  = document.getElementById('complaint-text');
const langSelect= document.getElementById('lang-select');
const charCount = document.getElementById('char-count');

// ── Live transcription preview box ──────────────────────────────
let livePreview = null;

function createLivePreview() {
  if (livePreview) return;
  livePreview = document.createElement('div');
  livePreview.id = 'voice-live-preview';
  livePreview.style.cssText = `
    display:none;
    margin-top:10px;
    padding:12px 14px;
    background:#eff6ff;
    border:1.5px solid #3b82f6;
    border-radius:10px;
    font-size:0.88rem;
    line-height:1.6;
    color:#1e3a5f;
    min-height:52px;
    position:relative;
    transition:all .2s;
  `;
  livePreview.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span id="voice-pulse" style="
        display:inline-block;width:10px;height:10px;border-radius:50%;
        background:#ef4444;box-shadow:0 0 0 0 rgba(239,68,68,.4);
        animation:voicePulse 1.2s infinite;flex-shrink:0
      "></span>
      <span style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#3b82f6">Listening…</span>
    </div>
    <div id="voice-final-text" style="color:#1e3a5f;font-weight:500"></div>
    <div id="voice-interim-text" style="color:#6b7280;font-style:italic;min-height:1.2em"></div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes voicePulse {
      0%   { box-shadow:0 0 0 0 rgba(239,68,68,.5); }
      70%  { box-shadow:0 0 0 8px rgba(239,68,68,0); }
      100% { box-shadow:0 0 0 0 rgba(239,68,68,0); }
    }
  `;
  document.head.appendChild(style);

  // Insert right after the textarea (or after voice btn wrapper)
  if (textarea && textarea.parentNode) {
    textarea.parentNode.insertBefore(livePreview, textarea.nextSibling);
  } else if (voiceBtn && voiceBtn.parentNode) {
    voiceBtn.parentNode.appendChild(livePreview);
  }
}

function showLivePreview(finalText, interimText) {
  if (!livePreview) createLivePreview();
  livePreview.style.display = 'block';
  const ft = document.getElementById('voice-final-text');
  const it = document.getElementById('voice-interim-text');
  if (ft) ft.textContent  = finalText   || '';
  if (it) it.textContent  = interimText || '';
}

function hideLivePreview() {
  if (livePreview) livePreview.style.display = 'none';
}

// ── Speech Recognition setup ─────────────────────────────────────
if (!SpeechRecognition) {
  if (voiceBtn) {
    voiceBtn.title = 'Voice input not supported in this browser';
    voiceBtn.style.opacity = '0.4';
    voiceBtn.disabled = true;
  }
} else if (voiceBtn) {
  voiceBtn.addEventListener('click', toggleRecording);
}

function toggleRecording() {
  if (isRecording) stopRecording();
  else startRecording();
}

function startRecording() {
  const langCode  = langSelect?.value || 'en';
  const speechLang= SPEECH_LANG_MAP[langCode] || 'en-IN';

  recognition = new SpeechRecognition();
  recognition.lang             = speechLang;
  recognition.continuous       = true;
  recognition.interimResults   = true;
  recognition.maxAlternatives  = 1;

  let finalTranscript = textarea?.value || '';

  recognition.onstart = () => {
    isRecording = true;
    voiceBtn.classList.add('recording');
    voiceBtn.title   = 'Recording… Click to stop';
    voiceBtn.innerHTML = '⏹️';
    createLivePreview();
    showLivePreview(finalTranscript, '');
    showToast(`🎤 Listening in ${getLangName(langCode)}…`, 'default', 2000);
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += t + ' ';
      } else {
        interimTranscript += t;
      }
    }

    // Update textarea
    if (textarea) {
      textarea.value = finalTranscript + interimTranscript;
      if (charCount) charCount.textContent = textarea.value.length;
    }

    // Update live preview box
    showLivePreview(finalTranscript, interimTranscript);
  };

  recognition.onerror = (event) => {
    stopRecording();
    const msgs = {
      'no-speech':     'No speech detected. Please try again.',
      'audio-capture': 'Microphone not accessible.',
      'not-allowed':   'Microphone permission denied. Please allow access.',
      'network':       'Network error during voice recognition.',
    };
    showToast(msgs[event.error] || `Voice error: ${event.error}`, 'error');
  };

  recognition.onend = () => {
    if (isRecording) stopRecording();
  };

  recognition.start();
}

function stopRecording() {
  if (recognition) {
    try { recognition.stop(); } catch {}
    recognition = null;
  }
  isRecording = false;
  if (voiceBtn) {
    voiceBtn.classList.remove('recording');
    voiceBtn.title   = 'Voice Input';
    voiceBtn.innerHTML = '🎤';
  }
  hideLivePreview();
}

function getLangName(code) {
  const names = {
    'hi':'Hindi','en':'English','bn':'Bengali','te':'Telugu',
    'mr':'Marathi','ta':'Tamil','ur':'Urdu','gu':'Gujarati',
    'kn':'Kannada','ml':'Malayalam','pa':'Punjabi','or':'Odia',
    'as':'Assamese','ne':'Nepali','mai':'Maithili','sa':'Sanskrit',
    'kok':'Konkani','doi':'Dogri','sd':'Sindhi','mni':'Manipuri',
    'brx':'Bodo','sat':'Santali','ks':'Kashmiri','hi-Latn':'Hinglish',
  };
  return names[code] || code.toUpperCase();
}

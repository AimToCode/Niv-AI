// ============================================================
// clerk-auth.js — Clerk OTP authentication for Nivaran
// Uses dynamic import so any Clerk errors stay contained.
// Gracefully degrades: if Clerk fails, form submits anyway.
// ============================================================

let _clerk = null;
let _resolveAuth = null;
let _otpFactor = null;
let _signInAttempt = null;

const _pk = window.__CLERK_PK__ || '';

// Suppress unhandled Clerk-internal rejections (non-Error throws)
window.addEventListener('unhandledrejection', e => {
  const reason = e.reason;
  const msg = (reason && typeof reason === 'object' ? reason.message : String(reason)) || '';
  if (msg.toLowerCase().includes('clerk') || msg.includes('publishableKey')) {
    e.preventDefault();
    console.warn('[Clerk] Suppressed internal rejection:', msg);
  }
});

// Lazy-load Clerk via dynamic import and initialize
const _ready = _pk
  ? (async () => {
      try {
        console.log('[Clerk] Loading with key prefix:', _pk.slice(0, 12) + '…');
        // Try multiple import patterns for robustness
        let ClerkCtor = null;
        try {
          const mod = await import('https://esm.sh/@clerk/clerk-js@latest');
          ClerkCtor = mod.Clerk || mod.default?.Clerk || mod.default;
        } catch {
          const mod = await import('https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.mjs');
          ClerkCtor = mod.Clerk || mod.default?.Clerk || mod.default;
        }
        if (!ClerkCtor) throw new Error('Clerk constructor not found in module');
        const c = new ClerkCtor(_pk);
        await c.load();
        _clerk = c;
        _updateBadge();
        console.log('[Clerk] Ready — signed in:', !!c.user);
      } catch (e) {
        console.warn('[Clerk] Init skipped:', e?.message || e);
        // Keep _clerk null — form will work without OTP
      }
    })()
  : Promise.resolve();

export function isSignedIn() { return !!_clerk?.user; }

export function getVerifiedId() {
  if (!_clerk?.user) return '';
  return _clerk.user.primaryPhoneNumber?.phoneNumber
      || _clerk.user.primaryEmailAddress?.emailAddress
      || '';
}

export async function requireAuth() {
  await _ready;
  if (!_clerk) return true;  // graceful degradation — no Clerk
  if (_clerk.user) return true;
  return new Promise(resolve => {
    _resolveAuth = resolve;
    _showModal();
  });
}

export async function signOutUser() {
  await _ready;
  if (_clerk?.user) {
    await _clerk.signOut();
    _updateBadge();
  }
}

function _updateBadge() {
  const badge = document.getElementById('clerk-user-badge');
  const signoutBtn = document.getElementById('clerk-signout-btn');
  const id = getVerifiedId();
  if (badge) {
    if (id) { badge.textContent = '✅ ' + id; badge.style.display = 'inline-flex'; }
    else { badge.style.display = 'none'; }
  }
  if (signoutBtn) signoutBtn.style.display = id ? 'inline-block' : 'none';
}

function _showModal() {
  const m = document.getElementById('clerk-otp-modal');
  if (!m) { if (_resolveAuth) { _resolveAuth(true); _resolveAuth = null; } return; }
  _setStep(1);
  const idEl = document.getElementById('clerk-identifier');
  const codeEl = document.getElementById('clerk-otp-code');
  if (idEl) idEl.value = '';
  if (codeEl) codeEl.value = '';
  _setError('');
  m.classList.add('show');
  setTimeout(() => idEl?.focus(), 80);
}

function _hideModal(resolved) {
  document.getElementById('clerk-otp-modal')?.classList.remove('show');
  const cb = _resolveAuth;
  _resolveAuth = null;
  _otpFactor = null;
  _signInAttempt = null;
  if (cb) cb(resolved ?? false);
}

function _setStep(n) {
  document.getElementById('clerk-step-1')?.classList.toggle('hidden', n !== 1);
  document.getElementById('clerk-step-2')?.classList.toggle('hidden', n !== 2);
}

function _setError(msg) {
  ['clerk-error', 'clerk-error-2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
  });
}

function _setBusy(btn, busy, idleLabel) {
  if (!btn) return;
  btn.disabled = busy;
  btn.textContent = busy ? '⏳ Please wait…' : idleLabel;
}

async function _sendOtp() {
  const identifier = document.getElementById('clerk-identifier')?.value?.trim();
  if (!identifier) return _setError('Please enter your phone number or email');
  _setError('');
  const btn = document.getElementById('clerk-send-btn');
  _setBusy(btn, true, '📲 Send OTP');
  try {
    _signInAttempt = await _clerk.client.signIn.create({ identifier });
    const factors = _signInAttempt.supportedFirstFactors || [];
    _otpFactor = factors.find(f => f.strategy === 'phone_code')
              || factors.find(f => f.strategy === 'email_code');
    if (!_otpFactor) throw new Error('OTP not available for this identifier');
    _signInAttempt = await _signInAttempt.prepareFirstFactor({
      strategy: _otpFactor.strategy,
      phoneNumberId: _otpFactor.phoneNumberId,
      emailAddressId: _otpFactor.emailAddressId,
    });
    const dest = _otpFactor.strategy === 'phone_code' ? 'your phone' : 'your email';
    const sentEl = document.getElementById('clerk-sent-msg');
    if (sentEl) sentEl.textContent = '📱 OTP sent to ' + dest + '. Enter the code below.';
    _setStep(2);
    setTimeout(() => document.getElementById('clerk-otp-code')?.focus(), 80);
  } catch (e) {
    console.error('[Clerk] sendOtp:', e);
    _setError(e.errors?.[0]?.longMessage || e.message || 'Failed to send OTP. Please try again.');
  } finally {
    _setBusy(btn, false, '📲 Send OTP');
  }
}

async function _verifyOtp() {
  const code = document.getElementById('clerk-otp-code')?.value?.trim();
  if (!code || code.length < 4) return _setError('Please enter the OTP code');
  _setError('');
  const btn = document.getElementById('clerk-verify-btn');
  _setBusy(btn, true, '✅ Verify & Continue');
  try {
    const result = await _signInAttempt.attemptFirstFactor({
      strategy: _otpFactor.strategy,
      code,
    });
    if (result.status === 'complete') {
      await _clerk.setActive({ session: result.createdSessionId });
      _updateBadge();
      const contactEl = document.getElementById('contact-input');
      if (contactEl && !contactEl.value) contactEl.value = getVerifiedId();
      _hideModal(true);
    } else {
      _setError('Verification incomplete. Please try again.');
    }
  } catch (e) {
    console.error('[Clerk] verifyOtp:', e);
    _setError(e.errors?.[0]?.longMessage || 'Invalid OTP. Please try again.');
  } finally {
    _setBusy(btn, false, '✅ Verify & Continue');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('clerk-send-btn')?.addEventListener('click', _sendOtp);
  document.getElementById('clerk-verify-btn')?.addEventListener('click', _verifyOtp);
  document.getElementById('clerk-otp-close')?.addEventListener('click', () => _hideModal(false));
  document.getElementById('clerk-cancel-btn')?.addEventListener('click', () => _hideModal(false));
  document.getElementById('clerk-back-btn')?.addEventListener('click', () => { _setError(''); _setStep(1); });
  document.getElementById('clerk-signout-btn')?.addEventListener('click', signOutUser);
  document.getElementById('clerk-otp-modal')?.addEventListener('click', e => {
    if (e.target.id === 'clerk-otp-modal') _hideModal(false);
  });
  document.getElementById('clerk-identifier')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') _sendOtp();
  });
  document.getElementById('clerk-otp-code')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') _verifyOtp();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('clerk-otp-modal')?.classList.contains('show'))
      _hideModal(false);
  });
  _ready.then(_updateBadge);
});

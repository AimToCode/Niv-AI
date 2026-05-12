// api.js — FIXED: all fetch calls with proper error handling
const BASE = '';

async function request(method, endpoint, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(BASE + endpoint, opts);
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || `HTTP ${res.status}`, data: {} };
    return data;
  } catch (err) {
    console.error(`[API] ${method} ${endpoint}:`, err);
    return { success: false, error: 'Network error — check your connection.', data: {} };
  }
}

export const apiGet  = (ep)       => request('GET',  ep);
export const apiPost = (ep, body) => request('POST', ep, body);

export const submitComplaint  = (p)        => apiPost('/api/submit', p);
export const trackComplaint   = (id)       => apiGet(`/api/track/${encodeURIComponent(id)}`);
export const getComplaints    = (params={})=> apiGet('/api/complaints?' + new URLSearchParams(params));
export const updateStatus     = (id,s,d)   => apiPost('/api/update-status', {ticket_id:id, status:s, department:d});
export const getAnalytics     = ()         => apiGet('/api/analytics');
export const login            = (u,p,d)    => apiPost('/api/login', {username:u, password:p, department:d});
export const getHealth        = ()         => apiGet('/api/health');
export const getDepartments   = ()         => apiGet('/api/departments');
export const addDepartment    = (d)        => apiPost('/api/departments', d);
export const getMyComplaints  = (contact)  => apiGet('/api/my-complaints?' + new URLSearchParams({ contact }));

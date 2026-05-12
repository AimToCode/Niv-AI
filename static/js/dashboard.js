// dashboard.js — with Clustering + Transfer features
import { login, getComplaints, updateStatus, apiGet, apiPost } from './api.js';
import { showToast, formatDate, timeAgo, urgencyClass, setLoading } from './main.js';

let allComplaints=[], allClusters=[], currentFilter='all', selectedTicket=null, currentDept=null;
let currentView = 'complaints'; // 'complaints' | 'clusters'

// LOGIN
document.getElementById('login-btn')?.addEventListener('click', handleLogin);
document.getElementById('login-password')?.addEventListener('keydown', e => { if(e.key==='Enter') handleLogin(); });

async function handleLogin() {
  const user = document.getElementById('login-username')?.value?.trim();
  const pwd  = document.getElementById('login-password')?.value;
  const dept = document.getElementById('login-dept')?.value;
  if (!user||!pwd||!dept) return showToast('Fill all fields','error');
  const btn = document.getElementById('login-btn');
  setLoading(btn, true, 'Logging in...');
  document.getElementById('login-error')?.classList.add('hidden');
  const r = await login(user, pwd, dept);
  setLoading(btn, false);
  if (r.success) {
    currentDept = r.data.department||dept;
    sessionStorage.setItem('nivai_dept', currentDept);
    sessionStorage.setItem('nivai_officer', r.data.name||user);
    showDashboard(currentDept, r.data.name||user);
  } else {
    document.getElementById('login-error')?.classList.remove('hidden');
  }
}

const DEPT_NAMES = {
  jal_nigam:'Jal Nigam — Water Supply', pwd:'PWD — Roads',
  electricity:'DISCOM — Electricity', sanitation:'Municipal Sanitation',
  parks:'Parks Department', police:'Police Department',
  health:'Health Department', education:'Education Department',
  transport:'Transport Department', admin:'Super Admin'
};

function showDashboard(dept, name) {
  document.getElementById('login-gate')?.classList.add('hidden');
  document.getElementById('dashboard-page')?.classList.add('show');
  document.getElementById('dept-label').textContent = DEPT_NAMES[dept]||dept;
  document.getElementById('nav-officer-name').textContent = `👤 ${name}`;
  document.getElementById('logout-btn')?.classList.remove('hidden');
  if (dept!=='admin') document.getElementById('admin-link')?.classList.add('hidden');

  // Show cluster stat chip for everyone
  const csc = document.getElementById('cluster-stat-chip');
  if (csc) csc.style.display = '';

  // Show transfer section only for admin
  if (dept === 'admin') {
    document.getElementById('transfer-section')?.classList.remove('hidden');
  }

  loadComplaints();
  loadClusters();
}

// Restore session
const sd = sessionStorage.getItem('nivai_dept');
const so = sessionStorage.getItem('nivai_officer');
if (sd && so) { currentDept=sd; showDashboard(sd, so); }

document.getElementById('logout-btn')?.addEventListener('click', () => {
  sessionStorage.removeItem('nivai_dept');
  sessionStorage.removeItem('nivai_officer');
  document.getElementById('dashboard-page')?.classList.remove('show');
  document.getElementById('login-gate')?.classList.remove('hidden');
});

// ── VIEW TOGGLE ──────────────────────────────────────────────────
document.getElementById('view-complaints-btn')?.addEventListener('click', () => {
  currentView = 'complaints';
  document.getElementById('complaints-view').style.display = '';
  document.getElementById('clusters-view').style.display = 'none';
  document.getElementById('view-complaints-btn').classList.add('active');
  document.getElementById('view-clusters-btn').classList.remove('active');
});

document.getElementById('view-clusters-btn')?.addEventListener('click', () => {
  currentView = 'clusters';
  document.getElementById('complaints-view').style.display = 'none';
  document.getElementById('clusters-view').style.display = '';
  document.getElementById('view-complaints-btn').classList.remove('active');
  document.getElementById('view-clusters-btn').classList.add('active');
  loadClusters();
});

// ── COMPLAINTS ───────────────────────────────────────────────────
async function loadComplaints() {
  const tbody = document.getElementById('complaints-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">
      <div class="spinner spinner-dark" style="margin:0 auto 12px"></div>
      <div>Loading complaints...</div>
    </td></tr>`;
  }
  const params = {};
  if (currentDept && currentDept!=='admin') params.department = currentDept;
  const fd = document.getElementById('filter-date')?.value;
  if (fd) params.date = fd;
  const r = await getComplaints(params);
  if (r.success) {
    allComplaints = (r.data || []).filter(c => c.ticket_id && c.original_text);
    renderTable(filter());
    updateStats();
  } else {
    showToast('Failed to load complaints','error');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">⚠️ Could not load complaints. Please refresh.</td></tr>`;
  }
}

function filter() {
  return allComplaints.filter(c => {
    if (currentFilter==='all') return true;
    if (['HIGH','MEDIUM','LOW'].includes(currentFilter)) return c.urgency===currentFilter;
    return c.status===currentFilter;
  });
}

function updateStats() {
  document.getElementById('stat-total').textContent    = allComplaints.length || '0';
  document.getElementById('stat-high').textContent     = allComplaints.filter(c=>c.urgency==='HIGH').length || '0';
  document.getElementById('stat-pending').textContent  = allComplaints.filter(c=>!['Resolved','Closed'].includes(c.status)).length || '0';
  document.getElementById('stat-resolved').textContent = allComplaints.filter(c=>c.status==='Resolved').length || '0';
  const el = document.getElementById('last-updated');
  if (el) el.textContent = `Last updated: ${new Date().toLocaleTimeString('en-IN')}`;
}

function renderTable(complaints) {
  const tbody = document.getElementById('complaints-tbody');
  if (!tbody) return;
  if (!complaints.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:52px 20px;color:var(--text-muted)">
      <div style="font-size:2.5rem;margin-bottom:12px">📭</div>
      <div style="font-weight:600;color:var(--text-secondary);margin-bottom:6px">No complaints found</div>
      <div style="font-size:0.82rem">Submitted complaints will appear here once citizens file them.</div>
    </td></tr>`;
    return;
  }
  tbody.innerHTML = complaints.map(c => `
    <tr class="${c.urgency?.toLowerCase()}-row" data-ticket="${c.ticket_id}" onclick="window._selectComplaint('${c.ticket_id}')">
      <td class="ticket-cell">${c.ticket_id}</td>
      <td class="summary-cell" title="${c.summary||''}">${((c.summary||c.original_text||'').slice(0,60))}${(c.summary||c.original_text||'').length>60?'...':''}</td>
      <td><span class="badge badge-neutral">${c.category||'—'}</span></td>
      <td><span class="badge ${urgencyClass(c.urgency)}">${c.urgency||'—'}</span></td>
      <td style="font-size:.8rem">${(c.location||'—').slice(0,20)}</td>
      <td class="time-cell">${timeAgo(c.timestamp)}</td>
      <td><span class="badge badge-neutral">${c.status||'—'}</span></td>
    </tr>`).join('');
}

window._selectComplaint = function(tid) {
  selectedTicket = tid;
  const c = allComplaints.find(x => x.ticket_id===tid);
  if (!c) return;
  document.querySelectorAll('.complaints-table tr').forEach(r=>r.classList.remove('selected'));
  document.querySelector(`tr[data-ticket="${tid}"]`)?.classList.add('selected');
  document.getElementById('detail-empty')?.classList.add('hidden');
  document.getElementById('detail-content')?.classList.remove('hidden');
  document.getElementById('dp-ticket').textContent = c.ticket_id;
  document.getElementById('dp-category').textContent = c.category||'—';
  document.getElementById('dp-complaint-text').textContent = c.original_text||'—';

  const translBlock = document.getElementById('dp-translation-block');
  const translText  = document.getElementById('dp-translated-text');
  if (translBlock && translText) {
    const hasTranslation = c.is_translated &&
      c.translated_text &&
      c.translated_text.trim() !== (c.original_text || '').trim();
    translBlock.style.display = hasTranslation ? 'block' : 'none';
    if (hasTranslation) translText.textContent = c.translated_text;
  }

  document.getElementById('dp-summary').textContent = c.summary||'—';
  document.getElementById('dp-location').textContent = c.location||'—';
  const ub = document.getElementById('dp-urgency-badge');
  if (ub) { ub.textContent=c.urgency||'—'; ub.className='badge '+urgencyClass(c.urgency); }
  const mapDiv = document.getElementById('dp-map');
  if (mapDiv) {
    const q = c.lat&&c.lng ? `${c.lat},${c.lng}` : encodeURIComponent(c.location||'India');
    mapDiv.innerHTML = `<iframe src="https://maps.google.com/maps?q=${q}&z=14&output=embed" allowfullscreen loading="lazy" style="width:100%;height:100%;border:none"></iframe>`;
  }
  const ss = document.getElementById('dp-status-select');
  if (ss) ss.value = c.status||'Submitted';

  // Pre-select current dept in transfer dropdown
  const ts = document.getElementById('transfer-dept-select');
  if (ts) ts.value = '';
};

// Update status
document.getElementById('dp-update-btn')?.addEventListener('click', async () => {
  if (!selectedTicket) return;
  const status = document.getElementById('dp-status-select')?.value;
  const btn = document.getElementById('dp-update-btn');
  setLoading(btn, true, '...');
  const r = await updateStatus(selectedTicket, status, currentDept);
  setLoading(btn, false);
  if (r.success) {
    showToast(`Status updated: ${status}`, 'success');
    const c = allComplaints.find(x=>x.ticket_id===selectedTicket);
    if (c) c.status = status;
    renderTable(filter());
    updateStats();
  } else showToast('Failed to update','error');
});

// ── TRANSFER ─────────────────────────────────────────────────────
document.getElementById('transfer-btn')?.addEventListener('click', async () => {
  if (!selectedTicket) return showToast('Select a complaint first','error');
  const sel = document.getElementById('transfer-dept-select')?.value;
  if (!sel) return showToast('Select a department to transfer to','error');
  const [deptName, deptId] = sel.split('|');
  const btn = document.getElementById('transfer-btn');
  setLoading(btn, true, 'Transferring...');
  const r = await apiPost('/api/transfer', {
    ticket_id: selectedTicket,
    department: deptName,
    department_id: deptId,
    officer: sessionStorage.getItem('nivai_officer') || 'admin'
  });
  setLoading(btn, false);
  if (r.success) {
    showToast(`✅ Transferred to ${deptName}`, 'success');
    const c = allComplaints.find(x=>x.ticket_id===selectedTicket);
    if (c) { c.department = deptName; c.department_id = deptId; }
    document.getElementById('transfer-dept-select').value = '';
    loadClusters();
  } else {
    showToast(r.error || 'Transfer failed','error');
  }
});

// ── CLUSTERS ─────────────────────────────────────────────────────
async function loadClusters() {
  const tbody = document.getElementById('clusters-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">
    <div class="spinner spinner-dark" style="margin:0 auto 12px"></div><div>Analysing clusters...</div>
  </td></tr>`;

  const params = currentDept && currentDept !== 'admin' ? `?department=${currentDept}` : '';
  const r = await apiGet(`/api/clusters${params}`);

  if (!r.success) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted)">⚠️ Could not load clusters.</td></tr>`;
    return;
  }

  allClusters = r.data || [];
  const cEl = document.getElementById('stat-clusters');
  if (cEl) cEl.textContent = allClusters.length || '0';

  if (!allClusters.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:52px;color:var(--text-muted)">
      <div style="font-size:2.5rem;margin-bottom:12px">🟢</div>
      <div style="font-weight:600;margin-bottom:6px">No clustered complaints</div>
      <div style="font-size:0.82rem">Area clusters form when 2+ similar complaints come from the same pincode.</div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = allClusters.map((cl, i) => `
    <tr onclick="window._selectCluster(${i})" data-cluster="${i}">
      <td>
        <div style="font-weight:600;font-size:0.87rem">${cl.area}</div>
        <div style="font-family:monospace;font-size:0.72rem;color:var(--text-muted)">${cl.pincode}</div>
      </td>
      <td><span class="badge badge-neutral">${cl.category}</span></td>
      <td><span class="cluster-count-chip">${cl.complaint_count}</span></td>
      <td>
        <span class="escalation-chip ${cl.was_escalated ? 'was-escalated' : ''}">
          ${cl.was_escalated ? '⬆️ ' : ''}${cl.escalated_urgency}
          ${cl.was_escalated ? `<span style="font-size:.65rem;opacity:.8">(was ${cl.base_urgency})</span>` : ''}
        </span>
      </td>
      <td style="font-size:0.82rem">${cl.department}</td>
      <td style="font-size:0.78rem;color:var(--text-muted)">${timeAgo(cl.latest_timestamp)}</td>
    </tr>`).join('');
}

window._selectCluster = function(idx) {
  const cl = allClusters[idx];
  if (!cl) return;
  document.querySelectorAll('.cluster-table tr[data-cluster]').forEach(r=>r.classList.remove('selected'));
  document.querySelector(`.cluster-table tr[data-cluster="${idx}"]`)?.classList.add('selected');
  document.getElementById('cluster-detail-empty')?.classList.add('hidden');
  document.getElementById('cluster-detail')?.classList.remove('hidden');

  document.getElementById('cd-id').textContent       = cl.cluster_id;
  document.getElementById('cd-category').textContent = cl.category;
  document.getElementById('cd-area').textContent     = `📍 ${cl.area} · ${cl.pincode}`;
  document.getElementById('cd-count').textContent    = cl.complaint_count;
  document.getElementById('cd-summary').textContent  = cl.representative_summary || '—';

  const ub = document.getElementById('cd-urgency-badge');
  if (ub) { ub.textContent = cl.escalated_urgency; ub.className = 'badge ' + urgencyClass(cl.escalated_urgency); }

  const notice = document.getElementById('cd-escalated-notice');
  if (notice) {
    notice.classList.toggle('hidden', !cl.was_escalated);
    notice.textContent = cl.was_escalated
      ? `⬆️ Urgency escalated from ${cl.base_urgency} → ${cl.escalated_urgency} because ${cl.complaint_count} similar complaints came from this area`
      : '';
  }

  document.getElementById('cd-meta').innerHTML = `
    <strong>Department:</strong> ${cl.department}<br>
    <strong>Complaints in cluster:</strong> ${cl.complaint_count}<br>
    <strong>Latest activity:</strong> ${timeAgo(cl.latest_timestamp)}
  `;

  const tList = document.getElementById('cd-tickets');
  if (tList) {
    tList.innerHTML = cl.tickets.map(tid => `
      <div class="ticket-row">
        <span style="font-family:monospace;font-weight:600;color:var(--primary)">${tid}</span>
        <a onclick="window._jumpToComplaint('${tid}')">View complaint →</a>
      </div>`).join('') || '<div style="color:var(--text-muted);font-size:0.82rem">No tickets found</div>';
  }
};

window._jumpToComplaint = function(tid) {
  document.getElementById('view-complaints-btn')?.click();
  setTimeout(() => {
    const row = document.querySelector(`tr[data-ticket="${tid}"]`);
    if (row) { row.click(); row.scrollIntoView({ behavior:'smooth', block:'center' }); }
    else {
      showToast(`Ticket ${tid} — switch to All Complaints view to see it`, 'default');
    }
  }, 200);
};

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTable(filter());
  });
});

document.getElementById('filter-date')?.addEventListener('change', loadComplaints);
document.getElementById('refresh-btn')?.addEventListener('click', () => {
  loadComplaints();
  loadClusters();
  showToast('Refreshed','success');
});

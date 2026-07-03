const state = { search: '', urgency: '' };

const urgencyMeta = {
  expired:  { label: 'Expired',      color: 'var(--red)'   },
  urgent:   { label: '≤ 15 days',    color: 'var(--amber)' },
  upcoming: { label: '16–30 days',   color: '#3A5473'       },
  soon:     { label: '31–60 days',   color: 'var(--green)' },
  healthy:  { label: 'Healthy',      color: 'var(--slate)' },
};

const fmtMoney = (n) => '₹' + Number(n).toLocaleString('en-IN');
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

async function fetchStats() {
  const res = await fetch('/api/stats');
  const stats = await res.json();
  renderStats(stats);
}

function renderStats(s) {
  const el = document.getElementById('stats');
  el.innerHTML = `
    <div class="stat-card">
      <div class="label">Total policies</div>
      <div class="value">${s.total_policies}</div>
    </div>
    <div class="stat-card expired">
      <div class="label">Expired</div>
      <div class="value">${s.expired}</div>
    </div>
    <div class="stat-card urgent">
      <div class="label">Due in 15 days</div>
      <div class="value">${s.urgent}</div>
    </div>
    <div class="stat-card">
      <div class="label">Premium at risk</div>
      <div class="value">${fmtMoney(s.premium_at_risk)}</div>
    </div>
  `;
}

async function fetchPolicies() {
  const params = new URLSearchParams();
  if (state.search) params.set('search', state.search);
  if (state.urgency) params.set('urgency', state.urgency);
  const res = await fetch('/api/policies?' + params.toString());
  const rows = await res.json();
  renderRows(rows);
}

function runwayFill(p) {
  // Scale visual fill: 0 days or less = 0%, 90+ days = 100%
  const pct = Math.max(0, Math.min(100, (p.days_to_expiry / 90) * 100));
  return pct;
}

function renderRows(rows) {
  const tbody = document.getElementById('policyRows');
  const empty = document.getElementById('emptyState');

  if (rows.length === 0) {
    tbody.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  tbody.innerHTML = rows.map((p) => {
    const meta = urgencyMeta[p.urgency];
    const dayLabel = p.days_to_expiry < 0
      ? `${Math.abs(p.days_to_expiry)}d overdue`
      : `${p.days_to_expiry}d left`;

    return `
      <tr data-id="${p.id}">
        <td>
          <span class="client-name">${escapeHtml(p.client_name)}</span>
          ${p.client_phone ? `<span class="client-phone">${escapeHtml(p.client_phone)}</span>` : ''}
        </td>
        <td class="mono">${escapeHtml(p.policy_number)}</td>
        <td>${escapeHtml(p.insurer)}</td>
        <td>${escapeHtml(p.policy_type)}</td>
        <td class="mono">${fmtMoney(p.premium)}</td>
        <td class="mono">${fmtDate(p.expiry_date)}</td>
        <td class="runway-col">
          <div class="runway">
            <span class="badge badge-${p.urgency}">${meta.label}</span>
          </div>
          <div class="runway" style="margin-top:6px;">
            <div class="runway-track">
              <div class="runway-fill" style="width:${runwayFill(p)}%; background:${meta.color};"></div>
            </div>
            <span class="runway-label">${dayLabel}</span>
          </div>
        </td>
        <td></td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('tr').forEach((tr) => {
    tr.addEventListener('click', () => openEditModal(tr.dataset.id, rows));
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// ---------- modal handling ----------
const backdrop = document.getElementById('modalBackdrop');
const form = document.getElementById('policyForm');
const modalTitle = document.getElementById('modalTitle');
const deleteBtn = document.getElementById('deletePolicyBtn');

function openAddModal() {
  form.reset();
  document.getElementById('policyId').value = '';
  modalTitle.textContent = 'Add policy';
  deleteBtn.hidden = true;
  backdrop.hidden = false;
}

function openEditModal(id, rows) {
  const p = rows.find((r) => String(r.id) === String(id));
  if (!p) return;
  document.getElementById('policyId').value = p.id;
  document.getElementById('client_name').value = p.client_name;
  document.getElementById('client_phone').value = p.client_phone || '';
  document.getElementById('policy_number').value = p.policy_number;
  document.getElementById('insurer').value = p.insurer;
  document.getElementById('policy_type').value = p.policy_type;
  document.getElementById('premium').value = p.premium;
  document.getElementById('start_date').value = p.start_date;
  document.getElementById('expiry_date').value = p.expiry_date;
  document.getElementById('notes').value = p.notes || '';
  modalTitle.textContent = 'Edit policy';
  deleteBtn.hidden = false;
  backdrop.hidden = false;
}

function closeModal() {
  backdrop.hidden = true;
}

document.getElementById('openAddModal').addEventListener('click', openAddModal);
document.getElementById('closeModal').addEventListener('click', closeModal);
backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('policyId').value;
  const payload = {
    client_name: document.getElementById('client_name').value,
    client_phone: document.getElementById('client_phone').value,
    policy_number: document.getElementById('policy_number').value,
    insurer: document.getElementById('insurer').value,
    policy_type: document.getElementById('policy_type').value,
    premium: parseFloat(document.getElementById('premium').value),
    start_date: document.getElementById('start_date').value,
    expiry_date: document.getElementById('expiry_date').value,
    notes: document.getElementById('notes').value,
  };

  const url = id ? `/api/policies/${id}` : '/api/policies';
  const method = id ? 'PUT' : 'POST';

  await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  closeModal();
  refresh();
});

deleteBtn.addEventListener('click', async () => {
  const id = document.getElementById('policyId').value;
  if (!id) return;
  if (!confirm('Delete this policy? This cannot be undone.')) return;
  await fetch(`/api/policies/${id}`, { method: 'DELETE' });
  closeModal();
  refresh();
});

// ---------- filters ----------
document.getElementById('searchInput').addEventListener('input', (e) => {
  state.search = e.target.value;
  fetchPolicies();
});

document.getElementById('filterChips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
  chip.classList.add('active');
  state.urgency = chip.dataset.urgency;
  fetchPolicies();
});

function refresh() {
  fetchStats();
  fetchPolicies();
}

refresh();

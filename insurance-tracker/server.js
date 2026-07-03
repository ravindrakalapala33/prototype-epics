const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- helpers ----------
function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function urgencyBand(days) {
  if (days < 0) return 'expired';
  if (days <= 15) return 'urgent';
  if (days <= 30) return 'upcoming';
  if (days <= 60) return 'soon';
  return 'healthy';
}

function decoratePolicy(p) {
  const days = daysUntil(p.expiry_date);
  return { ...p, days_to_expiry: days, urgency: urgencyBand(days) };
}

// ---------- API ----------

// List policies, with optional search + urgency filter
app.get('/api/policies', (req, res) => {
  const { search, urgency } = req.query;
  let rows = db.prepare('SELECT * FROM policies').all();
  rows = rows.map(decoratePolicy);

  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(
      (p) =>
        p.client_name.toLowerCase().includes(q) ||
        p.policy_number.toLowerCase().includes(q) ||
        p.insurer.toLowerCase().includes(q)
    );
  }

  if (urgency) {
    rows = rows.filter((p) => p.urgency === urgency);
  }

  rows.sort((a, b) => a.days_to_expiry - b.days_to_expiry);
  res.json(rows);
});

// Dashboard stats
app.get('/api/stats', (req, res) => {
  const rows = db.prepare('SELECT * FROM policies').all().map(decoratePolicy);
  const stats = {
    total_policies: rows.length,
    expired: rows.filter((p) => p.urgency === 'expired').length,
    urgent: rows.filter((p) => p.urgency === 'urgent').length,
    upcoming: rows.filter((p) => p.urgency === 'upcoming').length,
    premium_at_risk: rows
      .filter((p) => p.urgency === 'expired' || p.urgency === 'urgent')
      .reduce((sum, p) => sum + p.premium, 0),
    total_premium: rows.reduce((sum, p) => sum + p.premium, 0),
  };
  res.json(stats);
});

// Get single policy
app.get('/api/policies/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM policies WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Policy not found' });
  res.json(decoratePolicy(row));
});

// Create policy
app.post('/api/policies', (req, res) => {
  const {
    client_name, client_phone, policy_number, insurer,
    policy_type, premium, start_date, expiry_date, notes,
  } = req.body;

  if (!client_name || !policy_number || !insurer || !policy_type || !premium || !start_date || !expiry_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const stmt = db.prepare(`
    INSERT INTO policies (client_name, client_phone, policy_number, insurer, policy_type, premium, start_date, expiry_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    client_name, client_phone || '', policy_number, insurer,
    policy_type, premium, start_date, expiry_date, notes || ''
  );

  const created = db.prepare('SELECT * FROM policies WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(decoratePolicy(created));
});

// Update policy
app.put('/api/policies/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM policies WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Policy not found' });

  const {
    client_name, client_phone, policy_number, insurer,
    policy_type, premium, start_date, expiry_date, notes,
  } = req.body;

  db.prepare(`
    UPDATE policies SET
      client_name = ?, client_phone = ?, policy_number = ?, insurer = ?,
      policy_type = ?, premium = ?, start_date = ?, expiry_date = ?, notes = ?
    WHERE id = ?
  `).run(
    client_name ?? existing.client_name,
    client_phone ?? existing.client_phone,
    policy_number ?? existing.policy_number,
    insurer ?? existing.insurer,
    policy_type ?? existing.policy_type,
    premium ?? existing.premium,
    start_date ?? existing.start_date,
    expiry_date ?? existing.expiry_date,
    notes ?? existing.notes,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM policies WHERE id = ?').get(req.params.id);
  res.json(decoratePolicy(updated));
});

// Delete policy
app.delete('/api/policies/:id', (req, res) => {
  const result = db.prepare('DELETE FROM policies WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Policy not found' });
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Insurance Policy Tracker running at http://localhost:${PORT}`);
});

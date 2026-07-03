const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'policies.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    policy_number TEXT NOT NULL,
    insurer TEXT NOT NULL,
    policy_type TEXT NOT NULL,
    premium REAL NOT NULL,
    start_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Seed with sample data on first run so the dashboard isn't empty
const countRow = db.prepare('SELECT COUNT(*) AS c FROM policies').get();
if (countRow.c === 0) {
  const insert = db.prepare(`
    INSERT INTO policies
      (client_name, client_phone, policy_number, insurer, policy_type, premium, start_date, expiry_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = new Date();
  const addDays = (d) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + d);
    return dt.toISOString().slice(0, 10);
  };
  const subYear = (dateStr) => {
    const dt = new Date(dateStr);
    dt.setFullYear(dt.getFullYear() - 1);
    return dt.toISOString().slice(0, 10);
  };

  const seed = [
    ['Ravi Kumar', '9876500001', 'HLT-2291-A', 'Star Health', 'Health', 18500, null, addDays(-6), 'Family floater, 4 members'],
    ['Priya Nair', '9876500002', 'MTR-7734-B', 'ICICI Lombard', 'Motor', 6200, null, addDays(3), 'Comprehensive, Honda City'],
    ['Aditya Verma', '9876500003', 'LIF-1182-C', 'LIC', 'Life Term', 24000, null, addDays(11), '1 Cr sum assured'],
    ['Sunita Rao', '9876500004', 'HLT-5567-D', 'HDFC Ergo', 'Health', 15200, null, addDays(22), 'Senior citizen plan'],
    ['Manoj Gupta', '9876500005', 'MTR-9021-E', 'Bajaj Allianz', 'Motor', 4800, null, addDays(47), 'Two-wheeler'],
    ['Kavita Iyer', '9876500006', 'HOM-3345-F', 'Tata AIG', 'Home', 9800, null, addDays(75), 'Structure + contents'],
    ['Deepak Shah', '9876500007', 'LIF-6612-G', 'SBI Life', 'Life Term', 31000, null, addDays(120), '75L sum assured'],
    ['Anjali Menon', '9876500008', 'HLT-8890-H', 'Star Health', 'Health', 21000, null, addDays(-30), 'Lapsed - needs urgent renewal'],
    ['Rajesh Pillai', '9876500009', 'MTR-4456-I', 'New India Assurance', 'Motor', 5600, null, addDays(9), 'Commercial vehicle'],
    ['Meera Krishnan', '9876500010', 'HLT-2298-J', 'Care Health', 'Health', 17800, null, addDays(58), 'Individual plan'],
  ];

  for (const row of seed) {
    const [client_name, client_phone, policy_number, insurer, policy_type, premium, , expiry_date, notes] = row;
    insert.run(client_name, client_phone, policy_number, insurer, policy_type, premium, subYear(expiry_date), expiry_date, notes);
  }
}

module.exports = db;

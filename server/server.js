const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helpers
function getMonthRange(monthKey) {
  // monthKey format: YYYY-MM
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // JS months 0-based
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0)); // last day of month

  const toISO = (d) => d.toISOString().slice(0, 10);
  return { startDate: toISO(start), endDate: toISO(end) };
}

// Customers
app.get('/api/customers', (req, res) => {
  const customers = db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all();
  res.json(customers);
});

app.post('/api/customers', (req, res) => {
  const { name, email, phone, company } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const stmt = db.prepare('INSERT INTO customers (name, email, phone, company) VALUES (?, ?, ?, ?)');
  const info = stmt.run(name, email || null, phone || null, company || null);
  const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

// Invoices
app.get('/api/invoices', (req, res) => {
  const { month } = req.query;
  let rows;
  if (month) {
    const { startDate, endDate } = getMonthRange(month);
    rows = db.prepare('SELECT * FROM invoices WHERE date BETWEEN ? AND ? ORDER BY date DESC').all(startDate, endDate);
  } else {
    rows = db.prepare('SELECT * FROM invoices ORDER BY date DESC').all();
  }
  res.json(rows);
});

app.post('/api/invoices', (req, res) => {
  const { customerId, date, dueDate, total, paid, notes } = req.body;
  if (!customerId || !date || typeof total !== 'number') {
    return res.status(400).json({ error: 'customerId, date and total are required' });
  }
  const stmt = db.prepare('INSERT INTO invoices (customer_id, date, due_date, total, paid, notes) VALUES (?, ?, ?, ?, ?, ?)');
  const info = stmt.run(customerId, date, dueDate || null, total, paid ? 1 : 0, notes || null);
  const created = db.prepare('SELECT * FROM invoices WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

app.patch('/api/invoices/:id', (req, res) => {
  const id = Number(req.params.id);
  const { paid } = req.body;
  if (typeof paid !== 'boolean') return res.status(400).json({ error: 'paid must be boolean' });
  db.prepare('UPDATE invoices SET paid = ? WHERE id = ?').run(paid ? 1 : 0, id);
  const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  res.json(updated);
});

// Expenses
app.get('/api/expenses', (req, res) => {
  const { month } = req.query;
  let rows;
  if (month) {
    const { startDate, endDate } = getMonthRange(month);
    rows = db.prepare('SELECT * FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date DESC').all(startDate, endDate);
  } else {
    rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC').all();
  }
  res.json(rows);
});

app.post('/api/expenses', (req, res) => {
  const { date, category, description, amount } = req.body;
  if (!date || typeof amount !== 'number') {
    return res.status(400).json({ error: 'date and amount are required' });
  }
  const stmt = db.prepare('INSERT INTO expenses (date, category, description, amount) VALUES (?, ?, ?, ?)');
  const info = stmt.run(date, category || null, description || null, amount);
  const created = db.prepare('SELECT * FROM expenses WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

// Dashboard aggregates
app.get('/api/dashboard', (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'month query param required as YYYY-MM' });
  const { startDate, endDate } = getMonthRange(month);

  const invoiceTotal = db.prepare('SELECT IFNULL(SUM(total),0) as total FROM invoices WHERE date BETWEEN ? AND ?').get(startDate, endDate).total;
  const invoicePaid = db.prepare('SELECT IFNULL(SUM(total),0) as total FROM invoices WHERE date BETWEEN ? AND ? AND paid = 1').get(startDate, endDate).total;
  const invoiceUnpaid = invoiceTotal - invoicePaid;
  const expenseTotal = db.prepare('SELECT IFNULL(SUM(amount),0) as total FROM expenses WHERE date BETWEEN ? AND ?').get(startDate, endDate).total;

  const counts = db.prepare(`SELECT 
    SUM(1) as count,
    SUM(CASE WHEN paid = 1 THEN 1 ELSE 0 END) as paidCount,
    SUM(CASE WHEN paid = 0 THEN 1 ELSE 0 END) as unpaidCount
    FROM invoices WHERE date BETWEEN ? AND ?
  `).get(startDate, endDate);

  const top3Expenses = db.prepare('SELECT category as label, IFNULL(SUM(amount),0) as amount FROM expenses WHERE date BETWEEN ? AND ? GROUP BY category ORDER BY amount DESC LIMIT 3').all(startDate, endDate);

  res.json({
    period: { month, startDate, endDate },
    invoices: {
      total: invoiceTotal,
      paidTotal: invoicePaid,
      unpaidTotal: invoiceUnpaid,
      count: counts.count || 0,
      paidCount: counts.paidCount || 0,
      unpaidCount: counts.unpaidCount || 0,
    },
    expenses: {
      total: expenseTotal,
      top3: top3Expenses,
    },
    profitLoss: invoiceTotal - expenseTotal,
  });
});

app.listen(PORT, () => {
  console.log(`Invoice Manager API running on http://localhost:${PORT}`);
});


const Database = require('better-sqlite3');
const path = require('path');

const dbFilePath = path.join(__dirname, 'data.db');

// Initialize database connection
const db = new Database(dbFilePath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables if they do not exist
db.prepare(`
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  due_date TEXT,
  total REAL NOT NULL,
  paid INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  category TEXT,
  description TEXT,
  amount REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
`).run();

module.exports = db;


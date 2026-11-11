const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new Database(path.join(__dirname, 'database.sqlite'));
db.pragma('journal_mode = WAL');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      tour TEXT NOT NULL,
      preferred_date TEXT,
      travellers INTEGER NOT NULL DEFAULT 1,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Unread',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const adminCount = db.prepare('SELECT COUNT(*) AS count FROM admin_users').get().count;

  if (adminCount === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const email = process.env.ADMIN_EMAIL || 'admin@bladna.tn';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(password, 10);

    db.prepare(
      'INSERT INTO admin_users (username, email, password_hash) VALUES (?, ?, ?)'
    ).run(username, email, hash);
  }
}

function getAdminUserByUsernameOrEmail(value) {
  return db.prepare(
    'SELECT * FROM admin_users WHERE username = ? OR email = ?'
  ).get(value, value);
}

function getDashboardSummary() {
  const totalReservations = db.prepare('SELECT COUNT(*) AS total FROM reservations').get().total;
  const newRequests = db.prepare("SELECT COUNT(*) AS total FROM requests WHERE status IN ('Unread', 'New')").get().total;
  const pendingReservations = db.prepare("SELECT COUNT(*) AS total FROM reservations WHERE status = 'Pending'").get().total;
  const confirmedReservations = db.prepare("SELECT COUNT(*) AS total FROM reservations WHERE status = 'Confirmed'").get().total;
  const cancelledReservations = db.prepare("SELECT COUNT(*) AS total FROM reservations WHERE status = 'Cancelled'").get().total;

  const recentReservations = db.prepare(`
    SELECT * FROM reservations
    ORDER BY created_at DESC
    LIMIT 5
  `).all();

  const recentRequests = db.prepare(`
    SELECT * FROM requests
    ORDER BY created_at DESC
    LIMIT 5
  `).all();

  return {
    totalReservations,
    newRequests,
    pendingReservations,
    confirmedReservations,
    cancelledReservations,
    recentReservations,
    recentRequests
  };
}

function listReservations() {
  return db.prepare('SELECT * FROM reservations ORDER BY created_at DESC').all();
}

function createReservation(data) {
  const stmt = db.prepare(`
    INSERT INTO reservations (name, email, phone, tour, preferred_date, travellers, message, status)
    VALUES (@name, @email, @phone, @tour, @preferredDate, @travellers, @message, @status)
  `);

  const result = stmt.run({
    name: data.name,
    email: data.email,
    phone: data.phone || '',
    tour: data.tour,
    preferredDate: data.preferredDate || '',
    travellers: Number(data.travellers || 1),
    message: data.message || '',
    status: data.status || 'Pending'
  });

  return db.prepare('SELECT * FROM reservations WHERE id = ?').get(result.lastInsertRowid);
}

function updateReservationStatus(id, status) {
  db.prepare(`
    UPDATE reservations
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, id);

  return db.prepare('SELECT * FROM reservations WHERE id = ?').get(id);
}

function deleteReservation(id) {
  const info = db.prepare('DELETE FROM reservations WHERE id = ?').run(id);
  return info.changes > 0;
}

function listRequests() {
  return db.prepare('SELECT * FROM requests ORDER BY created_at DESC').all();
}

function createRequest(data) {
  const stmt = db.prepare(`
    INSERT INTO requests (name, email, subject, message, status)
    VALUES (@name, @email, @subject, @message, @status)
  `);

  const result = stmt.run({
    name: data.name,
    email: data.email,
    subject: data.subject,
    message: data.message,
    status: data.status || 'Unread'
  });

  return db.prepare('SELECT * FROM requests WHERE id = ?').get(result.lastInsertRowid);
}

function updateRequestStatus(id, status) {
  db.prepare(`
    UPDATE requests
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, id);

  return db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
}

function deleteRequest(id) {
  const info = db.prepare('DELETE FROM requests WHERE id = ?').run(id);
  return info.changes > 0;
}

module.exports = {
  db,
  initializeDatabase,
  getAdminUserByUsernameOrEmail,
  getDashboardSummary,
  listReservations,
  createReservation,
  updateReservationStatus,
  deleteReservation,
  listRequests,
  createRequest,
  updateRequestStatus,
  deleteRequest
};

initializeDatabase();

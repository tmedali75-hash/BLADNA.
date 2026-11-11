const express = require('express');
const session = require('express-session');
const path = require('path');
const {
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
} = require('./db');

const app = express();
const port = process.env.PORT || 3000;

initializeDatabase();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'bladna-admin-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false
    }
  })
);

app.use(express.static(path.join(__dirname)));

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please log in first.' });
  }
  next();
}

function requireAdminPage(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/admin/login');
  }
  next();
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  if (req.session.user) {
    return res.redirect('/admin/dashboard');
  }
  res.redirect('/admin/login');
});

app.get('/admin/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/admin/dashboard');
  }
  res.sendFile(path.join(__dirname, 'admin-login.html'));
});

app.get('/admin/dashboard', requireAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

app.post('/api/admin/login', (req, res) => {
  const raw = req.body || {};
  const identifier = String(raw.usernameOrEmail || '').trim();
  const password = String(raw.password || '');

  if (!identifier || !password) {
    return res.status(400).json({ success: false, message: 'Username/email and password are required.' });
  }

  const adminUser = getAdminUserByUsernameOrEmail(identifier);

  if (!adminUser || !require('bcryptjs').compareSync(password, adminUser.password_hash)) {
    return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
  }

  req.session.user = {
    id: adminUser.id,
    username: adminUser.username,
    email: adminUser.email
  };

  return res.json({
    success: true,
    message: 'Login successful.',
    user: req.session.user
  });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: 'Logged out successfully.' });
  });
});

app.get('/api/admin/me', (req, res) => {
  res.json({
    authenticated: !!req.session.user,
    user: req.session.user || null
  });
});

app.get('/api/dashboard/summary', requireAdmin, (req, res) => {
  res.json(getDashboardSummary());
});

app.get('/api/reservations', requireAdmin, (req, res) => {
  res.json(listReservations());
});

app.post('/api/reservations', (req, res) => {
  const data = req.body || {};

  const required = ['name', 'email', 'tour'];
  const missing = required.filter((field) => !String(data[field] || '').trim());

  if (missing.length) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missing.join(', ')}`
    });
  }

  const reservation = createReservation({
    name: String(data.name).trim(),
    email: String(data.email).trim(),
    phone: String(data.phone || '').trim(),
    tour: String(data.tour).trim(),
    preferredDate: String(data.preferredDate || '').trim(),
    travellers: Number(data.travellers || 1),
    message: String(data.message || '').trim(),
    status: 'Pending'
  });

  return res.status(201).json({
    success: true,
    message: 'Reservation submitted successfully.',
    reservation
  });
});

app.patch('/api/reservations/:id/status', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || '').trim();

  if (!['Pending', 'Confirmed', 'Cancelled'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  const updated = updateReservationStatus(id, status);
  return res.json({ success: true, reservation: updated });
});

app.delete('/api/reservations/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const deleted = deleteReservation(id);
  return res.json({ success: deleted, message: deleted ? 'Reservation deleted.' : 'Reservation not found.' });
});

app.get('/api/requests', requireAdmin, (req, res) => {
  res.json(listRequests());
});

app.post('/api/requests', (req, res) => {
  const data = req.body || {};

  const required = ['name', 'email', 'subject', 'message'];
  const missing = required.filter((field) => !String(data[field] || '').trim());

  if (missing.length) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missing.join(', ')}`
    });
  }

  const request = createRequest({
    name: String(data.name).trim(),
    email: String(data.email).trim(),
    subject: String(data.subject).trim(),
    message: String(data.message).trim(),
    status: 'Unread'
  });

  return res.status(201).json({
    success: true,
    message: 'Inquiry sent successfully.',
    request
  });
});

app.patch('/api/requests/:id/status', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || '').trim();

  if (!['Unread', 'Read', 'Replied'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  const updated = updateRequestStatus(id, status);
  return res.json({ success: true, request: updated });
});

app.delete('/api/requests/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const deleted = deleteRequest(id);
  return res.json({ success: deleted, message: deleted ? 'Request deleted.' : 'Request not found.' });
});

app.listen(port, () => {
  console.log(`BLADNA admin dashboard running at http://localhost:${port}`);
});

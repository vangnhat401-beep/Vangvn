const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
  console.error('Set ADMIN_PASSWORD to a strong password of at least 12 characters.');
  process.exit(1);
}
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  console.error('Set SESSION_SECRET to a random secret of at least 32 characters.');
  process.exit(1);
}
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'points.db'));
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);
const count = db.prepare('SELECT COUNT(*) AS n FROM students').get().n;
if (!count) {
  const add = db.prepare('INSERT INTO students(name, points) VALUES (?, ?)');
  const seed = db.transaction(() => {
    add.run('Nguyễn Văn A', 1);
    add.run('Nguyễn Văn B', -10);
  });
  seed();
}
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '20kb' }));
app.use(session({
  name: 'diem_admin',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 }
}));
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });
const requireAdmin = (req, res, next) => req.session && req.session.isAdmin ? next() : res.status(401).json({ error: 'Chỉ quản trị viên mới được chỉnh sửa.' });
app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/students', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ students: db.prepare('SELECT id, name, points FROM students ORDER BY name COLLATE NOCASE').all(), isAdmin: !!req.session.isAdmin });
});
app.post('/api/login', loginLimiter, (req, res) => {
  const password = String(req.body?.password || '');
  if (password.length > 300 || password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Mật khẩu quản trị không đúng.' });
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: 'Không thể tạo phiên đăng nhập.' });
    req.session.isAdmin = true;
    res.json({ ok: true });
  });
});
app.post('/api/logout', (req, res) => req.session.destroy(() => {
  res.clearCookie('diem_admin', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  res.json({ ok: true });
}));
app.post('/api/students', requireAdmin, (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name || name.length > 100) return res.status(400).json({ error: 'Tên phải từ 1 đến 100 ký tự.' });
  const result = db.prepare('INSERT INTO students(name, points) VALUES (?, 0)').run(name);
  res.json({ id: Number(result.lastInsertRowid), name, points: 0 });
});
app.patch('/api/students/:id/points', requireAdmin, (req, res) => {
  const id = Number(req.params.id), delta = Number(req.body?.delta);
  if (!Number.isInteger(id) || ![-1, 1].includes(delta)) return res.status(400).json({ error: 'Thao tác không hợp lệ.' });
  const result = db.prepare('UPDATE students SET points = points + ? WHERE id = ?').run(delta, id);
  if (!result.changes) return res.status(404).json({ error: 'Không tìm thấy học sinh.' });
  res.json(db.prepare('SELECT id, name, points FROM students WHERE id = ?').get(id));
});
app.patch('/api/students/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id), name = String(req.body?.name || '').trim();
  if (!Number.isInteger(id) || !name || name.length > 100) return res.status(400).json({ error: 'Tên không hợp lệ.' });
  const result = db.prepare('UPDATE students SET name = ? WHERE id = ?').run(name, id);
  if (!result.changes) return res.status(404).json({ error: 'Không tìm thấy học sinh.' });
  res.json(db.prepare('SELECT id, name, points FROM students WHERE id = ?').get(id));
});
app.delete('/api/students/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM students WHERE id = ?').run(Number(req.params.id));
  if (!result.changes) return res.status(404).json({ error: 'Không tìm thấy học sinh.' });
  res.json({ ok: true });
});
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`Diem Cong Tru app running on port ${PORT}`));

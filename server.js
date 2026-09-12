import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { readDB, writeDB } from './db.js';
import {
  layout,
  signupPage,
  loginPage,
  dashboardPage,
  scanScreen,
  notFoundScreen,
} from './views.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'cambia-este-secreto-en-produccion',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

function requireAuth(req, res, next) {
  if (!req.session.businessId) return res.redirect('/login');
  next();
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 30) || 'tarjeta';
}

function currentBusiness(req, db) {
  return db.businesses.find((b) => b.id === req.session.businessId);
}

// ---------- Home ----------
app.get('/', (req, res) => {
  res.redirect(req.session.businessId ? '/dashboard' : '/login');
});

// ---------- Signup ----------
app.get('/signup', (req, res) => {
  if (req.session.businessId) return res.redirect('/dashboard');
  res.send(layout('Crear cuenta', signupPage()));
});

app.post('/signup', (req, res) => {
  const businessName = (req.body.businessName || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  if (!businessName || !email || password.length < 6) {
    return res.send(layout('Crear cuenta', signupPage('Revisa los datos: la contraseña necesita al menos 6 caracteres.')));
  }

  const db = readDB();
  if (db.businesses.some((b) => b.email === email)) {
    return res.send(layout('Crear cuenta', signupPage('Ya existe una cuenta con ese email.')));
  }

  const business = {
    id: crypto.randomUUID(),
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    name: businessName,
    createdAt: new Date().toISOString(),
  };
  db.businesses.push(business);
  writeDB(db);

  req.session.businessId = business.id;
  res.redirect('/dashboard');
});

// ---------- Login ----------
app.get('/login', (req, res) => {
  if (req.session.businessId) return res.redirect('/dashboard');
  res.send(layout('Iniciar sesión', loginPage()));
});

app.post('/login', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const db = readDB();
  const business = db.businesses.find((b) => b.email === email);

  if (!business || !bcrypt.compareSync(password, business.passwordHash)) {
    return res.send(layout('Iniciar sesión', loginPage('Email o contraseña incorrectos.')));
  }

  req.session.businessId = business.id;
  res.redirect('/dashboard');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ---------- Dashboard ----------
app.get('/dashboard', requireAuth, (req, res) => {
  const db = readDB();
  const business = currentBusiness(req, db);
  if (!business) {
    req.session.destroy(() => res.redirect('/login'));
    return;
  }

  const cards = db.cards.filter((c) => c.businessId === business.id);
  const cardIds = new Set(cards.map((c) => c.id));

  const scansByCard = {};
  const lastScanByCard = {};
  let total = 0;
  for (const scan of db.scans) {
    if (!cardIds.has(scan.cardId)) continue;
    total += 1;
    scansByCard[scan.cardId] = (scansByCard[scan.cardId] || 0) + 1;
    if (!lastScanByCard[scan.cardId] || scan.at > lastScanByCard[scan.cardId]) {
      lastScanByCard[scan.cardId] = scan.at;
    }
  }

  const topCard = cards.slice().sort((a, b) => (scansByCard[b.id] || 0) - (scansByCard[a.id] || 0))[0];
  const origin = `${req.protocol}://${req.get('host')}`;

  res.send(
    layout(
      business.name,
      dashboardPage({ business, cards, scansByCard, lastScanByCard, total, topCard, origin })
    )
  );
});

// ---------- Cards ----------
app.post('/cards', requireAuth, (req, res) => {
  const name = (req.body.name || '').trim();
  const destination = (req.body.destination || '').trim();

  if (!name || !destination) return res.redirect('/dashboard');

  const db = readDB();
  let id = slugify(name);
  while (db.cards.some((c) => c.id === id)) {
    id = `${slugify(name)}-${crypto.randomBytes(2).toString('hex')}`;
  }

  db.cards.push({
    id,
    businessId: req.session.businessId,
    name,
    destination,
    createdAt: new Date().toISOString(),
  });
  writeDB(db);
  res.redirect('/dashboard');
});

app.post('/cards/:id/update', requireAuth, (req, res) => {
  const db = readDB();
  const card = db.cards.find((c) => c.id === req.params.id && c.businessId === req.session.businessId);
  if (card && req.body.destination) {
    card.destination = req.body.destination.trim();
    writeDB(db);
  }
  res.redirect('/dashboard');
});

app.post('/cards/:id/delete', requireAuth, (req, res) => {
  const db = readDB();
  db.cards = db.cards.filter((c) => !(c.id === req.params.id && c.businessId === req.session.businessId));
  writeDB(db);
  res.redirect('/dashboard');
});

// ---------- Endpoint público de escaneo (esto es lo que se graba en la NFC) ----------
app.get('/t/:id', (req, res) => {
  const db = readDB();
  const card = db.cards.find((c) => c.id === req.params.id);

  if (!card) {
    return res.status(404).send(layout('Tarjeta no encontrada', notFoundScreen(), { bare: true }));
  }

  db.scans.push({ cardId: card.id, at: new Date().toISOString() });
  writeDB(db);

  const business = db.businesses.find((b) => b.id === card.businessId);
  res.send(
    layout(
      'Un momento…',
      scanScreen({ businessName: business?.name, destination: card.destination }),
      { bare: true }
    )
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Tapflow NFC escuchando en http://localhost:${PORT}`);
});

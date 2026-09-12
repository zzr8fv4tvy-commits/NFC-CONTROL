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
  globalDashboardPage,
  locationDashboardPage,
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
  if (!req.session.ownerId) return res.redirect('/login');
  next();
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 30) || 'tarjeta';
}

function currentOwner(req, db) {
  return db.owners.find((o) => o.id === req.session.ownerId);
}

function ownedLocation(req, db) {
  return db.locations.find((l) => l.id === req.params.id && l.ownerId === req.session.ownerId);
}

function todayLabel(date = new Date()) {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ---------- Home ----------
app.get('/', (req, res) => {
  res.redirect(req.session.ownerId ? '/dashboard' : '/login');
});

// ---------- Signup ----------
app.get('/signup', (req, res) => {
  if (req.session.ownerId) return res.redirect('/dashboard');
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
  if (db.owners.some((o) => o.email === email)) {
    return res.send(layout('Crear cuenta', signupPage('Ya existe una cuenta con ese email.')));
  }

  const owner = {
    id: crypto.randomUUID(),
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString(),
  };
  db.owners.push(owner);

  const location = {
    id: crypto.randomUUID(),
    ownerId: owner.id,
    name: businessName,
    createdAt: new Date().toISOString(),
  };
  db.locations.push(location);

  writeDB(db);

  req.session.ownerId = owner.id;
  res.redirect('/dashboard');
});

// ---------- Login ----------
app.get('/login', (req, res) => {
  if (req.session.ownerId) return res.redirect('/dashboard');
  res.send(layout('Iniciar sesión', loginPage()));
});

app.post('/login', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const db = readDB();
  const owner = db.owners.find((o) => o.email === email);

  if (!owner || !bcrypt.compareSync(password, owner.passwordHash)) {
    return res.send(layout('Iniciar sesión', loginPage('Email o contraseña incorrectos.')));
  }

  req.session.ownerId = owner.id;
  res.redirect('/dashboard');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ---------- Panel global (todos los negocios de la cuenta) ----------
app.get('/dashboard', requireAuth, (req, res) => {
  const db = readDB();
  const owner = currentOwner(req, db);
  if (!owner) {
    req.session.destroy(() => res.redirect('/login'));
    return;
  }

  const locations = db.locations.filter((l) => l.ownerId === owner.id);
  const locationIds = new Set(locations.map((l) => l.id));
  const cards = db.cards.filter((c) => locationIds.has(c.locationId));
  const cardIds = new Set(cards.map((c) => c.id));
  const cardToLocation = new Map(cards.map((c) => [c.id, c.locationId]));

  const cardsByLocation = {};
  for (const c of cards) cardsByLocation[c.locationId] = (cardsByLocation[c.locationId] || 0) + 1;

  const scansByLocation = {};
  let totalScans = 0;
  let scansToday = 0;
  const todayStr = new Date().toDateString();
  for (const scan of db.scans) {
    if (!cardIds.has(scan.cardId)) continue;
    totalScans += 1;
    const locId = cardToLocation.get(scan.cardId);
    scansByLocation[locId] = (scansByLocation[locId] || 0) + 1;
    if (new Date(scan.at).toDateString() === todayStr) scansToday += 1;
  }

  const locationSummaries = locations
    .map((l) => ({
      id: l.id,
      name: l.name,
      cardCount: cardsByLocation[l.id] || 0,
      scanCount: scansByLocation[l.id] || 0,
    }))
    .sort((a, b) => b.scanCount - a.scanCount);

  res.send(
    layout(
      'Tus negocios',
      globalDashboardPage({
        owner,
        locations: locationSummaries,
        totalLocations: locations.length,
        totalCards: cards.length,
        totalScans,
        scansToday,
        today: todayLabel(),
      })
    )
  );
});

app.post('/locations', requireAuth, (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.redirect('/dashboard');

  const db = readDB();
  const location = {
    id: crypto.randomUUID(),
    ownerId: req.session.ownerId,
    name,
    createdAt: new Date().toISOString(),
  };
  db.locations.push(location);
  writeDB(db);
  res.redirect(`/l/${location.id}`);
});

// ---------- Panel de un negocio concreto ----------
app.get('/l/:id', requireAuth, (req, res) => {
  const db = readDB();
  const location = ownedLocation(req, db);
  if (!location) return res.redirect('/dashboard');

  const owner = currentOwner(req, db);
  const cards = db.cards.filter((c) => c.locationId === location.id);
  const cardIds = new Set(cards.map((c) => c.id));

  const scansByCard = {};
  const lastScanByCard = {};
  let total = 0;
  let scansToday = 0;
  const todayStr = new Date().toDateString();
  for (const scan of db.scans) {
    if (!cardIds.has(scan.cardId)) continue;
    total += 1;
    scansByCard[scan.cardId] = (scansByCard[scan.cardId] || 0) + 1;
    if (!lastScanByCard[scan.cardId] || scan.at > lastScanByCard[scan.cardId]) {
      lastScanByCard[scan.cardId] = scan.at;
    }
    if (new Date(scan.at).toDateString() === todayStr) scansToday += 1;
  }

  const topCard = cards.slice().sort((a, b) => (scansByCard[b.id] || 0) - (scansByCard[a.id] || 0))[0];
  const origin = `${req.protocol}://${req.get('host')}`;

  res.send(
    layout(
      location.name,
      locationDashboardPage({
        location,
        ownerEmail: owner?.email,
        cards,
        scansByCard,
        lastScanByCard,
        total,
        scansToday,
        topCard,
        origin,
        today: todayLabel(),
      })
    )
  );
});

app.post('/l/:id/cards', requireAuth, (req, res) => {
  const db = readDB();
  const location = ownedLocation(req, db);
  if (!location) return res.redirect('/dashboard');

  const name = (req.body.name || '').trim();
  const destination = (req.body.destination || '').trim();
  if (!name || !destination) return res.redirect(`/l/${location.id}`);

  let id = slugify(name);
  while (db.cards.some((c) => c.id === id)) {
    id = `${slugify(name)}-${crypto.randomBytes(2).toString('hex')}`;
  }

  db.cards.push({
    id,
    locationId: location.id,
    name,
    destination,
    createdAt: new Date().toISOString(),
  });
  writeDB(db);
  res.redirect(`/l/${location.id}`);
});

app.post('/l/:id/cards/:cardId/update', requireAuth, (req, res) => {
  const db = readDB();
  const location = ownedLocation(req, db);
  if (!location) return res.redirect('/dashboard');

  const card = db.cards.find((c) => c.id === req.params.cardId && c.locationId === location.id);
  if (card && req.body.destination) {
    card.destination = req.body.destination.trim();
    writeDB(db);
  }
  res.redirect(`/l/${location.id}`);
});

app.post('/l/:id/cards/:cardId/delete', requireAuth, (req, res) => {
  const db = readDB();
  const location = ownedLocation(req, db);
  if (!location) return res.redirect('/dashboard');

  db.cards = db.cards.filter((c) => !(c.id === req.params.cardId && c.locationId === location.id));
  writeDB(db);
  res.redirect(`/l/${location.id}`);
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

  const location = db.locations.find((l) => l.id === card.locationId);
  res.send(
    layout(
      'Un momento…',
      scanScreen({ businessName: location?.name, destination: card.destination }),
      { bare: true }
    )
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Tapflow NFC escuchando en http://localhost:${PORT}`);
});

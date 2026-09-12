import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { readDB, writeDB } from './db.js';
import { sendPasswordResetEmail } from './email.js';
import {
  layout,
  signupPage,
  loginPage,
  forgotPasswordPage,
  resetPasswordPage,
  globalDashboardPage,
  locationDashboardPage,
  editLinksPage,
  scanScreen,
  landingScreen,
  pausedScreen,
  notFoundScreen,
} from './views.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

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
  if (!req.session.ownerId && !req.session.employeeId) return res.redirect('/login');
  next();
}

function requireOwner(req, res, next) {
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

function currentEmployee(req, db) {
  return db.employees.find((e) => e.id === req.session.employeeId);
}

// Devuelve el location al que el usuario logueado (owner o employee) tiene acceso, o null.
function accessibleLocation(req, db) {
  const location = db.locations.find((l) => l.id === req.params.id);
  if (!location) return null;
  if (req.session.ownerId && location.ownerId === req.session.ownerId) return location;
  if (req.session.employeeId) {
    const emp = currentEmployee(req, db);
    if (emp && emp.locationId === location.id) return location;
  }
  return null;
}

function isOwnerOfLocation(req, location) {
  return Boolean(req.session.ownerId && location.ownerId === req.session.ownerId);
}

// A dónde mandar a alguien logueado cuando la ubicación pedida no es accesible.
function homeRedirectPath(req, db) {
  if (req.session.ownerId) return '/dashboard';
  if (req.session.employeeId) {
    const emp = currentEmployee(req, db);
    if (emp) return `/l/${emp.locationId}`;
  }
  return '/login';
}

function todayLabel(date = new Date()) {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Serie de escaneos por día (últimos `days` días, incluido hoy) para un conjunto de cardIds.
function scansByDaySeries(scans, cardIds, days = 14) {
  const buckets = [];
  const keyOf = (d) => d.toISOString().slice(0, 10);
  const now = new Date();
  const counts = {};

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = keyOf(d);
    counts[key] = 0;
    buckets.push({
      key,
      label: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    });
  }

  for (const scan of scans) {
    if (!cardIds.has(scan.cardId)) continue;
    const key = new Date(scan.at).toISOString().slice(0, 10);
    if (key in counts) counts[key] += 1;
  }

  return buckets.map((b) => ({ label: b.label, count: counts[b.key] }));
}

function parseLinks(body) {
  const labels = [].concat(body.linkLabel || []);
  const urls = [].concat(body.linkUrl || []);
  const links = [];
  for (let i = 0; i < urls.length; i++) {
    const url = (urls[i] || '').trim();
    if (!url) continue;
    links.push({ label: (labels[i] || '').trim(), url });
  }
  return links;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ---------- Home ----------
app.get('/', (req, res) => {
  if (req.session.ownerId) return res.redirect('/dashboard');
  if (req.session.employeeId) {
    const db = readDB();
    const emp = currentEmployee(req, db);
    if (emp) return res.redirect(`/l/${emp.locationId}`);
  }
  res.redirect('/login');
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
  if (db.owners.some((o) => o.email === email) || db.employees.some((e) => e.email === email)) {
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
    logo: null,
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
  const notice = req.query.reset === '1' ? 'Contraseña actualizada. Ya puedes iniciar sesión.' : null;
  res.send(layout('Iniciar sesión', loginPage(null, notice)));
});

app.post('/login', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const db = readDB();

  const owner = db.owners.find((o) => o.email === email);
  if (owner && bcrypt.compareSync(password, owner.passwordHash)) {
    req.session.ownerId = owner.id;
    return res.redirect('/dashboard');
  }

  const employee = db.employees.find((e) => e.email === email);
  if (employee && bcrypt.compareSync(password, employee.passwordHash)) {
    req.session.employeeId = employee.id;
    return res.redirect(`/l/${employee.locationId}`);
  }

  return res.send(layout('Iniciar sesión', loginPage('Email o contraseña incorrectos.')));
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ---------- Recuperación de contraseña ----------
app.get('/forgot-password', (req, res) => {
  res.send(layout('Recuperar contraseña', forgotPasswordPage()));
});

app.post('/forgot-password', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) {
    return res.send(layout('Recuperar contraseña', forgotPasswordPage({ error: 'Introduce un email.' })));
  }

  const db = readDB();
  const owner = db.owners.find((o) => o.email === email);

  if (owner) {
    const token = crypto.randomBytes(24).toString('hex');
    db.resetTokens = db.resetTokens.filter((t) => t.ownerId !== owner.id); // invalida tokens previos
    db.resetTokens.push({
      token,
      ownerId: owner.id,
      expiresAt: Date.now() + 1000 * 60 * 60, // 1 hora
      used: false,
      createdAt: new Date().toISOString(),
    });
    await writeDB(db);

    const origin = `${req.protocol}://${req.get('host')}`;
    sendPasswordResetEmail({ to: owner.email, resetUrl: `${origin}/reset-password/${token}` }).catch(() => {});
  }

  // Mensaje genérico siempre, exista o no la cuenta.
  res.send(layout('Recuperar contraseña', forgotPasswordPage({ sent: true })));
});

app.get('/reset-password/:token', (req, res) => {
  const db = readDB();
  const entry = db.resetTokens.find((t) => t.token === req.params.token);
  const valid = entry && !entry.used && entry.expiresAt > Date.now();
  if (!valid) {
    return res.send(layout('Enlace no válido', resetPasswordPage({ invalid: true })));
  }
  res.send(layout('Nueva contraseña', resetPasswordPage({ token: req.params.token })));
});

app.post('/reset-password/:token', (req, res) => {
  const db = readDB();
  const entry = db.resetTokens.find((t) => t.token === req.params.token);
  const valid = entry && !entry.used && entry.expiresAt > Date.now();
  if (!valid) {
    return res.send(layout('Enlace no válido', resetPasswordPage({ invalid: true })));
  }

  const password = req.body.password || '';
  if (password.length < 6) {
    return res.send(
      layout('Nueva contraseña', resetPasswordPage({ token: req.params.token, error: 'La contraseña necesita al menos 6 caracteres.' }))
    );
  }

  const owner = db.owners.find((o) => o.id === entry.ownerId);
  if (owner) {
    owner.passwordHash = bcrypt.hashSync(password, 10);
  }
  entry.used = true;
  writeDB(db);

  res.redirect('/login?reset=1');
});

// ---------- Panel global (todos los negocios de la cuenta) ----------
app.get('/dashboard', requireAuth, (req, res) => {
  const db = readDB();

  if (!req.session.ownerId) {
    const emp = currentEmployee(req, db);
    if (emp) return res.redirect(`/l/${emp.locationId}`);
    req.session.destroy(() => res.redirect('/login'));
    return;
  }

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
        scansByDay: scansByDaySeries(db.scans, cardIds),
        today: todayLabel(),
      })
    )
  );
});

app.post('/locations', requireOwner, (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.redirect('/dashboard');

  const db = readDB();
  const location = {
    id: crypto.randomUUID(),
    ownerId: req.session.ownerId,
    name,
    logo: null,
    createdAt: new Date().toISOString(),
  };
  db.locations.push(location);
  writeDB(db);
  res.redirect(`/l/${location.id}`);
});

// ---------- Panel de un negocio concreto ----------
app.get('/l/:id', requireAuth, (req, res) => {
  const db = readDB();
  const location = accessibleLocation(req, db);
  if (!location) return res.redirect(homeRedirectPath(req, db));

  const isOwner = isOwnerOfLocation(req, location);
  const owner = db.owners.find((o) => o.id === location.ownerId);
  const employee = req.session.employeeId ? currentEmployee(req, db) : null;
  const accountLabel = isOwner ? owner?.email : employee?.email;

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
  const employees = isOwner ? db.employees.filter((e) => e.locationId === location.id) : [];

  res.send(
    layout(
      location.name,
      locationDashboardPage({
        location,
        accountLabel,
        isOwner,
        cards,
        scansByCard,
        lastScanByCard,
        total,
        scansToday,
        scansByDay: scansByDaySeries(db.scans, cardIds),
        topCard,
        origin,
        today: todayLabel(),
        employees,
      })
    )
  );
});

app.post('/l/:id/cards', requireAuth, (req, res) => {
  const db = readDB();
  const location = accessibleLocation(req, db);
  if (!location) return res.redirect(homeRedirectPath(req, db));

  const name = (req.body.name || '').trim();
  const mode = req.body.cardMode === 'landing' ? 'landing' : 'redirect';
  const destination = (req.body.destination || '').trim();
  const links = parseLinks(req.body);

  if (!name || (mode === 'redirect' && !destination) || (mode === 'landing' && links.length === 0)) {
    return res.redirect(`/l/${location.id}`);
  }

  let id = slugify(name);
  while (db.cards.some((c) => c.id === id)) {
    id = `${slugify(name)}-${crypto.randomBytes(2).toString('hex')}`;
  }

  db.cards.push({
    id,
    locationId: location.id,
    name,
    active: true,
    mode,
    destination: mode === 'redirect' ? destination : '',
    links: mode === 'landing' ? links : [],
    createdAt: new Date().toISOString(),
  });
  writeDB(db);
  res.redirect(`/l/${location.id}`);
});

app.post('/l/:id/cards/:cardId/update', requireAuth, (req, res) => {
  const db = readDB();
  const location = accessibleLocation(req, db);
  if (!location) return res.redirect(homeRedirectPath(req, db));

  const card = db.cards.find((c) => c.id === req.params.cardId && c.locationId === location.id);
  if (card && req.body.destination) {
    card.destination = req.body.destination.trim();
    writeDB(db);
  }
  res.redirect(`/l/${location.id}`);
});

app.get('/l/:id/cards/:cardId/links', requireAuth, (req, res) => {
  const db = readDB();
  const location = accessibleLocation(req, db);
  if (!location) return res.redirect(homeRedirectPath(req, db));

  const card = db.cards.find((c) => c.id === req.params.cardId && c.locationId === location.id);
  if (!card) return res.redirect(`/l/${location.id}`);

  res.send(layout(`Enlaces — ${card.name}`, editLinksPage({ location, card })));
});

app.post('/l/:id/cards/:cardId/update-links', requireAuth, (req, res) => {
  const db = readDB();
  const location = accessibleLocation(req, db);
  if (!location) return res.redirect(homeRedirectPath(req, db));

  const card = db.cards.find((c) => c.id === req.params.cardId && c.locationId === location.id);
  if (!card) return res.redirect(`/l/${location.id}`);

  const links = parseLinks(req.body);
  if (links.length === 0) {
    return res.send(
      layout(`Enlaces — ${card.name}`, editLinksPage({ location, card, error: 'Añade al menos un enlace con URL.' }))
    );
  }

  card.mode = 'landing';
  card.links = links;
  writeDB(db);
  res.redirect(`/l/${location.id}`);
});

app.post('/l/:id/cards/:cardId/toggle', requireAuth, (req, res) => {
  const db = readDB();
  const location = accessibleLocation(req, db);
  if (!location) return res.redirect(homeRedirectPath(req, db));

  const card = db.cards.find((c) => c.id === req.params.cardId && c.locationId === location.id);
  if (card) {
    card.active = card.active === false ? true : false;
    writeDB(db);
  }
  res.redirect(`/l/${location.id}`);
});

app.post('/l/:id/cards/:cardId/delete', requireAuth, (req, res) => {
  const db = readDB();
  const location = accessibleLocation(req, db);
  if (!location) return res.redirect(homeRedirectPath(req, db));

  db.cards = db.cards.filter((c) => !(c.id === req.params.cardId && c.locationId === location.id));
  writeDB(db);
  res.redirect(`/l/${location.id}`);
});

// ---------- Exportar escaneos a CSV ----------
app.get('/l/:id/export.csv', requireAuth, (req, res) => {
  const db = readDB();
  const location = accessibleLocation(req, db);
  if (!location) return res.redirect(homeRedirectPath(req, db));

  const cards = db.cards.filter((c) => c.locationId === location.id);
  const cardsById = new Map(cards.map((c) => [c.id, c]));
  const scans = db.scans
    .filter((s) => cardsById.has(s.cardId))
    .sort((a, b) => new Date(b.at) - new Date(a.at));

  const lines = ['tarjeta,id_tarjeta,fecha_hora'];
  for (const scan of scans) {
    const card = cardsById.get(scan.cardId);
    lines.push([csvEscape(card?.name || ''), csvEscape(scan.cardId), csvEscape(scan.at)].join(','));
  }

  const filename = `${slugify(location.name)}-escaneos.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(lines.join('\n'));
});

// ---------- Empleados ----------
app.post('/l/:id/employees', requireOwner, (req, res) => {
  const db = readDB();
  const location = db.locations.find((l) => l.id === req.params.id && l.ownerId === req.session.ownerId);
  if (!location) return res.redirect('/dashboard');

  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  const rerender = (error) => {
    const cards = db.cards.filter((c) => c.locationId === location.id);
    const cardIds = new Set(cards.map((c) => c.id));
    const scansByCard = {};
    const lastScanByCard = {};
    let total = 0;
    for (const scan of db.scans) {
      if (!cardIds.has(scan.cardId)) continue;
      total += 1;
      scansByCard[scan.cardId] = (scansByCard[scan.cardId] || 0) + 1;
      if (!lastScanByCard[scan.cardId] || scan.at > lastScanByCard[scan.cardId]) lastScanByCard[scan.cardId] = scan.at;
    }
    const topCard = cards.slice().sort((a, b) => (scansByCard[b.id] || 0) - (scansByCard[a.id] || 0))[0];
    const owner = currentOwner(req, db);
    res.send(
      layout(
        location.name,
        locationDashboardPage({
          location,
          accountLabel: owner?.email,
          isOwner: true,
          cards,
          scansByCard,
          lastScanByCard,
          total,
          scansToday: 0,
          scansByDay: scansByDaySeries(db.scans, cardIds),
          topCard,
          origin: `${req.protocol}://${req.get('host')}`,
          today: todayLabel(),
          employees: db.employees.filter((e) => e.locationId === location.id),
          employeeError: error,
        })
      )
    );
  };

  if (!email || password.length < 6) {
    return rerender('Revisa el email y usa una contraseña de al menos 6 caracteres.');
  }
  if (db.owners.some((o) => o.email === email) || db.employees.some((e) => e.email === email)) {
    return rerender('Ya existe una cuenta con ese email.');
  }

  db.employees.push({
    id: crypto.randomUUID(),
    locationId: location.id,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString(),
  });
  writeDB(db);
  res.redirect(`/l/${location.id}`);
});

app.post('/l/:id/employees/:employeeId/delete', requireOwner, (req, res) => {
  const db = readDB();
  const location = db.locations.find((l) => l.id === req.params.id && l.ownerId === req.session.ownerId);
  if (!location) return res.redirect('/dashboard');

  db.employees = db.employees.filter((e) => !(e.id === req.params.employeeId && e.locationId === location.id));
  writeDB(db);
  res.redirect(`/l/${location.id}`);
});

// ---------- Logo del negocio ----------
app.post('/l/:id/logo', requireOwner, upload.single('logo'), (req, res) => {
  const db = readDB();
  const location = db.locations.find((l) => l.id === req.params.id && l.ownerId === req.session.ownerId);
  if (!location) return res.redirect('/dashboard');

  if (req.file) {
    const mime = req.file.mimetype;
    if (['image/png', 'image/jpeg', 'image/webp'].includes(mime)) {
      location.logo = `data:${mime};base64,${req.file.buffer.toString('base64')}`;
      writeDB(db);
    }
  }
  res.redirect(`/l/${location.id}`);
});

// ---------- Endpoint público de escaneo (esto es lo que se graba en la NFC) ----------
app.get('/t/:id', (req, res) => {
  const db = readDB();
  const card = db.cards.find((c) => c.id === req.params.id);

  if (!card) {
    return res.status(404).send(layout('Tarjeta no encontrada', notFoundScreen(), { bare: true }));
  }

  const location = db.locations.find((l) => l.id === card.locationId);

  if (card.active === false) {
    return res.send(
      layout('Tarjeta pausada', pausedScreen({ businessName: location?.name, logo: location?.logo }), { bare: true })
    );
  }

  db.scans.push({ cardId: card.id, at: new Date().toISOString() });
  writeDB(db);

  if (card.mode === 'landing' && card.links && card.links.length) {
    return res.send(
      layout('Elige una opción', landingScreen({ businessName: location?.name, logo: location?.logo, links: card.links }), {
        bare: true,
      })
    );
  }

  res.send(
    layout(
      'Un momento…',
      scanScreen({ businessName: location?.name, destination: card.destination, logo: location?.logo }),
      { bare: true }
    )
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Tapflow NFC escuchando en http://localhost:${PORT}`);
});

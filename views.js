export function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function layout(title, body, { bare = false } = {}) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Tapflow</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css">
</head>
<body class="${bare ? 'bare' : ''}">
${body}
${bare ? '' : '<script src="/js/dashboard.js"></script>'}
</body>
</html>`;
}

const LOGO = `<img class="logo-mark" src="/img/logo.png" alt="Tapflow">`;

export function authShell(title, formHtml, footerLinkHtml) {
  return `
  <div class="auth-screen">
    <div class="auth-card">
      ${LOGO}
      <h1>${esc(title)}</h1>
      ${formHtml}
      <p class="auth-footer">${footerLinkHtml}</p>
    </div>
  </div>`;
}

export function signupPage(error) {
  return authShell(
    'Crea tu cuenta',
    `
    <form method="post" action="/signup" class="stack-form">
      ${error ? `<p class="form-error">${esc(error)}</p>` : ''}
      <label>Nombre de tu negocio
        <input type="text" name="businessName" placeholder="Champion Burger" required>
      </label>
      <p class="form-hint">Podrás añadir más negocios o locales luego, desde tu cuenta.</p>
      <label>Email
        <input type="email" name="email" placeholder="tu@negocio.com" required>
      </label>
      <label>Contraseña
        <input type="password" name="password" placeholder="Mínimo 6 caracteres" minlength="6" required>
      </label>
      <button type="submit">Crear cuenta</button>
    </form>`,
    `¿Ya tienes cuenta? <a href="/login">Inicia sesión</a>`
  );
}

export function loginPage(error) {
  return authShell(
    'Inicia sesión',
    `
    <form method="post" action="/login" class="stack-form">
      ${error ? `<p class="form-error">${esc(error)}</p>` : ''}
      <label>Email
        <input type="email" name="email" placeholder="tu@negocio.com" required>
      </label>
      <label>Contraseña
        <input type="password" name="password" required>
      </label>
      <button type="submit">Entrar</button>
    </form>`,
    `¿Aún no tienes cuenta? <a href="/signup">Crea una</a>`
  );
}

export function scanScreen({ businessName, destination }) {
  return `
  <div class="scan-screen">
    ${LOGO}
    <div class="waves">
      <div class="ring"></div><div class="ring"></div><div class="ring"></div>
      <div class="dot"></div>
    </div>
    <h1>Un momento…</h1>
    <p>${destination ? `Te llevamos a ${esc(businessName || 'la página')}.` : 'Esta tarjeta todavía no tiene un destino configurado.'}</p>
    ${destination ? `<a class="fallback-link" href="${esc(destination)}">¿No redirige? Toca aquí</a>` : ''}
  </div>
  ${destination ? `<script>setTimeout(function(){ window.location.replace(${JSON.stringify(destination)}); }, 700);</script>` : ''}`;
}

export function notFoundScreen() {
  return `
  <div class="scan-screen">
    ${LOGO}
    <h1>Tarjeta no encontrada</h1>
    <p>Este enlace no corresponde a ninguna tarjeta activa.</p>
  </div>`;
}

const ICONS = {
  store: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 9.5 5.5 4h13l1 5.5"/><path d="M4.5 9.5a2.2 2.2 0 0 0 4.3.6 2.2 2.2 0 0 0 4.3 0 2.2 2.2 0 0 0 4.3 0 2.2 2.2 0 0 0 4.3-.6"/><path d="M5.5 9.8V20h13V9.8"/><path d="M10 20v-5.5h4V20"/></svg>`,
  cards: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2.2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="6.5" y1="14.5" x2="10.5" y2="14.5"/></svg>`,
  taps: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="18.2" r="1.1" fill="currentColor" stroke="none"/><path d="M8.3 15a5.2 5.2 0 0 1 7.4 0"/><path d="M5.3 11.8a9.5 9.5 0 0 1 13.4 0"/></svg>`,
  today: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M13.2 2 3.6 13.8h6.7l-1.1 8.2 9.6-11.8h-6.7l1.1-8.2Z"/></svg>`,
  trophy: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2.3 14.6 8.4 21.2 9l-5 4.4 1.5 6.5L12 16.6 6.3 19.9l1.5-6.5-5-4.4 6.6-.6L12 2.3Z"/></svg>`,
};

function statCard(icon, target, label, sub, success) {
  return `
  <div class="stat-card">
    <div class="stat-icon${success ? ' success' : ''}">${icon}</div>
    <div class="stat-num" data-count-target="${target}">0</div>
    <div class="stat-label">${label}</div>
    ${sub ? `<div class="stat-sub">${esc(sub)}</div>` : ''}
  </div>`;
}

function todayCard(today) {
  return `
  <div class="today-card">
    <div class="today-label">Hoy es</div>
    <div class="today-date">${esc(today)}</div>
  </div>`;
}

function cardRow(card, scanCount, lastScanIso, origin, locationId, isTop) {
  const trackingUrl = `${origin}/t/${card.id}`;
  return `
  <tr data-card-id="${esc(card.id)}"${isTop ? ' class="is-top"' : ''}>
    <td>
      <div class="biz">${esc(card.name)}${isTop ? '<span class="crown">🏆</span>' : ''}</div>
      <div class="card-id">${esc(card.id)}</div>
    </td>
    <td class="num" data-count-target="${scanCount}">0</td>
    <td>${lastScanIso ? `<span class="ago" data-iso="${esc(lastScanIso)}">${esc(lastScanIso)}</span>` : '—'}</td>
    <td class="dest-cell">
      <span class="dest-text">${esc(card.destination)}</span>
      <form method="post" action="/l/${esc(locationId)}/cards/${esc(card.id)}/update" class="edit-dest-form hidden">
        <input type="url" name="destination" value="${esc(card.destination)}" required>
        <button type="submit">Guardar</button>
      </form>
    </td>
    <td class="actions">
      <button type="button" class="link-btn copy-link" data-url="${esc(trackingUrl)}">Copiar enlace</button>
      <button type="button" class="link-btn edit-dest-btn">Editar URL</button>
      <form method="post" action="/l/${esc(locationId)}/cards/${esc(card.id)}/delete" onsubmit="return confirm('¿Eliminar esta tarjeta? Se conservan los escaneos ya registrados.');">
        <button type="submit" class="del-btn">Eliminar</button>
      </form>
    </td>
  </tr>`;
}

function pageChrome(accountLabel, innerHtml) {
  return `
  <div class="admin">
    <div class="admin-header">
      <div class="brand-block">
        ${LOGO}
        <div class="tagline">Más reseñas. Más clientes.</div>
      </div>
      <div class="account-block">
        <span class="account-name">${esc(accountLabel)}</span>
        <form method="post" action="/logout"><button type="submit" class="link-btn">Cerrar sesión</button></form>
      </div>
    </div>
    ${innerHtml}
    <div class="admin-footer">
      ${LOGO}
      <div class="tagline">Convierte escaneos en clientes.</div>
    </div>
  </div>
  <div class="toast" id="toast"></div>`;
}

function locationCard(loc) {
  return `
  <a class="location-card" href="/l/${esc(loc.id)}">
    <div class="location-card-top">
      <div class="location-name">${esc(loc.name)}</div>
      <div class="location-arrow">→</div>
    </div>
    <div class="location-stats">
      <div><span class="location-num">${loc.cardCount}</span> tarjeta${loc.cardCount === 1 ? '' : 's'}</div>
      <div><span class="location-num">${loc.scanCount}</span> escaneo${loc.scanCount === 1 ? '' : 's'}</div>
    </div>
  </a>`;
}

export function globalDashboardPage({ owner, locations, totalLocations, totalCards, totalScans, scansToday, today, addError }) {
  const locationsHtml = locations.length
    ? locations.map(locationCard).join('')
    : `<p class="empty-note">Todavía no has añadido ningún negocio.</p>`;

  const inner = `
    <h1 class="page-title">Tus negocios</h1>

    <div class="stat-grid">
      ${statCard(ICONS.store, totalLocations, 'Negocios')}
      ${statCard(ICONS.cards, totalCards, 'Tarjetas activas')}
      ${statCard(ICONS.taps, totalScans, 'Escaneos totales')}
      ${statCard(ICONS.today, scansToday, 'Escaneos hoy', null, true)}
      ${todayCard(today)}
    </div>

    <div class="panel">
      <div class="section-head"><p class="section-title">Añadir negocio</p></div>
      <form method="post" action="/locations" class="add-card-form add-location-form">
        ${addError ? `<p class="form-error">${esc(addError)}</p>` : ''}
        <input type="text" name="name" placeholder="Nombre del negocio o local (ej. Champion Burger - Centro)" required>
        <button type="submit">Añadir</button>
      </form>
    </div>

    <div class="section-head"><p class="section-title">Selecciona un negocio</p></div>
    <div class="location-grid">${locationsHtml}</div>
  `;

  return pageChrome(owner.email, inner);
}

export function locationDashboardPage({
  location,
  ownerEmail,
  cards,
  scansByCard,
  lastScanByCard,
  total,
  scansToday,
  topCard,
  origin,
  today,
  addError,
}) {
  const sortedCards = cards
    .slice()
    .sort((a, b) => (scansByCard[b.id] || 0) - (scansByCard[a.id] || 0));

  const hasTop = topCard && (scansByCard[topCard.id] || 0) > 0;

  const rows = sortedCards.length
    ? sortedCards
        .map((c) => cardRow(c, scansByCard[c.id] || 0, lastScanByCard[c.id], origin, location.id, hasTop && c.id === topCard.id))
        .join('')
    : `<tr class="empty-row"><td colspan="5">Todavía no has añadido ninguna tarjeta.</td></tr>`;

  const topName = hasTop ? topCard.name : null;

  const inner = `
    <a class="back-link" href="/dashboard">← Todos tus negocios</a>
    <h1 class="page-title">${esc(location.name)}</h1>

    <div class="stat-grid">
      ${statCard(ICONS.cards, cards.length, 'Tarjetas activas')}
      ${statCard(ICONS.taps, total, 'Escaneos totales')}
      ${statCard(ICONS.today, scansToday, 'Escaneos hoy', null, true)}
      ${statCard(ICONS.trophy, hasTop ? scansByCard[topCard.id] : 0, 'Tarjeta líder', topName)}
      ${todayCard(today)}
    </div>

    <div class="panel">
      <div class="section-head"><p class="section-title">Añadir tarjeta</p></div>
      <form method="post" action="/l/${esc(location.id)}/cards" class="add-card-form">
        ${addError ? `<p class="form-error">${esc(addError)}</p>` : ''}
        <input type="text" name="name" placeholder="Nombre de la tarjeta (ej. Mesa 3, Mostrador)" required>
        <input type="url" name="destination" placeholder="URL de destino (reseña, Instagram, etc.)" required>
        <button type="submit">Añadir</button>
      </form>
    </div>

    <div class="section-head"><p class="section-title">Tus tarjetas</p></div>
    <div class="table-wrap">
      <div class="table-scroll">
        <table>
          <thead><tr><th>Tarjeta</th><th>Escaneos</th><th>Último</th><th>Destino</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;

  return pageChrome(ownerEmail || location.name, inner);
}

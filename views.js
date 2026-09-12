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
${bare ? '' : '<script src="/js/chart.umd.min.js"></script>'}
</head>
<body class="${bare ? 'bare' : ''}">
${body}
${bare ? '' : '<script src="/js/dashboard.js"></script>'}
</body>
</html>`;
}

const LOGO = `<img class="logo-mark" src="/img/logo.png" alt="Tapflow">`;

function brandMark(logo, businessName) {
  return logo ? `<img class="logo-mark custom-logo" src="${esc(logo)}" alt="${esc(businessName || 'Logo')}">` : LOGO;
}

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
        <input type="text" name="businessName" placeholder="Tu negocio" required>
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

export function loginPage(error, notice) {
  return authShell(
    'Inicia sesión',
    `
    <form method="post" action="/login" class="stack-form">
      ${error ? `<p class="form-error">${esc(error)}</p>` : ''}
      ${notice ? `<p class="form-success">${esc(notice)}</p>` : ''}
      <label>Email
        <input type="email" name="email" placeholder="tu@negocio.com" required>
      </label>
      <label>Contraseña
        <input type="password" name="password" required>
      </label>
      <button type="submit">Entrar</button>
      <a class="forgot-link" href="/forgot-password">¿Olvidaste tu contraseña?</a>
    </form>`,
    `¿Aún no tienes cuenta? <a href="/signup">Crea una</a>`
  );
}

export function forgotPasswordPage({ error, sent } = {}) {
  return authShell(
    'Recuperar contraseña',
    `
    <div class="stack-form">
      ${error ? `<p class="form-error">${esc(error)}</p>` : ''}
      ${
        sent
          ? `<p class="form-success">Si existe una cuenta con ese email, te hemos enviado un enlace para restablecer la contraseña. Revisa también spam.</p>`
          : `
      <form method="post" action="/forgot-password" class="stack-form">
        <label>Email
          <input type="email" name="email" placeholder="tu@negocio.com" required>
        </label>
        <button type="submit">Enviar enlace</button>
      </form>`
      }
    </div>`,
    `<a href="/login">Volver a iniciar sesión</a>`
  );
}

export function resetPasswordPage({ token, error, invalid } = {}) {
  if (invalid) {
    return authShell(
      'Enlace no válido',
      `<p class="form-error">Este enlace ha caducado o ya se ha usado.</p>`,
      `<a href="/forgot-password">Solicita uno nuevo</a>`
    );
  }
  return authShell(
    'Elige una nueva contraseña',
    `
    <form method="post" action="/reset-password/${esc(token)}" class="stack-form">
      ${error ? `<p class="form-error">${esc(error)}</p>` : ''}
      <label>Nueva contraseña
        <input type="password" name="password" placeholder="Mínimo 6 caracteres" minlength="6" required>
      </label>
      <button type="submit">Guardar contraseña</button>
    </form>`,
    `<a href="/login">Volver a iniciar sesión</a>`
  );
}

export function scanScreen({ businessName, destination, logo }) {
  return `
  <div class="scan-screen">
    ${brandMark(logo, businessName)}
    <div class="waves">
      <div class="ring"></div><div class="ring"></div><div class="ring"></div>
      <div class="dot"></div>
    </div>
    <h1>Un momento…</h1>
    <p>${destination ? `Te llevamos a ${esc(businessName || 'la página')}.` : 'Esta tarjeta todavía no tiene un destino configurado.'}</p>
    ${destination ? `<a class="fallback-link" href="${esc(destination)}">¿No redirige? Toca aquí</a>` : ''}
    ${logo ? `<div class="powered-by">${LOGO}<span>Creado con Tapflow</span></div>` : ''}
  </div>
  ${destination ? `<script>setTimeout(function(){ window.location.replace(${JSON.stringify(destination)}); }, 700);</script>` : ''}`;
}

export function landingScreen({ businessName, logo, links }) {
  const buttons = (links || [])
    .map((l) => `<a class="landing-link" href="${esc(l.url)}">${esc(l.label || l.url)}</a>`)
    .join('');
  return `
  <div class="scan-screen landing-screen">
    ${brandMark(logo, businessName)}
    <h1>${esc(businessName || 'Elige una opción')}</h1>
    <div class="landing-links">${buttons}</div>
    ${logo ? `<div class="powered-by">${LOGO}<span>Creado con Tapflow</span></div>` : ''}
  </div>`;
}

export function pausedScreen({ businessName, logo }) {
  return `
  <div class="scan-screen">
    ${brandMark(logo, businessName)}
    <h1>Tarjeta pausada</h1>
    <p>Esta tarjeta está desactivada temporalmente. Vuelve a intentarlo más tarde.</p>
  </div>`;
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

function chartBlock(id, scansByDay, title) {
  const labels = JSON.stringify(scansByDay.map((d) => d.label));
  const data = JSON.stringify(scansByDay.map((d) => d.count));
  return `
  <div class="panel chart-panel">
    <div class="section-head"><p class="section-title">${esc(title)}</p></div>
    <div class="chart-wrap"><canvas id="${esc(id)}"></canvas></div>
  </div>
  <script>
  (function(){
    function draw(){
      var el = document.getElementById(${JSON.stringify(id)});
      if(!el || typeof Chart === 'undefined') return;
      new Chart(el, {
        type: 'line',
        data: {
          labels: ${labels},
          datasets: [{
            label: 'Escaneos',
            data: ${data},
            borderColor: '#C97F1E',
            backgroundColor: 'rgba(240,169,78,.18)',
            fill: true,
            tension: .35,
            pointRadius: 2,
            pointBackgroundColor: '#C97F1E'
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', draw); else draw();
  })();
  </script>`;
}

function destCell(card, locationId) {
  if (card.mode === 'landing') {
    const count = (card.links || []).length;
    return `
    <td class="dest-cell">
      <span class="dest-text">Página con ${count} enlace${count === 1 ? '' : 's'}</span>
      <a class="link-btn" href="/l/${esc(locationId)}/cards/${esc(card.id)}/links">Editar enlaces</a>
    </td>`;
  }
  return `
    <td class="dest-cell">
      <span class="dest-text">${esc(card.destination || '')}</span>
      <form method="post" action="/l/${esc(locationId)}/cards/${esc(card.id)}/update" class="edit-dest-form hidden">
        <input type="url" name="destination" value="${esc(card.destination || '')}" required>
        <button type="submit">Guardar</button>
      </form>
    </td>`;
}

function cardRow(card, scanCount, lastScanIso, origin, locationId, isTop) {
  const trackingUrl = `${origin}/t/${card.id}`;
  const paused = card.active === false;
  const classes = [isTop && 'is-top', paused && 'is-paused'].filter(Boolean).join(' ');
  return `
  <tr data-card-id="${esc(card.id)}"${classes ? ` class="${classes}"` : ''}>
    <td>
      <div class="biz">${esc(card.name)}${isTop ? '<span class="crown">🏆</span>' : ''}${paused ? '<span class="paused-badge">Pausada</span>' : ''}</div>
      <div class="card-id">${esc(card.id)}</div>
    </td>
    <td class="num" data-count-target="${scanCount}">0</td>
    <td>${lastScanIso ? `<span class="ago" data-iso="${esc(lastScanIso)}">${esc(lastScanIso)}</span>` : '—'}</td>
    ${destCell(card, locationId)}
    <td class="actions">
      <a class="link-btn" href="${trackingUrl}" target="_blank" rel="noopener">Ver tarjeta</a>
      <button type="button" class="link-btn copy-link" data-url="${esc(trackingUrl)}">Copiar enlace</button>
      ${card.mode === 'landing' ? '' : '<button type="button" class="link-btn edit-dest-btn">Editar URL</button>'}
      <form method="post" action="/l/${esc(locationId)}/cards/${esc(card.id)}/toggle">
        <button type="submit" class="link-btn">${paused ? 'Activar' : 'Pausar'}</button>
      </form>
      <form method="post" action="/l/${esc(locationId)}/cards/${esc(card.id)}/delete" onsubmit="return confirm('¿Eliminar esta tarjeta? Se conservan los escaneos ya registrados.');">
        <button type="submit" class="del-btn">Eliminar</button>
      </form>
    </td>
  </tr>`;
}

function pageChrome(accountLabel, innerHtml, flash) {
  return `
  <div class="admin" data-flash="${esc(flash || '')}">
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

function greetingBlock(name) {
  return `<p class="greeting" id="greeting" data-name="${esc(name || '')}"></p>`;
}

function onboardingPanel() {
  return `
  <div class="panel onboarding-panel">
    <div class="section-head"><p class="section-title">Primeros pasos</p></div>
    <ol class="onboarding-steps">
      <li><strong>Crea tu primera tarjeta</strong> con el formulario de abajo: dale un nombre y elige a dónde quieres llevar a tus clientes (una reseña de Google, tu Instagram, o una página con varios enlaces).</li>
      <li><strong>Pruébala</strong> con el botón "Ver tarjeta" antes de ponerla en marcha, para comprobar que lleva al sitio correcto.</li>
      <li><strong>Ponla en marcha</strong>: usa "Copiar enlace" para grabar la URL en tu tarjeta NFC física y colócala donde la vean tus clientes.</li>
    </ol>
  </div>`;
}

function scanNudge() {
  return `<p class="scan-nudge">Todavía no ha llegado ningún escaneo. Prueba tu tarjeta con el botón <strong>«Ver tarjeta»</strong> de la tabla para comprobar que todo funciona.</p>`;
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

export function globalDashboardPage({ owner, locations, totalLocations, totalCards, totalScans, scansToday, scansByDay, today, addError, flash }) {
  const locationsHtml = locations.length
    ? locations.map(locationCard).join('')
    : `<p class="empty-note">Todavía no has añadido ningún negocio.</p>`;

  const inner = `
    ${greetingBlock(owner.email.split('@')[0])}
    <h1 class="page-title">Tus negocios</h1>

    <div class="stat-grid">
      ${statCard(ICONS.store, totalLocations, 'Negocios')}
      ${statCard(ICONS.cards, totalCards, 'Tarjetas activas')}
      ${statCard(ICONS.taps, totalScans, 'Escaneos totales')}
      ${statCard(ICONS.today, scansToday, 'Escaneos hoy', null, true)}
      ${todayCard(today)}
    </div>

    ${chartBlock('globalChart', scansByDay, 'Escaneos de los últimos 14 días (todos tus negocios)')}

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

  return pageChrome(owner.email, inner, flash);
}

export function locationDashboardPage({
  location,
  accountLabel,
  isOwner,
  cards,
  scansByCard,
  lastScanByCard,
  total,
  scansToday,
  scansByDay,
  topCard,
  origin,
  today,
  addError,
  employees,
  employeeError,
  flash,
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

  const employeesPanel = isOwner
    ? `
    <div class="panel">
      <div class="section-head"><p class="section-title">Empleados con acceso a este negocio</p></div>
      ${employeeError ? `<p class="form-error">${esc(employeeError)}</p>` : ''}
      <form method="post" action="/l/${esc(location.id)}/employees" class="add-card-form employee-form">
        <input type="email" name="email" placeholder="email@empleado.com" required>
        <input type="password" name="password" placeholder="Contraseña (mín. 6)" minlength="6" required>
        <button type="submit">Invitar</button>
      </form>
      <p class="form-hint">Los empleados solo ven y gestionan este negocio, no el resto de tu cuenta.</p>
      ${
        employees && employees.length
          ? `<div class="employee-list">${employees
              .map(
                (e) => `
          <div class="employee-row">
            <span>${esc(e.email)}</span>
            <form method="post" action="/l/${esc(location.id)}/employees/${esc(e.id)}/delete" onsubmit="return confirm('¿Quitar el acceso de este empleado?');">
              <button type="submit" class="del-btn">Quitar acceso</button>
            </form>
          </div>`
              )
              .join('')}</div>`
          : `<p class="empty-note">Todavía no has añadido empleados.</p>`
      }
    </div>`
    : '';

  const logoPanel = isOwner
    ? `
    <div class="panel">
      <div class="section-head"><p class="section-title">Logo de tu negocio</p></div>
      <p class="form-hint">Se mostrará en la pantalla que ven tus clientes al escanear la tarjeta, en vez del logo de Tapflow.</p>
      ${location.logo ? `<img src="${esc(location.logo)}" class="current-logo" alt="Logo actual">` : ''}
      <form method="post" action="/l/${esc(location.id)}/logo" enctype="multipart/form-data" class="logo-form">
        <input type="file" name="logo" accept="image/png,image/jpeg,image/webp" required>
        <button type="submit">Subir logo</button>
      </form>
    </div>`
    : '';

  const inner = `
    ${isOwner ? `<a class="back-link" href="/dashboard">← Todos tus negocios</a>` : ''}
    ${greetingBlock((accountLabel || '').split('@')[0])}
    <h1 class="page-title">${esc(location.name)}</h1>

    <div class="stat-grid">
      ${statCard(ICONS.cards, cards.length, 'Tarjetas activas')}
      ${statCard(ICONS.taps, total, 'Escaneos totales')}
      ${statCard(ICONS.today, scansToday, 'Escaneos hoy', null, true)}
      ${statCard(ICONS.trophy, hasTop ? scansByCard[topCard.id] : 0, 'Tarjeta líder', topName)}
      ${todayCard(today)}
    </div>

    ${chartBlock('locationChart', scansByDay, 'Escaneos de los últimos 14 días')}

    ${cards.length === 0 ? onboardingPanel() : total === 0 ? scanNudge() : ''}

    <div class="panel">
      <div class="section-head"><p class="section-title">Añadir tarjeta</p></div>
      <form method="post" action="/l/${esc(location.id)}/cards" class="card-form" id="add-card-form">
        ${addError ? `<p class="form-error">${esc(addError)}</p>` : ''}
        <input type="text" name="name" placeholder="Nombre de la tarjeta (ej. Mesa 3, Mostrador)" required>
        <div class="mode-toggle">
          <label><input type="radio" name="cardMode" value="redirect" checked> Redirección directa</label>
          <label><input type="radio" name="cardMode" value="landing"> Página con varios enlaces</label>
        </div>
        <div class="mode-fields mode-fields-redirect">
          <input type="url" name="destination" placeholder="URL de destino (reseña, Instagram, etc.)">
        </div>
        <div class="mode-fields mode-fields-landing hidden">
          <div class="link-rows">
            <div class="link-row">
              <input type="text" name="linkLabel[]" placeholder="Texto (ej. Google Reviews)">
              <input type="url" name="linkUrl[]" placeholder="https://...">
            </div>
            <div class="link-row">
              <input type="text" name="linkLabel[]" placeholder="Texto (ej. Instagram)">
              <input type="url" name="linkUrl[]" placeholder="https://...">
            </div>
          </div>
          <button type="button" class="link-btn add-link-row">+ Añadir enlace</button>
        </div>
        <button type="submit">Añadir tarjeta</button>
      </form>
    </div>

    <div class="section-head">
      <p class="section-title">Tus tarjetas</p>
      <a class="link-btn" href="/l/${esc(location.id)}/export.csv">Exportar CSV</a>
    </div>
    <div class="table-wrap">
      <div class="table-scroll">
        <table>
          <thead><tr><th>Tarjeta</th><th>Escaneos</th><th>Último</th><th>Destino</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>

    ${employeesPanel}
    ${logoPanel}
  `;

  return pageChrome(accountLabel, inner, flash);
}

export function editLinksPage({ location, card, error }) {
  const links = card.links && card.links.length ? card.links : [{ label: '', url: '' }, { label: '', url: '' }];
  const rows = links
    .map(
      (l) => `
      <div class="link-row">
        <input type="text" name="linkLabel[]" placeholder="Texto (ej. Google Reviews)" value="${esc(l.label || '')}">
        <input type="url" name="linkUrl[]" placeholder="https://..." value="${esc(l.url || '')}">
      </div>`
    )
    .join('');

  const inner = `
    <a class="back-link" href="/l/${esc(location.id)}">← Volver a ${esc(location.name)}</a>
    <h1 class="page-title">Editar enlaces — ${esc(card.name)}</h1>
    <div class="panel">
      ${error ? `<p class="form-error">${esc(error)}</p>` : ''}
      <form method="post" action="/l/${esc(location.id)}/cards/${esc(card.id)}/update-links" class="card-form">
        <div class="link-rows">${rows}</div>
        <button type="button" class="link-btn add-link-row">+ Añadir enlace</button>
        <button type="submit">Guardar cambios</button>
      </form>
    </div>
  `;

  return pageChrome(location.name, inner);
}

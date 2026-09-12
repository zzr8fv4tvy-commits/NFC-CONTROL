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
<link rel="stylesheet" href="/css/style.css">
</head>
<body class="${bare ? 'bare' : ''}">
${body}
${bare ? '' : '<script src="/js/dashboard.js"></script>'}
</body>
</html>`;
}

export function authShell(title, formHtml, footerLinkHtml) {
  return `
  <div class="auth-screen">
    <div class="auth-card">
      <div class="brand">Tapflow</div>
      <h1>${esc(title)}</h1>
      ${formHtml}
      <p class="auth-footer">${footerLinkHtml}</p>
    </div>
  </div>`;
}

export function signupPage(error) {
  return authShell(
    'Crea la cuenta de tu negocio',
    `
    <form method="post" action="/signup" class="stack-form">
      ${error ? `<p class="form-error">${esc(error)}</p>` : ''}
      <label>Nombre del negocio
        <input type="text" name="businessName" placeholder="Champion Burger" required>
      </label>
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
    <h1>Tarjeta no encontrada</h1>
    <p>Este enlace no corresponde a ninguna tarjeta activa.</p>
  </div>`;
}

function cardRow(card, scanCount, lastScanIso, origin) {
  const trackingUrl = `${origin}/t/${card.id}`;
  return `
  <tr data-card-id="${esc(card.id)}">
    <td>
      <div class="biz">${esc(card.name)}</div>
      <div class="card-id">${esc(card.id)}</div>
    </td>
    <td class="num">${scanCount}</td>
    <td>${lastScanIso ? `<span class="ago" data-iso="${esc(lastScanIso)}">${esc(lastScanIso)}</span>` : '—'}</td>
    <td class="dest-cell">
      <span class="dest-text">${esc(card.destination)}</span>
      <form method="post" action="/cards/${esc(card.id)}/update" class="edit-dest-form hidden">
        <input type="url" name="destination" value="${esc(card.destination)}" required>
        <button type="submit">Guardar</button>
      </form>
    </td>
    <td class="actions">
      <button type="button" class="link-btn copy-link" data-url="${esc(trackingUrl)}">Copiar enlace</button>
      <button type="button" class="link-btn edit-dest-btn">Editar URL</button>
      <form method="post" action="/cards/${esc(card.id)}/delete" onsubmit="return confirm('¿Eliminar esta tarjeta? Se conservan los escaneos ya registrados.');">
        <button type="submit" class="del-btn">Eliminar</button>
      </form>
    </td>
  </tr>`;
}

export function dashboardPage({ business, cards, scansByCard, lastScanByCard, total, topCard, origin, addError }) {
  const rows = cards.length
    ? cards
        .slice()
        .sort((a, b) => (scansByCard[b.id] || 0) - (scansByCard[a.id] || 0))
        .map((c) => cardRow(c, scansByCard[c.id] || 0, lastScanByCard[c.id], origin))
        .join('')
    : `<tr class="empty-row"><td colspan="5">Todavía no has añadido ninguna tarjeta.</td></tr>`;

  return `
  <div class="admin">
    <div class="admin-top">
      <div>
        <div class="brand-small">Tapflow</div>
        <h1>${esc(business.name)}</h1>
      </div>
      <div class="top-right">
        <div class="stat-row">
          <div class="stat"><div class="n">${cards.length}</div><div class="l">tarjetas</div></div>
          <div class="stat"><div class="n">${total}</div><div class="l">escaneos totales</div></div>
        </div>
        <form method="post" action="/logout"><button type="submit" class="link-btn">Cerrar sesión</button></form>
      </div>
    </div>

    ${
      topCard && (scansByCard[topCard.id] || 0) > 0
        ? `<p class="highlight">Tu tarjeta con más escaneos es <strong>${esc(topCard.name)}</strong>, con ${scansByCard[topCard.id]}.</p>`
        : ''
    }

    <p class="section-title">Añadir tarjeta</p>
    <form method="post" action="/cards" class="add-card">
      ${addError ? `<p class="form-error">${esc(addError)}</p>` : ''}
      <input type="text" name="name" placeholder="Nombre de la tarjeta (ej. Mesa 3, Mostrador)" required>
      <input type="url" name="destination" placeholder="URL de destino (reseña, Instagram, etc.)" required>
      <button type="submit">Añadir tarjeta</button>
    </form>

    <p class="section-title">Tus tarjetas</p>
    <table>
      <thead><tr><th>Tarjeta</th><th>Escaneos</th><th>Último</th><th>Destino</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="toast" id="toast"></div>`;
}

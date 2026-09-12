function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'ahora mismo';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1600);
}

function animateCount(el) {
  const target = Number(el.dataset.countTarget || '0');
  if (!target) {
    el.textContent = '0';
    return;
  }
  const duration = 700;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(eased * target);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

document.querySelectorAll('.ago[data-iso]').forEach((el) => {
  el.textContent = timeAgo(el.dataset.iso);
});

document.querySelectorAll('[data-count-target]').forEach((el) => animateCount(el));

document.querySelectorAll('.copy-link').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const url = btn.dataset.url;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Enlace copiado');
    } catch (err) {
      window.prompt('Copia el enlace para grabar en la tarjeta:', url);
    }
  });
});

document.querySelectorAll('.edit-dest-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const row = btn.closest('tr');
    const form = row.querySelector('.edit-dest-form');
    const text = row.querySelector('.dest-text');
    form.classList.toggle('hidden');
    text.classList.toggle('hidden');
  });
});

// ---------- Tipo de tarjeta: redirección directa vs. varios enlaces ----------
document.querySelectorAll('.mode-toggle').forEach((toggle) => {
  const form = toggle.closest('form');
  if (!form) return;
  const redirectFields = form.querySelector('.mode-fields-redirect');
  const landingFields = form.querySelector('.mode-fields-landing');

  toggle.querySelectorAll('input[name="cardMode"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const isLanding = form.querySelector('input[name="cardMode"]:checked')?.value === 'landing';
      if (redirectFields) redirectFields.classList.toggle('hidden', isLanding);
      if (landingFields) landingFields.classList.toggle('hidden', !isLanding);
      const destInput = redirectFields ? redirectFields.querySelector('input[name="destination"]') : null;
      if (destInput) destInput.required = !isLanding;
    });
  });
});

// ---------- Añadir/quitar filas de enlaces (landing pages) ----------
document.querySelectorAll('.add-link-row').forEach((btn) => {
  btn.addEventListener('click', () => {
    const container = btn.parentElement.querySelector('.link-rows') || btn.previousElementSibling;
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'link-row';
    row.innerHTML =
      '<input type="text" name="linkLabel[]" placeholder="Texto (ej. TripAdvisor)">' +
      '<input type="url" name="linkUrl[]" placeholder="https://...">' +
      '<button type="button" class="link-btn remove-link-row">✕</button>';
    container.appendChild(row);
  });
});

document.addEventListener('click', (e) => {
  if (e.target.classList && e.target.classList.contains('remove-link-row')) {
    e.target.closest('.link-row')?.remove();
  }
});

// Envío de emails transaccionales vía la API de Resend (https://resend.com).
// Si no hay RESEND_API_KEY configurada, no se envía nada de verdad: se deja
// constancia en los logs del servidor para no romper el flujo en desarrollo.

const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_ADDRESS = process.env.RESEND_FROM || 'Tapflow <onboarding@resend.dev>';

export async function sendPasswordResetEmail({ to, resetUrl }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[email] RESEND_API_KEY no configurada. Enlace de recuperación para ${to}: ${resetUrl}`);
    return { sent: false, reason: 'no-api-key' };
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#18150F;">Recupera tu contraseña de Tapflow</h2>
      <p style="color:#4b4636;">Hemos recibido una solicitud para restablecer tu contraseña. Este enlace caduca en 1 hora.</p>
      <p style="margin:24px 0;">
        <a href="${resetUrl}" style="background:#18150F;color:#F0A94E;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Restablecer contraseña</a>
      </p>
      <p style="color:#918a76;font-size:13px;">Si no has sido tú, puedes ignorar este email con tranquilidad.</p>
    </div>`;

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [to],
        subject: 'Recupera tu contraseña de Tapflow',
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[email] Resend devolvió ${res.status}: ${body}`);
      return { sent: false, reason: 'resend-error' };
    }

    return { sent: true };
  } catch (err) {
    console.error('[email] Error enviando email con Resend:', err.message);
    return { sent: false, reason: 'network-error' };
  }
}

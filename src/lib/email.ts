import "server-only";

type PasswordResetEmailInput = {
  to: string;
  firstName: string;
  resetUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendPasswordResetEmail({
  to,
  firstName,
  resetUrl,
}: PasswordResetEmailInput): Promise<{ delivered: boolean }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "development") {
      console.info("PASSWORD_RESET_DEV_LINK", { to, resetUrl });
    }
    return { delivered: false };
  }

  const safeName = escapeHtml(firstName);
  const safeUrl = escapeHtml(resetUrl);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Restablece tu contraseña de Vinos ROSH",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#2d2622">
          <h1 style="color:#6b0f1a">Vinos ROSH</h1>
          <p>Hola ${safeName},</p>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
          <p>
            <a href="${safeUrl}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#6b0f1a;color:white;text-decoration:none;font-weight:700">
              Restablecer contraseña
            </a>
          </p>
          <p>Este enlace vence en 30 minutos y solo puede utilizarse una vez.</p>
          <p>Si no solicitaste el cambio, puedes ignorar este correo.</p>
        </div>
      `,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("RESEND_PASSWORD_RESET_ERROR", {
      status: response.status,
      body: await response.text(),
    });
    return { delivered: false };
  }

  return { delivered: true };
}

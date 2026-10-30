import { confirmationSchema, type ConfirmationSnapshot } from "./confirmation-contract";

const escape = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
export function confirmationOrderUrl(appUrl: string, number: string) {
  const url = new URL(appUrl);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("INVALID_APP_URL");
  return `${url.origin}/pedidos/${encodeURIComponent(number)}`;
}
export function renderPaymentConfirmation(input: ConfirmationSnapshot, appUrl: string) {
  const snapshot = confirmationSchema.parse(input);
  const orderUrl = confirmationOrderUrl(appUrl, snapshot.orderNumber);
  const subject = `Pago confirmado · ${snapshot.orderNumber}`;
  const text = [`ROSH · Confirmación de pago`, `Hola ${snapshot.firstName || ""},`,
    `Registramos el pago del pedido ${snapshot.orderNumber}.`,
    ...snapshot.items.map((item) => `${item.quantity} × ${item.name} · S/ ${item.subtotal}`),
    `Productos: S/ ${snapshot.subtotal}`, `Envío: S/ ${snapshot.shippingAmount}`, `Total: S/ ${snapshot.total}`,
    `Consulta el estado actual de tu pedido: ${orderUrl}`, `Este correo no es una boleta ni una factura fiscal.`].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#27313b"><h1>ROSH</h1><p>Hola ${escape(snapshot.firstName)},</p><h2>Registramos tu pago</h2><p>Pedido <strong>${escape(snapshot.orderNumber)}</strong></p><table style="width:100%;border-collapse:collapse"><thead><tr><th align="left">Producto</th><th>Cantidad</th><th align="right">Subtotal</th></tr></thead><tbody>${snapshot.items.map((item) => `<tr><td style="padding:12px 0">${escape(item.name)}</td><td align="center">${item.quantity}</td><td align="right">S/ ${item.subtotal}</td></tr>`).join("")}</tbody></table><p>Productos: S/ ${snapshot.subtotal}<br>Envío: S/ ${snapshot.shippingAmount}</p><p style="font-size:20px"><strong>Total: S/ ${snapshot.total}</strong></p><p><a href="${escape(orderUrl)}">Consultar el estado actual del pedido</a></p><p style="font-size:12px;color:#66717b">Este correo no es una boleta ni una factura fiscal.</p></div>`;
  return { subject, text, html };
}

import type { ConfirmationSnapshot } from "@/modules/notifications/confirmation-contract";

export function PaymentConfirmationPreview({ snapshot }: { snapshot: ConfirmationSnapshot }) {
  return <section className="confirmationEmailPreview" aria-label="Vista previa del correo">
    <p className="confirmationEmailCaption">VISTA PREVIA DEL CONTENIDO · NO ENVÍA CORREOS</p>
    <h2>ROSH</h2><p>Hola {snapshot.firstName},</p><h3>Registramos tu pago</h3>
    <p>Pedido <strong>{snapshot.orderNumber}</strong></p>
    <div className="confirmationEmailItems"><table><caption className="srOnly">Resumen del pedido confirmado</caption><thead><tr><th>Producto</th><th>Cantidad</th><th>Subtotal</th></tr></thead><tbody>
      {snapshot.items.map((item, index) => <tr key={index}><td>{item.name}</td><td>{item.quantity}</td><td>S/ {item.subtotal}</td></tr>)}
    </tbody></table></div>
    <dl><div><dt>Productos</dt><dd>S/ {snapshot.subtotal}</dd></div><div><dt>Envío</dt><dd>S/ {snapshot.shippingAmount}</dd></div><div><dt>Total</dt><dd>S/ {snapshot.total}</dd></div></dl>
    <p>Consulta el estado actual de tu pedido desde tu cuenta en la tienda.</p>
    <p className="confirmationEmailCaption">Este correo no es una boleta ni una factura fiscal.</p>
  </section>;
}

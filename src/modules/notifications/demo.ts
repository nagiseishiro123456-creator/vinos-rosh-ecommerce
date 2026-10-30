import type { ConfirmationSnapshot } from "./confirmation-contract";
export const demoConfirmation: ConfirmationSnapshot = {
  version: 1, orderNumber: "ROSH-DEMO-0001", firstName: "Cliente de prueba",
  subtotal: "89.70", shippingAmount: "8.50", total: "98.20", currency: "PEN", paidAt: "2026-10-27T15:00:00.000Z",
  items: [{ name: "ROSH · Bebida de uva", quantity: 3, unitPrice: "29.90", subtotal: "89.70" }],
};

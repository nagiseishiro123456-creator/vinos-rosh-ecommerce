/** Canonical decimal strings cross the server/client boundary; no Prisma in the browser. */
function cents(value: string): bigint {
  if (!/^(0|[1-9]\d*)\.\d{2}$/.test(value)) throw new Error("INVALID_MONEY_STRING");
  return BigInt(value.replace(".", ""));
}

export function addMoney(...values: string[]): string {
  const total = values.reduce((sum, value) => sum + cents(value), BigInt(0));
  const digits = total.toString().padStart(3, "0");
  return `${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

export function formatPrice(value: string): string {
  cents(value);
  const [whole, fraction] = value.split(".");
  return `S/ ${new Intl.NumberFormat("es-PE").format(BigInt(whole))}.${fraction}`;
}

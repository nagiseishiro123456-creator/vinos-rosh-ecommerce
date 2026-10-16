import { Prisma } from "@prisma/client";
import { z } from "zod";

export type MoneyInput = string | Prisma.Decimal;
export const MAX_ORDER_AMOUNT = new Prisma.Decimal("99999999.99");

export class MoneyError extends Error {
  constructor(message = "INVALID_MONEY") {
    super(message);
    this.name = "MoneyError";
  }
}

export function money(value: MoneyInput): Prisma.Decimal {
  let result: Prisma.Decimal;
  try { result = new Prisma.Decimal(value); } catch { throw new MoneyError(); }
  if (!result.isFinite() || result.isNegative() || result.decimalPlaces() > 2 || result.gt(MAX_ORDER_AMOUNT)) {
    throw new MoneyError();
  }
  return result;
}

export function moneyInputSchema({ min = "0.00", max = "99999999.99" } = {}) {
  return z.string().trim().regex(/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/, "Usa un importe con hasta dos decimales.")
    .refine((value) => {
      try { const amount = money(value); return amount.gte(min) && amount.lte(max); }
      catch { return false; }
    }, "Importe fuera de rango.")
    .transform((value) => money(value).toFixed(2));
}

export function calculateAmounts(items: { unitPrice: MoneyInput; quantity: number }[], shipping: MoneyInput = "0.00") {
  const lines = items.map(({ unitPrice, quantity }) => {
    if (!Number.isSafeInteger(quantity) || quantity < 1) throw new MoneyError("INVALID_QUANTITY");
    const price = money(unitPrice);
    if (price.isZero()) throw new MoneyError("INVALID_UNIT_PRICE");
    return { unitPrice: price, quantity, subtotal: price.mul(quantity) };
  });
  const subtotal = lines.reduce((sum, line) => sum.add(line.subtotal), new Prisma.Decimal(0));
  const shippingAmount = money(shipping);
  const total = subtotal.add(shippingAmount);
  // Calculation is exact even for a large preview; check the database ceiling before persistence.
  return { lines, subtotal, shippingAmount, total };
}

export function assertOrderAmountFits(total: Prisma.Decimal) {
  if (total.gt(MAX_ORDER_AMOUNT)) throw new MoneyError("ORDER_AMOUNT_LIMIT");
}

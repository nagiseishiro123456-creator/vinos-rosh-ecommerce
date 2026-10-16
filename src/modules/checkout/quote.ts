import { createHmac, timingSafeEqual } from "node:crypto";

import { money, type MoneyInput } from "@/modules/checkout/pricing";

type QuoteInput = {
  userId: string;
  address: {
    id: string; recipient: string; phone: string; department: string; province: string;
    district: string; addressLine1: string; reference: string | null;
  };
  cart: {
    id: string;
    items: { id: string; quantity: number; product: { id: string; name: string; sku: string | null; price: MoneyInput } }[];
  };
  shippingZone: { id: string; price: MoneyInput };
};

function signingSecret(secret = process.env.NEXTAUTH_SECRET) {
  if (!secret || secret.length < 32) throw new Error("CHECKOUT_SIGNING_SECRET_REQUIRED");
  return secret;
}

export function createCheckoutQuote(input: QuoteInput, secret?: string): string {
  const { address, cart, shippingZone, userId } = input;
  const payload = JSON.stringify({
    version: 1, currency: "PEN", userId, cartId: cart.id,
    delivery: [address.id, address.recipient, address.phone, address.department, address.province,
      address.district, address.addressLine1, address.reference],
    shipping: [shippingZone.id, money(shippingZone.price).toFixed(2)],
    items: [...cart.items].sort((a, b) => a.id.localeCompare(b.id)).map((item) => [
      item.id, item.product.id, item.product.name, item.product.sku,
      item.quantity, money(item.product.price).toFixed(2),
    ]),
  });
  return `v1:${createHmac("sha256", signingSecret(secret)).update("rosh-checkout-quote:v1\n").update(payload).digest("hex")}`;
}

export function verifyCheckoutQuote(quote: string, input: QuoteInput, secret?: string): boolean {
  if (!/^v1:[a-f0-9]{64}$/.test(quote)) return false;
  return timingSafeEqual(Buffer.from(quote), Buffer.from(createCheckoutQuote(input, secret)));
}

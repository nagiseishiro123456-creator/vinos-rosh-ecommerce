import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { assertTransactionAdmin } from "@/modules/admin/transaction-auth";
import { shippingLocationKey } from "./coverage";
import { shippingZoneInputSchema, type ShippingZoneInput } from "./contract";

export class ShippingZoneError extends Error {
  constructor(public code: "INVALID" | "NOT_FOUND" | "DUPLICATE" | "IDENTITY_CHANGED" | "CONFLICT") { super(code); }
}
export async function saveShippingZoneRecord(adminId: string, input: ShippingZoneInput) {
  const parsed = shippingZoneInputSchema.safeParse(input);
  if (!parsed.success) throw new ShippingZoneError("INVALID");
  const data = parsed.data;
  return prisma.$transaction(async (tx) => {
    // Small operator-managed table. Serialize identity checks, including accent/case variants.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(82203401)::text`;
    await assertTransactionAdmin(tx, adminId);
    const zones = await tx.shippingZone.findMany();
    const matching = zones.filter((zone) => shippingLocationKey(zone) === shippingLocationKey(data));
    if (!data.id) {
      if (matching.length) throw new ShippingZoneError("DUPLICATE");
      return tx.shippingZone.create({ data: { department: data.department, province: data.province, district: data.district, price: data.price, active: true } });
    }
    const existing = zones.find((zone) => zone.id === data.id);
    if (!existing) throw new ShippingZoneError("NOT_FOUND");
    if (existing.updatedAt.toISOString() !== data.expectedUpdatedAt) throw new ShippingZoneError("CONFLICT");
    if (shippingLocationKey(existing) !== shippingLocationKey(data)) throw new ShippingZoneError("IDENTITY_CHANGED");
    // Keep the original spelling and activation state; saved addresses retain their identity.
    return tx.shippingZone.update({ where: { id: existing.id }, data: { price: data.price, updatedAt: new Date(Math.max(Date.now(), existing.updatedAt.getTime() + 1)) } });
  });
}
export async function setShippingZoneActive(adminId: string, id: string, expectedActive: boolean, expectedUpdatedAt: string) {
  if (!z.string().cuid().safeParse(id).success || typeof expectedActive !== "boolean" || !z.string().datetime().safeParse(expectedUpdatedAt).success) throw new ShippingZoneError("INVALID");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(82203401)::text`;
    await assertTransactionAdmin(tx, adminId);
    const zones = await tx.shippingZone.findMany();
    const current = zones.find((zone) => zone.id === id);
    if (!current) throw new ShippingZoneError("NOT_FOUND");
    if (current.active !== expectedActive || current.updatedAt.toISOString() !== expectedUpdatedAt) throw new ShippingZoneError("CONFLICT");
    if (!current.active && zones.some((zone) => zone.active && zone.id !== id && shippingLocationKey(zone) === shippingLocationKey(current))) throw new ShippingZoneError("DUPLICATE");
    return tx.shippingZone.update({ where: { id }, data: { active: !expectedActive, updatedAt: new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1)) } });
  });
}

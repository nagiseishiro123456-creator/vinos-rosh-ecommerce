import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { deliveryAddressSchema, type DeliveryAddressInput } from "./contract";
import { resolveShippingCoverage } from "@/modules/shipping/coverage";

export class DeliveryAddressError extends Error {
  constructor(public code: "INVALID" | "NOT_FOUND" | "UNSUPPORTED_ZONE" | "LIMIT" | "SESSION") { super(code); }
}
async function keepOnePrimary(tx: Prisma.TransactionClient, userId: string, preferredId?: string) {
  const addresses = await tx.address.findMany({ where: { userId, active: true }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }, { id: "desc" }], select: { id: true } });
  const chosen = addresses.find((address) => address.id === preferredId)?.id ?? addresses[0]?.id;
  await tx.address.updateMany({ where: { userId, isDefault: true, ...(chosen ? { id: { not: chosen } } : {}) }, data: { isDefault: false } });
  if (chosen) await tx.address.updateMany({ where: { id: chosen, userId, active: true, isDefault: false }, data: { isDefault: true } });
}
async function ownedTransaction<T>(userId: string, operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    // Serialize every address mutation for this account, including its first address.
    const user = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "User" WHERE "id"=${userId} FOR UPDATE`;
    if (!user.length) throw new DeliveryAddressError("SESSION");
    return operation(tx);
  });
}
export async function saveDeliveryAddress(userId: string, input: DeliveryAddressInput, addressId?: string) {
  const parsed = deliveryAddressSchema.safeParse(input);
  if (!parsed.success || (addressId && !z.string().cuid().safeParse(addressId).success)) throw new DeliveryAddressError("INVALID");
  const data = parsed.data;
  return ownedTransaction(userId, async (tx) => {
    const existing = addressId ? await tx.address.findFirst({ where: { id: addressId, userId, active: true }, select: { id: true, isDefault: true } }) : null;
    if (addressId && !existing) throw new DeliveryAddressError("NOT_FOUND");
    const zones = await tx.shippingZone.findMany({ where: { active: true } });
    const zone = zones.find((item) => item.id === data.shippingZoneId);
    if (!zone || resolveShippingCoverage(zone, zones).kind !== "available") throw new DeliveryAddressError("UNSUPPORTED_ZONE");
    const count = await tx.address.count({ where: { userId, active: true } });
    if (!existing && count >= 10) throw new DeliveryAddressError("LIMIT");
    const primary = data.isDefault || !!existing?.isDefault || count === 0;
    const values = { label: data.label || null, recipient: data.recipient, phone: data.phone,
      department: zone.department, province: zone.province, district: zone.district,
      addressLine1: data.addressLine1, reference: data.reference || null, isDefault: primary };
    const saved = existing ? await tx.address.update({ where: { id: existing.id }, data: values, select: { id: true } })
      : await tx.address.create({ data: { userId, ...values }, select: { id: true } });
    await keepOnePrimary(tx, userId, primary ? saved.id : undefined);
    return saved;
  });
}
export async function makeDeliveryAddressPrimary(userId: string, id: string) {
  if (!z.string().cuid().safeParse(id).success) throw new DeliveryAddressError("INVALID");
  return ownedTransaction(userId, async (tx) => {
    const address = await tx.address.findFirst({ where: { id, userId, active: true }, select: { id: true } });
    if (!address) throw new DeliveryAddressError("NOT_FOUND");
    await keepOnePrimary(tx, userId, address.id);
  });
}
export async function archiveDeliveryAddress(userId: string, id: string) {
  if (!z.string().cuid().safeParse(id).success) throw new DeliveryAddressError("INVALID");
  return ownedTransaction(userId, async (tx) => {
    const address = await tx.address.findFirst({ where: { id, userId, active: true }, select: { id: true } });
    if (!address) throw new DeliveryAddressError("NOT_FOUND");
    await tx.address.update({ where: { id: address.id }, data: { active: false, isDefault: false } });
    await keepOnePrimary(tx, userId);
  });
}

import { prisma } from "@/lib/prisma";
import { unambiguousShippingZones } from "./coverage";

/** Only configured rates and public place names. No customer or operator information. */
export async function getPublicShippingCoverage() {
  const zones = await prisma.shippingZone.findMany({ where: { active: true },
    orderBy: [{ department: "asc" }, { province: "asc" }, { district: "asc" }, { id: "asc" }],
    select: { id: true, department: true, province: true, district: true, price: true } });
  const available = unambiguousShippingZones(zones);
  return { zones: available.map((zone) => ({ ...zone, price: zone.price.toFixed(2) })), hasReview: available.length !== zones.length };
}

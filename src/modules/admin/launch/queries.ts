import { prisma } from "@/lib/prisma";
import { getCommerceSettings } from "@/modules/settings/queries";
import { collectLaunchSnapshot } from "./readiness";

// Called only after requireAdmin. Reads current values; no provider requests or writes.
export function getLaunchSnapshot() {
  return collectLaunchSnapshot({
    activeProducts: () => prisma.product.count({ where: { active: true } }),
    inStockProducts: () => prisma.product.count({ where: { active: true, stock: { gt: 0 } } }),
    activeZones: () => prisma.shippingZone.count({ where: { active: true } }),
    zonesWithoutInstructions: () => prisma.shippingZone.count({ where: {
      active: true, OR: [{ deliveryInstructions: null }, { deliveryInstructions: "" }],
    } }),
    commerce: async () => {
      const settings = await getCommerceSettings();
      return { yapeReady: settings.yape.ready, transferReady: settings.transfer.ready,
        whatsappPhone: settings.whatsappPhone, contactEmail: settings.contactEmail };
    },
  });
}

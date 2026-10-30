import { DeliveryAddressForm } from "@/components/delivery-address-form";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { StoreHeader } from "@/components/store-header";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveShippingCoverage } from "@/modules/shipping/coverage";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};


export default async function EditAddressPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/iniciar-sesion?callbackUrl=/mi-cuenta/direcciones");
  }

  const { id } = await params;
  const [address, shippingZones] = await Promise.all([
    prisma.address.findFirst({
      where: { id, userId: session.user.id, active: true },
      select: {
        id: true,
        label: true,
        recipient: true,
        phone: true,
        department: true,
        province: true,
        district: true,
        addressLine1: true,
        reference: true,
        isDefault: true,
      },
    }),
    prisma.shippingZone.findMany({
      where: { active: true },
      orderBy: [{ department: "asc" }, { province: "asc" }, { district: "asc" }],
      select: { id: true, department: true, province: true, district: true, price: true },
    }),
  ]);

  if (!address) notFound();

  const coverage = resolveShippingCoverage(address, shippingZones);
  const selectedZone = coverage.kind === "available" ? coverage.zone : null;

  return (
    <main className="orderPage">
      <div className="catalogHeaderWrap compact"><StoreHeader /></div>

      <section className="shell accountToolShell narrow">
        <div className="accountToolHeading">
          <div>
            <p className="eyebrow wine">DIRECCIONES</p>
            <h1>Editar dirección</h1>
            <p>Actualiza los datos de entrega. Solo se pueden seleccionar zonas habilitadas por la tienda.</p>
          </div>
          <Link className="textLink" href="/mi-cuenta/direcciones">← Volver a direcciones</Link>
        </div>

        <section className="accountToolCard">
          <DeliveryAddressForm destination="account" addressId={address.id} zones={shippingZones.map((zone) => ({ ...zone, price: zone.price.toFixed(2) }))} initial={{ label: address.label ?? "", recipient: address.recipient, phone: address.phone, shippingZoneId: selectedZone?.id ?? "", addressLine1: address.addressLine1, reference: address.reference ?? "", isDefault: address.isDefault }} />
        </section>
      </section>
    </main>
  );
}

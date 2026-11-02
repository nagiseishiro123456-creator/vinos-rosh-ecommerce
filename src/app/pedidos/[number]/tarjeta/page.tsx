import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { StoreHeader } from "@/components/store-header";
import { IzipayTestForm } from "@/components/izipay-test-form";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { privatePageMetadata } from "@/lib/seo";
import { isMicuentawebFormEnabled } from "@/modules/payments/izipay/form-policy";
import { readMicuentawebPaymentStatus } from "@/modules/payments/izipay/status-service";
import "./test-form.css";
import { resolveGatewayEnvironment } from "@/modules/payments/izipay/gateway-settings";

export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata("Pago con Izipay");

export default async function IzipayTestPage({ params }: { params: Promise<{ number: string }> }) {
  const environment = await resolveGatewayEnvironment();
  if (!isMicuentawebFormEnabled(environment)) notFound();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/iniciar-sesion");
  const { number } = await params;
  const order = await prisma.order.findFirst({ where: { number, userId: session.user.id, paymentIntegration: "MICUENTAWEB_V4" }, select: { id: true, paymentMode: true } });
  if (!order) notFound();
  const mode = order.paymentMode ?? "TEST";
  if (mode !== environment.IZIPAY_MODE) notFound();
  const initial = await readMicuentawebPaymentStatus(session.user.id, order.id);
  return <main className="orderPage purchaseFlow"><div className="catalogHeaderWrap compact"><StoreHeader /></div>
    <section className="shell izipayTestPage"><h1>{mode === "TEST" ? "Prueba de pago con Izipay" : "Paga tu pedido con Izipay"}</h1>
      <p>{mode === "TEST" ? "Laboratorio de integración. Utiliza únicamente los medios de prueba asignados por el proveedor." : "El importe procede de tu pedido reservado. El resultado se confirmará desde el servidor."}</p>
      <IzipayTestForm key={`${session.user.id}:${order.id}`} initial={initial} expectedUserId={session.user.id} mode={mode === "PRODUCTION" ? "PRODUCTION" : "TEST"} />
    </section></main>;
}

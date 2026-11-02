import Image from "next/image";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, CreditCard, MessageSquare, Package, Settings2, ShoppingBag, Star, Truck, Users, Wallet } from "lucide-react";
import { formatPrice } from "@/lib/money";
import { requireAdmin } from "@/modules/admin/auth";
import { ORDER_LABELS, readAdminDashboard } from "@/modules/admin/dashboard/queries";
import { OrderChart } from "@/components/admin/order-chart";

export const dynamic = "force-dynamic";
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ period?: string | string[] }> }) {
  await requireAdmin("/admin");
  const { period } = await searchParams;
  const data = await readAdminDashboard(period);
  const now = new Date();
  const date = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Lima" }).format(now);
  const product = data.product;
  const metrics = [
    { label: "Ventas confirmadas", value: formatPrice(data.sales), detail: `${data.confirmedOrders} pedidos con pago confirmado`, href: "/admin/conciliacion", Icon: Wallet, tone: "violet" },
    { label: "Pedidos recibidos", value: data.orders.toLocaleString("es-PE"), detail: `Últimos ${data.period} días · todos los estados`, href: "/admin/pedidos", Icon: ShoppingBag, tone: "blue" },
    { label: "Clientes nuevos", value: data.customers.toLocaleString("es-PE"), detail: `Registrados en los últimos ${data.period} días`, href: "/admin/clientes", Icon: Users, tone: "green" },
    { label: "Stock disponible", value: (product?.stock ?? 0).toLocaleString("es-PE"), detail: product ? "Botellas disponibles ahora" : "Configura el producto ROSH", href: "/admin/producto", Icon: Package, tone: "amber" },
  ] as const;
  const pending = [
    { title: "Pagos por revisar", count: data.pending.paymentReview, href: "/admin/pagos", Icon: CreditCard, text: "Verificar operaciones recibidas", tone: "violet" },
    { title: "Pedidos en proceso", count: data.pending.fulfillment, href: "/admin/pedidos", Icon: Truck, text: "Preparación, envío y entrega", tone: "blue" },
    { title: "Reseñas pendientes", count: data.pending.reviews, href: "/admin/resenas", Icon: Star, text: "Revisar opiniones de clientes", tone: "amber" },
    { title: "Mensajes nuevos", count: data.pending.contacts, href: "/admin/contactos", Icon: MessageSquare, text: "Responder consultas recibidas", tone: "green" },
  ] as const;
  return <main className="shell adminPage adminOverview">
    <div className="adminTopbar"><div><p className="eyebrow">RESUMEN GENERAL</p><h1>Panel Vinos ROSH</h1><p>Tu negocio, de un vistazo. <span className="adminOverviewDate">{date}</span></p></div><Link className="button buttonPrimary" href="/admin/pedidos">Gestionar pedidos <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
    <div className="adminOverviewHeading"><p>Actividad de la tienda</p><nav className="adminPeriodTabs" aria-label="Período del resumen">{([7, 30, 90] as const).map(days => <Link key={days} href={`/admin?period=${days}`} aria-current={data.period === days ? "page" : undefined}>{days} días</Link>)}</nav></div>
    <section className="adminDashboardStats" aria-label="Indicadores de la tienda">{metrics.map(({ label, value, detail, href, Icon, tone }) => <Link href={href} className="adminMetricCard" key={label}><div><span className={`adminMetricIcon ${tone}`}><Icon size={21} strokeWidth={1.6} aria-hidden="true" /></span><ArrowUpRight size={15} className="adminMetricArrow" aria-hidden="true" /></div><span className="adminMetricLabel">{label}</span><strong data-testid={`metric-${tone}`}>{value}</strong><small>{detail}</small></Link>)}</section>
    <div className="adminOverviewGrid">
      <section className="adminDashboardCard adminSalesCard"><div className="adminCardHeading"><div><h2>Pedidos confirmados</h2><p>Últimos {data.period} días · hora de Perú</p></div><span className="adminLegend"><i /> Pago confirmado</span></div><OrderChart days={data.series} /><p className="adminMetricFootnote">Importes con envío incluido. Se excluyen pedidos reembolsados o cancelados; corresponden a su fecha de pago.</p></section>
      <section className="adminDashboardCard adminProductSummary"><div className="adminCardHeading"><div><h2>Tu producto</h2><p>Una sola botella. Una sola ficha.</p></div><span className={`adminBadge ${product?.active ? "success" : "muted"}`}>{product?.active ? "Publicado" : "Borrador"}</span></div><div className="adminProductVisual"><Image src="/media/rosh/landing/bottle.png" alt="Botella ROSH" width={135} height={260} sizes="135px" style={{ objectFit: "contain" }} /></div><h3>{product?.name ?? "ROSH · Zumo de uva 750 ml"}</h3><div className="adminProductFacts"><span>Precio<strong>{product && product.price !== "0.00" ? formatPrice(product.price) : "Por definir"}</strong></span><span>Disponibles<strong>{product?.stock ?? 0} botellas</strong></span></div><Link className="button buttonGhostLight" href="/admin/producto">Editar producto y stock <ArrowRight size={16} aria-hidden="true" /></Link></section>
    </div>
    <div className="adminOverviewHeading"><p>Por atender <span>Estado actual de la operación</span></p></div>
    <section className="adminPendingGrid" aria-label="Pendientes actuales">{pending.map(({ title, count, href, Icon, text, tone }) => <Link href={href} className="adminPendingCard" key={title}><span className={`adminMetricIcon ${tone}`}><Icon size={20} strokeWidth={1.6} aria-hidden="true" /></span><div><strong>{count} <span>{title.toLowerCase()}</span></strong><small>{text}</small></div><ArrowUpRight size={15} aria-hidden="true" /></Link>)}</section>
    <section className="adminDashboardCard adminRecentOrders"><div className="adminCardHeading"><div><h2>Últimos pedidos</h2><p>Los seis más recientes, en todos los estados</p></div><Link href="/admin/pedidos">Ver todos <ArrowRight size={15} aria-hidden="true" /></Link></div>{data.latest.length ? <div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Pedido</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Estado</th><th><span className="sr-only">Acción</span></th></tr></thead><tbody>{data.latest.map(order => <tr key={order.id}><td><Link href={`/admin/pedidos/${order.id}`} className="adminTextButton">{order.number}</Link></td><td>{order.user.firstName} {order.user.lastName}</td><td>{order.createdAt.toLocaleDateString("es-PE", { timeZone: "America/Lima" })}</td><td>{formatPrice(order.total)}</td><td><span className={`adminBadge status-${order.status.toLowerCase()}`}>{ORDER_LABELS[order.status]}</span></td><td><Link className="adminTextButton" href={`/admin/pedidos/${order.id}`} aria-label={`Ver pedido ${order.number}`}>Ver <ArrowUpRight size={13} aria-hidden="true" /></Link></td></tr>)}</tbody></table></div> : <div className="adminOverviewEmpty"><CheckCircle2 size={26} strokeWidth={1.5} aria-hidden="true" /><strong>Todo listo para tu primer pedido</strong><p>Los pedidos reales aparecerán aquí cuando tus clientes completen la compra.</p><Link href="/admin/producto">Revisar producto y stock <ArrowRight size={15} aria-hidden="true" /></Link></div>}</section>
    <section className="adminQuickLinks" aria-label="Accesos de administración"><Link href="/admin/historia"><BookOpen size={19} aria-hidden="true" /><span>Editar Nuestra historia<small>Textos e imágenes de tu marca</small></span><ArrowUpRight size={15} aria-hidden="true" /></Link><Link href="/admin/configuracion"><Settings2 size={19} aria-hidden="true" /><span>Configuración de la tienda<small>Datos del negocio y medios de pago</small></span><ArrowUpRight size={15} aria-hidden="true" /></Link><Link href="/admin/respaldo"><ArrowDownToLine size={19} aria-hidden="true" /><span>Respaldo de información<small>Descargar los datos del negocio</small></span><ArrowUpRight size={15} aria-hidden="true" /></Link></section>
  </main>;
}

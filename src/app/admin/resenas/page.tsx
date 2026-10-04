import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";
import { moderateReview } from "@/modules/reviews/actions";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  await requireAdmin("/admin/resenas");

  const reviews = await prisma.review.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      rating: true,
      comment: true,
      status: true,
      createdAt: true,
      product: { select: { name: true, slug: true } },
      user: { select: { firstName: true, lastName: true, email: true } },
      order: { select: { number: true, status: true } },
    },
  });

  const pendingCount = reviews.filter((review) => review.status === "PENDING").length;
  const approvedCount = reviews.filter((review) => review.status === "APPROVED").length;
  const rejectedCount = reviews.filter((review) => review.status === "REJECTED").length;

  return (
    <main className="shell adminPage">
      <div className="adminTopbar">
        <div>
          <p className="eyebrow wine">RESEÑAS VERIFICADAS</p>
          <h1>Moderación</h1>
          <p className="adminIntro">Todas las reseñas provienen de productos incluidos en pedidos entregados.</p>
        </div>
        <Link className="button buttonGhostLight" href="/admin">Panel</Link>
      </div>

      <section className="adminStatsGrid">
        <article><span>Pendientes</span><strong>{pendingCount}</strong></article>
        <article><span>Aprobadas</span><strong>{approvedCount}</strong></article>
        <article><span>Rechazadas</span><strong>{rejectedCount}</strong></article>
      </section>

      {reviews.length === 0 ? (
        <section className="adminEmptyState">
          <strong>No hay reseñas todavía.</strong>
          <p>Las reseñas aparecerán cuando un pedido haya sido entregado y el comprador publique su opinión.</p>
        </section>
      ) : (
        <section className="adminReviewList">
          {reviews.map((review) => {
            const approveAction = moderateReview.bind(null, review.id, "APPROVED");
            const rejectAction = moderateReview.bind(null, review.id, "REJECTED");

            return (
              <article className="adminReviewCard" key={review.id}>
                <div className="adminReviewHeader">
                  <div>
                    <span className="stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                    <strong>{review.product.name}</strong>
                    <small>{review.user.firstName} {review.user.lastName} · {review.user.email}</small>
                  </div>
                  <span className={`adminBadge ${review.status === "APPROVED" ? "success" : review.status === "REJECTED" ? "danger" : "warning"}`}>{review.status}</span>
                </div>

                <p>{review.comment || "Sin comentario escrito."}</p>

                <div className="adminReviewMeta">
                  <span>Pedido: <strong>{review.order.number}</strong></span>
                  <span>Estado del pedido: <strong>{review.order.status}</strong></span>
                  <span>{formatDate(review.createdAt)}</span>
                </div>

                <div className="adminReviewActions">
                  <Link className="adminTextButton" href={`/productos/${review.product.slug}`}>Ver producto</Link>
                  <form action={approveAction}><button className="button buttonPrimary" type="submit">Aprobar</button></form>
                  <form action={rejectAction}><button className="button adminRejectButton" type="submit">Rechazar</button></form>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

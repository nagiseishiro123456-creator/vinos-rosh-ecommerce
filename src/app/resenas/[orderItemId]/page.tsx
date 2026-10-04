import { OrderStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { StoreHeader } from "@/components/store-header";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submitVerifiedReview } from "@/modules/reviews/actions";

type ReviewPageProps = {
  params: Promise<{ orderItemId: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function ReviewPage({ params, searchParams }: ReviewPageProps) {
  const { orderItemId } = await params;
  const query = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/iniciar-sesion?callbackUrl=${encodeURIComponent(`/resenas/${orderItemId}`)}`);
  }

  const item = await prisma.orderItem.findFirst({
    where: {
      id: orderItemId,
      order: {
        userId: session.user.id,
        status: OrderStatus.DELIVERED,
      },
    },
    select: {
      id: true,
      productName: true,
      order: { select: { number: true } },
      review: { select: { id: true, rating: true, status: true } },
    },
  });

  if (!item) notFound();

  if (item.review) {
    return (
      <main className="orderPage">
        <div className="catalogHeaderWrap compact"><StoreHeader /></div>
        <section className="shell reviewFormShell">
          <p className="eyebrow wine">COMPRA VERIFICADA</p>
          <h1>Reseña registrada</h1>
          <p>Este producto ya tiene una reseña asociada a tu compra. Estado: <strong>{item.review.status}</strong>.</p>
          <Link className="button buttonDark" href={`/pedidos/${item.order.number}`}>Volver al pedido</Link>
        </section>
      </main>
    );
  }

  const action = submitVerifiedReview.bind(null, item.id);

  return (
    <main className="orderPage">
      <div className="catalogHeaderWrap compact"><StoreHeader /></div>
      <section className="shell reviewFormShell">
        <div>
          <p className="eyebrow wine">COMPRA VERIFICADA</p>
          <h1>¿Qué te pareció?</h1>
          <p className="reviewFormLead">Tu reseña corresponde a <strong>{item.productName}</strong> del pedido {item.order.number}.</p>
        </div>

        {query.status === "invalid" ? <div className="adminAlert error">Selecciona una puntuación válida y revisa el comentario.</div> : null}

        <form action={action} className="reviewFormCard">
          <fieldset>
            <legend>Puntuación</legend>
            <div className="reviewStarsInput">
              {[5, 4, 3, 2, 1].map((rating) => (
                <label key={rating}>
                  <input type="radio" name="rating" value={rating} required />
                  <span>{rating} ★</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="adminField">
            <span>Comentario</span>
            <textarea name="comment" rows={7} maxLength={1200} placeholder="Cuéntanos sobre sabor, presentación, atención o entrega." />
          </label>

          <p className="reviewModerationNote">La reseña se enviará a moderación antes de publicarse. Solo compradores con pedidos entregados pueden llegar a esta pantalla.</p>

          <div className="adminTopbarActions">
            <button className="button buttonPrimary" type="submit">Enviar reseña</button>
            <Link className="button buttonGhostLight" href={`/pedidos/${item.order.number}`}>Cancelar</Link>
          </div>
        </form>
      </section>
    </main>
  );
}

import { ContactMessageStatus } from "@prisma/client";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";
import { updateContactMessageStatus } from "@/modules/admin/contact/actions";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminContactMessagesPage() {
  await requireAdmin("/admin/contactos");

  const messages = await prisma.contactMessage.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const newCount = messages.filter((message) => message.status === "NEW").length;

  return (
    <main className="shell adminPage">
      <div className="adminTopbar">
        <div>
          <p className="eyebrow wine">ATENCIÓN</p>
          <h1>Mensajes de contacto</h1>
          <p className="adminIntro">
            Bandeja interna almacenada en PostgreSQL. No requiere un proveedor de correo para recibir consultas.
          </p>
        </div>
        <Link className="button buttonGhostLight" href="/admin">← Panel</Link>
      </div>

      <div className="adminFreeMode">
        <strong>{newCount} mensaje{newCount === 1 ? "" : "s"} nuevo{newCount === 1 ? "" : "s"}</strong>
        <span>Los últimos 100 mensajes se muestran aquí para mantener la operación simple.</span>
      </div>

      <section className="contactAdminList">
        {messages.length > 0 ? messages.map((message) => {
          const readAction = updateContactMessageStatus.bind(null, message.id, ContactMessageStatus.READ);
          const resolveAction = updateContactMessageStatus.bind(null, message.id, ContactMessageStatus.RESOLVED);

          return (
            <article className={`contactAdminCard status-${message.status.toLowerCase()}`} key={message.id}>
              <div className="contactAdminTop">
                <div>
                  <span className="contactAdminStatus">{message.status}</span>
                  <strong>{message.subject || "Consulta general"}</strong>
                </div>
                <small>{formatDate(message.createdAt)}</small>
              </div>

              <div className="contactAdminSender">
                <strong>{message.name}</strong>
                <a href={`mailto:${message.email}`}>{message.email}</a>
                {message.phone ? <span>{message.phone}</span> : null}
              </div>

              <p>{message.message}</p>

              <div className="contactAdminActions">
                {message.status === ContactMessageStatus.NEW ? (
                  <form action={readAction}>
                    <button className="button buttonGhostLight" type="submit">Marcar leído</button>
                  </form>
                ) : null}
                {message.status !== ContactMessageStatus.RESOLVED ? (
                  <form action={resolveAction}>
                    <button className="button buttonDark" type="submit">Resolver</button>
                  </form>
                ) : null}
              </div>
            </article>
          );
        }) : (
          <div className="emptyPanel">
            <strong>Todavía no hay mensajes.</strong>
            <p>Las consultas enviadas desde /contacto aparecerán aquí.</p>
          </div>
        )}
      </section>
    </main>
  );
}

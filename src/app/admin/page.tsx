import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/iniciar-sesion?callbackUrl=/admin");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/mi-cuenta");
  }

  const modules = [
    ["Productos", "Catálogo, precio, imágenes y visibilidad."],
    ["Inventario", "Stock real y alertas de disponibilidad."],
    ["Pedidos", "Preparación, envío, entrega y cancelaciones."],
    ["Pagos", "Culqi y revisión manual de Yape/transferencias."],
    ["Envíos", "Tarifas administrables por distrito."],
    ["Reseñas", "Moderación de opiniones verificadas."],
  ] as const;

  return (
    <main className="shell" style={{ padding: "80px 0" }}>
      <span className="eyebrow wine">ADMINISTRACIÓN</span>
      <h2>Panel Vinos ROSH</h2>
      <p style={{ color: "#756860", maxWidth: 720, lineHeight: 1.7 }}>
        Sesión administrativa verificada. Este panel crecerá por módulos sin exponer
        operaciones de administración al storefront público.
      </p>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginTop: 30,
        }}
      >
        {modules.map(([title, description]) => (
          <article
            key={title}
            style={{
              background: "white",
              border: "1px solid #e7d8cf",
              borderRadius: 16,
              padding: 22,
            }}
          >
            <strong>{title}</strong>
            <p style={{ color: "#756860", lineHeight: 1.55 }}>{description}</p>
          </article>
        ))}
      </section>

      <p style={{ marginTop: 34 }}>
        <Link className="primaryButton" href="/">
          Ver tienda
        </Link>
      </p>
    </main>
  );
}

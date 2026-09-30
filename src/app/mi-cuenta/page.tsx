import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/iniciar-sesion");
  }

  return (
    <main className="shell" style={{ padding: "80px 0" }}>
      <span className="eyebrow wine">MI CUENTA</span>
      <h2>Hola, {session.user.name ?? "cliente ROSH"}</h2>
      <p style={{ color: "#756860", maxWidth: 680, lineHeight: 1.7 }}>
        Esta será tu zona privada para administrar direcciones, revisar pedidos,
        consultar el estado de tus compras y publicar reseñas verificadas.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 30,
        }}
      >
        {[
          ["Pedidos", "Próximamente: historial y seguimiento."],
          ["Direcciones", "Próximamente: direcciones de entrega."],
          ["Reseñas", "Solo para compras entregadas y verificadas."],
          ["Perfil", `Cuenta: ${session.user.email ?? ""}`],
        ].map(([title, description]) => (
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
            <p style={{ color: "#756860", lineHeight: 1.5 }}>{description}</p>
          </article>
        ))}
      </div>

      <p style={{ marginTop: 34 }}>
        <Link className="primaryButton" href="/">
          Volver a la tienda
        </Link>
      </p>
    </main>
  );
}

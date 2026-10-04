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
    { title: "Productos", description: "Catálogo, precio, imágenes y visibilidad.", href: null },
    { title: "Inventario", description: "Stock real y alertas de disponibilidad.", href: null },
    { title: "Pedidos", description: "Preparación, envío, entrega y cancelaciones.", href: null },
    { title: "Pagos", description: "Revisión manual de Yape/transferencias y, luego, Culqi.", href: "/admin/pagos" },
    { title: "Envíos", description: "Tarifas administrables por distrito usadas por el checkout.", href: "/admin/envios" },
    { title: "Reseñas", description: "Moderación de opiniones verificadas.", href: null },
  ] as const;

  return (
    <main className="shell adminPage">
      <span className="eyebrow wine">ADMINISTRACIÓN</span>
      <h1>Panel Vinos ROSH</h1>
      <p className="adminIntro">
        Sesión administrativa verificada. Los módulos operativos se habilitan de forma incremental sin exponer funciones internas al storefront público.
      </p>

      <section className="adminModuleGrid">
        {modules.map((module) => {
          const content = (
            <>
              <strong>{module.title}</strong>
              <p>{module.description}</p>
              <small>{module.href ? "Abrir módulo →" : "Próximo sprint"}</small>
            </>
          );

          return module.href ? (
            <Link className="adminModuleCard active" href={module.href} key={module.title}>
              {content}
            </Link>
          ) : (
            <article className="adminModuleCard" key={module.title}>
              {content}
            </article>
          );
        })}
      </section>

      <p className="adminBackLink">
        <Link className="button buttonDark" href="/">
          Ver tienda
        </Link>
      </p>
    </main>
  );
}

import Link from "next/link";

import { requireAdmin } from "@/modules/admin/auth";

export default async function AdminPage() {
  await requireAdmin("/admin");

  const modules = [
    { title: "Productos", description: "Catálogo, precio, imágenes y visibilidad.", href: "/admin/productos" },
    { title: "Inventario", description: "Stock real y alertas de disponibilidad.", href: "/admin/inventario" },
    { title: "Pedidos", description: "Preparación, envío y confirmación de entrega.", href: "/admin/pedidos" },
    { title: "Clientes", description: "Cuentas registradas, pedidos, direcciones y reseñas.", href: "/admin/clientes" },
    { title: "Pagos", description: "Revisión manual de Yape/transferencias y, luego, Culqi opcional.", href: "/admin/pagos" },
    { title: "Envíos", description: "Tarifas administrables por distrito usadas por el checkout.", href: "/admin/envios" },
    { title: "Reseñas", description: "Moderación de opiniones de compras entregadas y verificadas.", href: "/admin/resenas" },
  ] as const;

  return (
    <main className="shell adminPage">
      <span className="eyebrow wine">ADMINISTRACIÓN</span>
      <h1>Panel Vinos ROSH</h1>
      <p className="adminIntro">
        Sesión administrativa verificada. Los módulos operativos se habilitan de forma incremental sin exponer funciones internas al storefront público.
      </p>

      <div className="adminFreeMode">
        <strong>Modo sin costos activado</strong>
        <span>El desarrollo prioriza herramientas open source y planes gratuitos. Culqi permanece opcional y desactivado hasta que el cliente decida usarlo.</span>
      </div>

      <section className="adminModuleGrid">
        {modules.map((module) => (
          <Link className="adminModuleCard active" href={module.href} key={module.title}>
            <strong>{module.title}</strong>
            <p>{module.description}</p>
            <small>Abrir módulo →</small>
          </Link>
        ))}
      </section>

      <p className="adminBackLink">
        <Link className="button buttonDark" href="/">
          Ver tienda
        </Link>
      </p>
    </main>
  );
}

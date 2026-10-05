import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";
import {
  createCategory,
  setCategoryActive,
  updateCategory,
} from "@/modules/admin/categories/actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ status?: string }>;
};

function messageFor(status?: string) {
  const messages: Record<string, { kind: "success" | "error"; text: string }> = {
    created: { kind: "success", text: "Categoría creada correctamente." },
    updated: { kind: "success", text: "Categoría actualizada." },
    duplicate: { kind: "error", text: "Ya existe una categoría con ese nombre." },
    invalid: { kind: "error", text: "Revisa el nombre y la descripción." },
  };
  return status ? messages[status] : undefined;
}

export default async function AdminCategoriesPage({ searchParams }: Props) {
  await requireAdmin("/admin/categorias");
  const params = await searchParams;
  const feedback = messageFor(params.status);

  const categories = await prisma.category.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      active: true,
      _count: { select: { products: true } },
    },
  });

  return (
    <main className="shell adminPage adminCategoryPage">
      <div className="adminTopbar">
        <div>
          <p className="eyebrow wine">CATÁLOGO</p>
          <h1>Categorías</h1>
          <p className="adminIntro">Organiza el catálogo sin tocar código. Desactivar una categoría no elimina sus productos.</p>
        </div>
        <div className="adminTopbarActions">
          <Link className="button buttonGhostLight" href="/admin/productos">Productos</Link>
          <Link className="button buttonGhostLight" href="/admin">Panel</Link>
        </div>
      </div>

      {feedback ? <div className={`adminAlert ${feedback.kind}`}>{feedback.text}</div> : null}

      <section className="adminCategoryGrid">
        <article className="adminPanel">
          <p className="eyebrow wine">NUEVA</p>
          <h2>Crear categoría</h2>
          <form className="adminForm compact" action={createCategory}>
            <label className="adminField">
              <span>Nombre</span>
              <input name="name" required minLength={2} maxLength={100} placeholder="Ej. Clásicos" />
            </label>
            <label className="adminField">
              <span>Descripción</span>
              <textarea name="description" rows={4} maxLength={500} placeholder="Descripción opcional" />
            </label>
            <button className="button buttonPrimary" type="submit">Crear categoría</button>
          </form>
        </article>

        <section className="adminCategoryList">
          {categories.length === 0 ? (
            <div className="adminEmptyState">
              <strong>Aún no existen categorías.</strong>
              <p>Puedes crear la primera desde el formulario.</p>
            </div>
          ) : categories.map((category) => {
            const editAction = updateCategory.bind(null, category.id);
            const toggleAction = setCategoryActive.bind(null, category.id, !category.active);

            return (
              <article className="adminCategoryCard" key={category.id}>
                <div className="adminCategoryCardHeading">
                  <div>
                    <strong>{category.name}</strong>
                    <small>/{category.slug} · {category._count.products} producto(s)</small>
                  </div>
                  <span className={category.active ? "adminBadge success" : "adminBadge muted"}>
                    {category.active ? "Activa" : "Oculta"}
                  </span>
                </div>

                <form className="adminForm compact" action={editAction}>
                  <label className="adminField">
                    <span>Nombre</span>
                    <input name="name" required minLength={2} maxLength={100} defaultValue={category.name} />
                  </label>
                  <label className="adminField">
                    <span>Descripción</span>
                    <textarea name="description" rows={3} maxLength={500} defaultValue={category.description ?? ""} />
                  </label>
                  <div className="adminCategoryActions">
                    <button className="button buttonDark" type="submit">Guardar</button>
                  </div>
                </form>

                <form action={toggleAction}>
                  <button className="adminTextButton" type="submit">
                    {category.active ? "Ocultar categoría" : "Activar categoría"}
                  </button>
                </form>
              </article>
            );
          })}
        </section>
      </section>
    </main>
  );
}

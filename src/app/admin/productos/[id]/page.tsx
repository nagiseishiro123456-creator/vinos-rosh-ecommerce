import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";
import { updateProduct } from "@/modules/admin/products/actions";
import { ProductForm } from "@/modules/admin/products/product-form";

type EditProductPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

function statusMessage(status?: string) {
  if (status === "created") return { kind: "success", text: "Producto creado correctamente." };
  if (status === "updated") return { kind: "success", text: "Cambios guardados correctamente." };
  if (status === "invalid") return { kind: "error", text: "Revisa los campos obligatorios y los valores ingresados." };
  if (status === "invalid-slug") return { kind: "error", text: "No se pudo generar un slug válido." };
  if (status === "duplicate") return { kind: "error", text: "El slug o SKU ya pertenece a otro producto." };
  return null;
}

export default async function EditProductPage({ params, searchParams }: EditProductPageProps) {
  const { id } = await params;
  await requireAdmin(`/admin/productos/${id}`);

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      shortDescription: true,
      description: true,
      price: true,
      stock: true,
      featured: true,
      active: true,
      category: { select: { name: true } },
      images: {
        orderBy: { position: "asc" },
        take: 1,
        select: { url: true },
      },
    },
  });

  if (!product) notFound();

  const { status } = await searchParams;
  const message = statusMessage(status);
  const updateAction = updateProduct.bind(null, product.id);

  return (
    <main className="shell adminPage adminFormPage">
      <div className="adminTopbar">
        <div>
          <p className="eyebrow wine">CATÁLOGO</p>
          <h1>Editar producto</h1>
          <p className="adminIntro">{product.name}</p>
        </div>
        <div className="adminTopbarActions">
          <Link className="button buttonGhostLight" href="/admin/productos">Productos</Link>
          {product.active ? <Link className="button buttonDark" href={`/productos/${product.slug}`}>Ver en tienda</Link> : null}
        </div>
      </div>

      {message ? <div className={`adminAlert ${message.kind}`}>{message.text}</div> : null}

      <section className="adminPanel">
        <ProductForm
          action={updateAction}
          submitLabel="Guardar cambios"
          values={{
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            shortDescription: product.shortDescription,
            description: product.description,
            price: Number(product.price).toFixed(2),
            stock: product.stock,
            categoryName: product.category?.name ?? null,
            imageUrl: product.images[0]?.url ?? null,
            featured: product.featured,
            active: product.active,
          }}
        />
      </section>
    </main>
  );
}

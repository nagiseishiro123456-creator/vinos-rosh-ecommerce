import Link from "next/link";
import { redirect } from "next/navigation";
import { getRoshProduct } from "@/modules/products/single-product";

import { requireAdmin } from "@/modules/admin/auth";
import { createProduct } from "@/modules/admin/products/actions";
import { ProductForm } from "@/modules/admin/products/product-form";

type NewProductPageProps = {
  searchParams: Promise<{ status?: string }>;
};

function statusMessage(status?: string) {
  if (status === "invalid") return "Revisa los campos obligatorios y los valores ingresados.";
  if (status === "invalid-slug") return "No se pudo generar un identificador válido para el producto.";
  if (status === "duplicate") return "El slug o SKU ya pertenece a otro producto.";
  return null;
}

export default async function NewProductPage({ searchParams }: NewProductPageProps) {
  await requireAdmin("/admin/productos/nuevo");
  if (await getRoshProduct()) redirect("/admin/producto");
  const { status } = await searchParams;
  const message = statusMessage(status);

  return (
    <main className="shell adminPage adminFormPage">
      <div className="adminTopbar">
        <div>
          <p className="eyebrow wine">CATÁLOGO</p>
          <h1>Nuevo producto</h1>
          <p className="adminIntro">Carga únicamente información real o validada por el cliente.</p>
        </div>
        <Link className="button buttonGhostLight" href="/admin/productos">Volver a productos</Link>
      </div>

      {message ? <div className="adminAlert error">{message}</div> : null}

      <section className="adminPanel">
        <ProductForm action={createProduct} submitLabel="Crear producto ROSH" values={{active:false,imageUrl:"/media/rosh/landing-2/bottle-up.png",sku:"ROSH-750",name:"ROSH · Zumo de uva 750 ml"}} />
      </section>
    </main>
  );
}

import Link from "next/link";
import { requireAdmin } from "@/modules/admin/auth";
import { getRoshProduct } from "@/modules/products/single-product";
import { updateProduct } from "@/modules/admin/products/actions";
import { ProductForm } from "@/modules/admin/products/product-form";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
export default async function ProductAdmin(){
 await requireAdmin("/admin/producto");const product=await getRoshProduct();
 const movements=product?await prisma.inventoryMovement.findMany({where:{productId:product.id},orderBy:{createdAt:"desc"},take:30}):[];
 return <main className="shell adminPage"><div className="adminTopbar"><div><p className="eyebrow wine">ROSH · 750 ML</p><h1>Producto</h1><p>Precio, descripción de origen y existencias del único producto de la tienda.</p></div><Link href="/admin">Panel</Link></div>
 {!product?<section className="adminPanel"><h2>Configura el producto real</h2><p>Los registros de ejemplo no se vinculan a la landing. El producto ROSH se identifica con el SKU único ROSH-750.</p><Link className="button buttonPrimary" href="/admin/productos/nuevo">Crear producto ROSH</Link><p>Si ya existe, asigna el SKU ROSH-750 al editarlo. El precio y el origen deben estar confirmados antes de publicarlo.</p></section>:<><p className="adminAlert">Stock actual: {product.stock} unidades. Los cambios de existencias se registran en el historial.</p><section className="adminPanel"><ProductForm action={updateProduct.bind(null,product.id)} submitLabel="Guardar producto e inventario" values={{...product,categoryName:product.category?.name,price:product.price.toFixed(2),imageUrl:product.images[0]?.url}} /></section><section className="adminPanel"><h2>Movimientos de inventario</h2><ul>{movements.map(m=><li key={m.id}>{m.createdAt.toLocaleString("es-PE")} · {({INITIAL_STOCK:"Stock inicial",MANUAL_ADJUSTMENT:"Ajuste manual",ORDER_RESERVATION:"Reserva",ORDER_RELEASE:"Liberación"} as Record<string,string>)[m.type]??"Movimiento"} · {m.quantity} unidades · saldo {m.stockAfter}</li>)}</ul></section></>}
 </main>;
}

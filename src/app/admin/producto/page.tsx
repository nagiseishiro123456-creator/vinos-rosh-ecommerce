import Link from "next/link";
import { requireAdmin } from "@/modules/admin/auth";
import { getRoshProduct } from "@/modules/products/single-product";
import { saveSingleProduct } from "@/modules/admin/products/save-single-product";
import { LANDING_FIELDS,LANDING_LIMITS,resolveLandingCopy } from "@/modules/products/landing-content";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
export default async function ProductAdmin({searchParams}:{searchParams:Promise<{status?:string}>}){
 await requireAdmin("/admin/producto");
 const product=await getRoshProduct();const copy=resolveLandingCopy(product?.landingContent,product??undefined);const {status}=await searchParams;
 const movements=product?await prisma.inventoryMovement.findMany({where:{productId:product.id},orderBy:{createdAt:"desc"},take:30}):[];
 return <main className="shell adminPage"><div className="adminTopbar"><div><h1>Producto</h1><p>Guarda aquí el único producto, sus existencias y los textos de la landing. Los textos se actualizan al guardar; la compra requiere precio confirmado y publicación activada.</p></div><Link href="/admin">Panel</Link></div>
 {status&&<p role="status" className="adminAlert">{status==="updated"?"Producto, stock y textos guardados.":status==="price-required"?"Datos guardados en borrador. Confirma un precio mayor que cero para habilitar la compra.":"Revisa los campos: stock entero entre 0 y 999999, precio válido y textos completos."}</p>}
 <form action={saveSingleProduct} className="adminForm adminPanel"><h2>Venta e inventario</h2><div className="adminFormGrid">
 <label className="adminField">Nombre del producto<input name="name" required minLength={2} maxLength={120} defaultValue={product?.name??"ROSH · Zumo de uva 750 ml"}/></label>
 <div className="adminField"><label htmlFor="single-price">Precio (S/)</label><input id="single-price" name="price" type="number" min="0" max="999999" step="0.01" defaultValue={product?.price.toNumber()?product.price.toFixed(2):""}/><small>Puedes dejarlo pendiente en borrador. Para vender, confirma el precio y activa la publicación.</small></div>
 <div className="adminField"><label htmlFor="single-stock">Stock disponible</label><input id="single-stock" name="stock" type="number" min="0" max="999999" step="1" required defaultValue={product?.stock??0}/><small>Las reservas descuentan existencias; cancelaciones y vencimientos las liberan.</small></div>
 </div><label className="adminCheckbox"><input type="checkbox" name="active" defaultChecked={product?.active??false}/>Publicar producto y habilitar compra</label>
 <h2>Textos de la landing</h2><div className="adminFormGrid">{LANDING_FIELDS.map(([key,label])=><div className="adminField adminFieldWide" key={key}><label htmlFor={`copy-${key}`}>{label}</label><textarea id={`copy-${key}`} name={key} required maxLength={LANDING_LIMITS[key]} rows={key==="headline"||key==="features"?3:2} defaultValue={copy[key]}/></div>)}</div>
 <button className="button buttonPrimary" type="submit">Guardar producto, stock y textos</button></form>
 <section className="adminPanel"><h2>Movimientos de inventario</h2><ul>{movements.map(m=><li key={m.id}>{m.createdAt.toLocaleString("es-PE",{timeZone:"America/Lima"})} · {m.quantity>0?"Ingreso":"Salida"} de {Math.abs(m.quantity)} · saldo {m.stockAfter} · {m.note}</li>)}</ul></section></main>;
}

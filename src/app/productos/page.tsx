import type { Metadata } from "next";
import Link from "next/link";
import { StoreHeader } from "@/components/store-header";
import { getRoshProduct } from "@/modules/products/single-product";
import { publicPageMetadata } from "@/lib/seo";
import { ProductCard } from "@/components/product-card";
export const dynamic="force-dynamic";
export async function generateMetadata({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}):Promise<Metadata>{const q=await searchParams;return publicPageMetadata({path:"/productos",title:"Producto ROSH",description:"Zumo de uva ROSH, 750 ml, sin alcohol.",filtered:Boolean(q.q||q.categoria||q.stock||q.orden)});}
export default async function ProductPage(){const p=await getRoshProduct();return <main className="catalogPage"><div className="catalogHeaderWrap"><StoreHeader/><div className="catalogHero shell"><p className="eyebrow">ROSH · 750 ML</p><h1>Producto ROSH</h1><p>Una sola botella. Un solo vino.</p></div></div><section className="storeSection shell">{p?.active?<div className="productGrid"><ProductCard product={{id:p.id,name:p.name,slug:p.slug,shortDescription:p.shortDescription,price:p.price.toFixed(2),stock:p.stock,imageUrl:p.images[0]?.url??null,rating:null,reviewCount:0}}/></div>:<p>Próximamente podrás comprar ROSH aquí.</p>}<Link href="/#pour" className="textLink">Descubre ROSH →</Link></section></main>;}

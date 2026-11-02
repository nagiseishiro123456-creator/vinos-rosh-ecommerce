"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccountCart, useCartPanel } from "@/components/cart-provider";
import { useGuestCart } from "@/components/guest-cart-provider";
import { formatPrice } from "@/lib/money";

export type PourProduct = {id:string;price:string;stock:number;origin:string};
const clamp=(v:number)=>Math.min(1,Math.max(0,v));
const ease=(v:number)=>.5-.5*Math.cos(Math.PI*clamp(v));
export function PourLanding({product,userId}:{product:PourProduct|null;userId:string|null}){
 const section=useRef<HTMLDivElement>(null);const [quantity,setQuantity]=useState(1);const [busy,setBusy]=useState(false);
 const lock=useRef(false);const guest=useGuestCart();const account=useAccountCart();const panel=useCartPanel();const router=useRouter();
 useEffect(()=>{
  const root=section.current;if(!root)return;const page=root.closest<HTMLElement>(".roshLanding");
  const pour=root.querySelector<HTMLElement>("#pour")!;const logo=root.querySelector<HTMLElement>("#plogo")!;
  const stream=root.querySelector<HTMLElement>("#pstream")!;const bottle=root.querySelector<HTMLElement>("#pb")!;
  const volume=root.querySelector<HTMLElement>("#pvol")!;const ml=root.querySelector<HTMLElement>("#pml")!;const buy=root.querySelector<HTMLElement>("#pbuy")!;
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  root.dataset.ready="true";
  function paint(){
   const r=pour.getBoundingClientRect(),p=reduced.matches?.9:clamp(-r.top/Math.max(1,r.height-innerHeight));
   const appear=ease(p/.07),fill=ease((p-.07)/.38),gone=ease((p-.45)/.08),move=ease((p-.53)/.17);
   root!.dataset.progress=p.toFixed(3);
   if(page)page.dataset.night=String(r.top<=84);
   logo.style.opacity=String(appear*(1-gone));logo.style.transform=`translateY(${-gone*10}px)`;logo.style.setProperty("--lt",fill*100+"%");
   stream.style.opacity=String(p>.07&&p<.46?1-gone:0);
   bottle.style.setProperty("--top",98-98*fill+"%");bottle.style.setProperty("--lv",98-98*fill+"%");bottle.style.opacity=String(appear);
   ml.textContent=String(Math.round(750*fill));volume.style.opacity=String((p>.07?1:0)*(1-gone));
   const mobile=innerWidth<=820;
   if(mobile){const up=Math.max(0,bottle.offsetTop-78);bottle.style.translate=`-50% ${-move*up}px`;bottle.style.scale=String(1-.26*move);}
   else{bottle.style.scale="1";bottle.style.translate=`calc(-50% + ${-move*innerWidth*.215}px) 0`;}
   buy.style.opacity=String(move);buy.style.transform=`translateX(${mobile?0:(1-move)*28}px) translateY(${mobile?(1-move)*20:0}px)`;
   buy.classList.toggle("on",move>.6);buy.inert=move<=.6;
  }
  // The intro owns the page's one scroll listener and dispatches this event from its RAF.
  page?.addEventListener("rosh:scroll",paint);window.addEventListener("resize",paint);reduced.addEventListener("change",paint);paint();
  return ()=>{page?.removeEventListener("rosh:scroll",paint);window.removeEventListener("resize",paint);reduced.removeEventListener("change",paint);delete page?.dataset.night;};
 },[]);
 async function add(trigger:HTMLButtonElement){
  if(!product||lock.current)return;
  if(panel.userId!==userId){router.refresh();return;}
  if(userId&&(guest.items.length||guest.pending)){router.push("/carrito");return;}
  lock.current=true;setBusy(true);
  try{
   for(let i=0;i<quantity;i++){
    if(userId){if(!await account.command({action:"add",productId:product.id}))break;}
    else await guest.add(product.id);
   }
   panel.openCart(trigger);
  }finally{lock.current=false;setBusy(false);}
 }
 return <div ref={section} className="roshPour">
 <section className="night pour2" id="pour" aria-label="ROSH, una sola botella">
 <div className="st2">
 <div id="plogo" aria-hidden="true"><i className="pa"/><i className="pb2"/></div><div id="pstream" aria-hidden="true"/>
 <div id="pb" role="img" aria-label="Botella ROSH, zumo de uva sin alcohol, 750 mililitros">
 {/* Both layers compose one bottle, not separate products. */}
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img className="empty" src="/media/rosh/landing-2/bottle-up.png" alt="" width="304" height="1247" loading="lazy"/>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img className="full" src="/media/rosh/landing-2/bottle-up.png" alt="" width="304" height="1247" loading="lazy"/><div className="surf"/>
 </div>
 <div id="pvol" aria-hidden="true"><span className="eyebrow">Sirviendo</span><b><span id="pml">0</span><small>ml</small></b></div>
 <div id="pbuy"><span className="eyebrow">Fina selección familiar</span><h2>Una sola botella.<br/>Un solo vino.</h2><div className="sub">Zumo de uva sin alcohol · 750 ml</div>
 <ul className="chips"><li>100% natural</li><li>750 ml</li><li>0% alcohol</li></ul>
 <div className={product?"price":"price pendingPrice"}>{product?formatPrice(product.price):"Próximamente"}</div>
 <div className="row"><div className="qty"><button type="button" aria-label="Quitar una unidad" disabled={busy||quantity<=1} onClick={()=>setQuantity(q=>Math.max(1,q-1))}>−</button><output aria-label="Cantidad">{quantity}</output><button type="button" aria-label="Agregar una unidad" disabled={busy||quantity>=Math.min(12,product?.stock??12)} onClick={()=>setQuantity(q=>Math.min(12,q+1))}>+</button></div>
 <button className="buybtn" type="button" disabled={!product||product.stock<1||busy||Boolean(account.pending)||(!userId&&!guest.ready)} onClick={e=>void add(e.currentTarget)}>{busy?"Agregando…":product?.stock===0?"Agotado":"Comprar ahora"}</button></div>
 <p className="toast" role="status">{!product?"Disponible cuando se publique el producto ROSH.":account.error}</p>
 <a className="more" href="#historia2">Ver detalles →</a></div></div></section>
 <section className="night story" id="historia2" aria-label="Detalles de ROSH"><div className="inner"><span className="eyebrow">Cata · Maridaje · Origen</span><h2>Una botella, una sola historia</h2><div className="cols"><div><h3>Cata</h3><p>Frutos rojos maduros, especias suaves y un final largo y elegante.</p></div><div><h3>Maridaje</h3><p>Carnes rojas, quesos curados y cenas que se alargan.</p></div><div><h3>Origen</h3><p>{product?.origin||"Pronto compartiremos el origen de ROSH."}</p></div></div><footer>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src="/media/rosh/landing/logo.png" alt="ROSH" width="110" height="44"/><p>Zumo de uva · 100% natural · 0% alcohol</p></footer></div></section>
 </div>;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccountCart, useCartPanel } from "@/components/cart-provider";
import { useGuestCart } from "@/components/guest-cart-provider";
import type { LandingCopy } from "@/modules/products/landing-content";
import { formatPrice } from "@/lib/money";
import { RoshFooter } from "./rosh-footer";

export type PourProduct = {id:string;price:string;stock:number;origin:string};
const clamp=(v:number)=>Math.min(1,Math.max(0,v));
const ease=(v:number)=>.5-.5*Math.cos(Math.PI*clamp(v));
export function PourLanding({product,userId,copy}:{product:PourProduct|null;userId:string|null;copy:LandingCopy}){
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
  const purchaseFrame=location.hash==="#comprar"?requestAnimationFrame(()=>{root.querySelector("#comprar")?.scrollIntoView({block:"start",behavior:"instant"});paint();}):0;
  page?.addEventListener("rosh:scroll",paint);window.addEventListener("resize",paint);reduced.addEventListener("change",paint);paint();
  return ()=>{cancelAnimationFrame(purchaseFrame);page?.removeEventListener("rosh:scroll",paint);window.removeEventListener("resize",paint);reduced.removeEventListener("change",paint);delete page?.dataset.night;};
 },[]);
 const selected=product?(userId?account.data?.items:guest.items)?.find(item=>item.productId===product.id)?.quantity??0:0;
 const limit=product?Math.max(0,Math.min(12,product.stock-selected)):12;
 const amount=Math.min(quantity,Math.max(1,limit));
 async function add(trigger:HTMLButtonElement){
  if(!product||lock.current||!limit)return;
  if(panel.userId!==userId){router.refresh();return;}
  if(userId&&(guest.items.length||guest.pending)){router.push("/carrito");return;}
  lock.current=true;setBusy(true);
  try{
   for(let i=0;i<amount;i++){
    if(userId){if(!await account.command({action:"add",productId:product.id}))break;}
    else await guest.add(product.id);
   }
   panel.openCart(trigger);
  }finally{lock.current=false;setBusy(false);}
 }
 return <div ref={section} className="roshPour">
 <section className="night pour2" id="pour" aria-label="ROSH, una sola botella">
 <span id="comprar" className="landingPurchaseAnchor" aria-hidden="true" />
 <div className="st2">
 <div id="plogo" aria-hidden="true"><i className="pa"/><i className="pb2"/></div><div id="pstream" aria-hidden="true"/>
 <div id="pb" role="img" aria-label="Botella ROSH, zumo de uva sin alcohol, 750 mililitros">
 {/* Both layers compose one bottle, not separate products. */}
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img className="empty" src="/media/rosh/landing-2/bottle-up.png" alt="" width="304" height="1247" loading="lazy"/>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img className="full" src="/media/rosh/landing-2/bottle-up.png" alt="" width="304" height="1247" loading="lazy"/><div className="surf"/>
 </div>
 <div id="pvol" aria-hidden="true"><span className="eyebrow">{copy.pourLabel}</span><b><span id="pml">0</span><small>ml</small></b></div>
 <div id="pbuy"><span className="eyebrow">{copy.eyebrow}</span><h2 style={{whiteSpace:"pre-line"}}>{copy.headline}</h2><div className="sub">{copy.subtitle}</div>
 <ul className="chips">{copy.features.split("\n").filter(Boolean).map((text,i)=><li key={i}>{text}</li>)}</ul>
 <div className={product?"price":"price pendingPrice"}>{product?formatPrice(product.price):"Próximamente"}</div>
 <p className="sub">Cantidad de botellas</p><div className="row"><div className="qty"><button type="button" aria-label="Quitar una unidad" disabled={busy||amount<=1} onClick={()=>setQuantity(q=>Math.max(1,q-1))}>−</button><input disabled={busy||!limit} aria-label="Cantidad de botellas" type="number" min="1" max={Math.max(1,limit)} value={amount} onChange={e=>setQuantity(Math.max(1,Math.min(Math.max(1,limit),Math.trunc(Number(e.target.value)||1))))}/><button type="button" aria-label="Agregar una unidad" disabled={busy||amount>=limit} onClick={()=>setQuantity(q=>Math.min(Math.max(1,limit),q+1))}>+</button></div>
 <button className="buybtn" type="button" disabled={!product||!limit||busy||Boolean(account.pending)||(!userId&&!guest.ready)} onClick={e=>void add(e.currentTarget)}>{busy?"Agregando…":product?.stock===0?"Agotado":copy.buyLabel}</button></div>
 {product&&<p className="sub" role="status">{product.stock} botellas disponibles · {selected} en tu carrito</p>}
 <p className="toast" role="status">{!product?"Disponible cuando se publique el producto ROSH.":account.error}</p>
 <a className="more" href="#historia2">{copy.detailsLabel}</a></div></div></section>
 <section className="night story" id="historia2" aria-label="Detalles de ROSH"><div className="inner"><span className="eyebrow">{copy.storyEyebrow}</span><h2>{copy.storyTitle}</h2><div className="cols"><div><h3>{copy.cataTitle}</h3><p>{copy.cata}</p></div><div><h3>{copy.maridajeTitle}</h3><p>{copy.maridaje}</p></div><div><h3>{copy.originTitle}</h3><p>{copy.origin}</p></div></div><RoshFooter text={copy.footer} /></div></section>
 </div>;
}

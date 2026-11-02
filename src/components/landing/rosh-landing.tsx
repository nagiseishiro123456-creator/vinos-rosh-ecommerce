"use client";

import Image from "next/image";
import Link from "next/link";
import { LogIn, Menu, Phone, ShoppingCart, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useAccountCart, useCartPanel } from "@/components/cart-provider";
import { useGuestCart } from "@/components/guest-cart-provider";
import { GrapeMedia } from "./grape-media";
import { LANDING_ASSETS, type LandingMediaItem } from "./landing-media";
import { PourLanding, type PourProduct } from "./pour-landing";
import { useLandingIntro } from "./landing-intro";

type Props = { product?: PourProduct | null; userId: string | null; isAuthenticated: boolean; isAdmin: boolean; phone: string | null; media?: readonly LandingMediaItem[] };

export function RoshLanding({ userId, isAuthenticated, isAdmin, phone, media, product }: Props) {
  const root = useRef<HTMLElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const guest = useGuestCart();
  const account = useAccountCart();
  const panel = useCartPanel();
  const router = useRouter();
  const mismatch = userId !== panel.userId;
  useEffect(() => { if (mismatch) router.refresh(); }, [mismatch, router]);
  useLandingIntro(root, slot);
  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && !menuButton.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); menuButton.current?.focus(); }
    };
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("pointerdown", dismiss); window.removeEventListener("keydown", key); };
  }, [menuOpen]);
  const count = isAuthenticated ? mismatch ? 0 : account.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
    : [...guest.items, ...(guest.pending?.items ?? [])].reduce((sum, item) => sum + item.quantity, 0);
  const accountHref = isAdmin ? "/admin" : "/mi-cuenta";
  const validPhone = /^\+?\d{9,15}$/.test(phone ?? "");
  const callHref = validPhone ? `tel:${phone}` : "/contacto";
  const loginHref = isAuthenticated ? accountHref : "/iniciar-sesion";
  const loginLabel = isAuthenticated ? "Mi cuenta" : "Iniciar sesión";
  function openCart(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); setMenuOpen(false);
    if (mismatch) { router.refresh(); return; }
    panel.openCart(event.currentTarget);
  }
  function finishIntro() { root.current?.dispatchEvent(new Event("rosh:skip-intro")); }

  return <main ref={root} className="roshLanding" id="inicio" data-phase="boot" data-intro="boot" data-animate="false">
    <h1 className="landingSrOnly">ROSH · Vino de uvas sin alcohol</h1>
    <a className="landingSkip" href="#landing-scene" onClick={finishIntro}>Saltar animación</a>
    <header className="siteHeader landingHeader">
      <div className="landingHeaderLeft"><div ref={slot} className="landingLogoSlot" aria-hidden="true" />
        <div className="landingHeaderReveal landingDesktopNav"><span className="landingSeparator" aria-hidden="true" /><Link className="landingHistory" href="/nuestra-historia">Nuestra historia</Link></div>
      </div>
      <div className="landingHeaderReveal landingHeaderRight">
        <a className="landingIcon landingDesktopIcon" href={callHref} aria-label={validPhone ? "Llamar a ROSH" : "Contactar a ROSH"}><Phone size={22} strokeWidth={1.8} aria-hidden="true" /></a>
        <Link className="landingIcon landingDesktopIcon" href={accountHref} aria-label={isAdmin ? "Administración" : "Mi cuenta"}><UserRound size={22} strokeWidth={1.8} aria-hidden="true" /></Link>
        <Link className="cartButton landingIcon landingCart" href="/carrito" aria-label={`Carrito de compras: ${count} unidades`} aria-haspopup="dialog" aria-controls="cart-drawer" aria-expanded={panel.isOpen} onClick={openCart}>
          <ShoppingCart size={22} strokeWidth={1.8} aria-hidden="true" />
          {count > 0 ? <span className="cartCount landingCartBadge" key={count} aria-hidden="true">{count > 9 ? "9+" : count}</span> : null}
        </Link>
        <span className="landingSeparator landingLoginSeparator" aria-hidden="true" />
        <Link className="landingLogin" href={loginHref} aria-label={loginLabel}><LogIn size={22} strokeWidth={1.8} aria-hidden="true" /><span>{loginLabel}</span></Link>
        <button ref={menuButton} className="landingIcon landingMenuButton" type="button" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen} aria-controls="landing-mobile-navigation" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}</button>
      </div>
      {menuOpen ? <div ref={menu} className="landingMobileMenu" id="landing-mobile-navigation"><nav aria-label="Navegación móvil"><Link href="/nuestra-historia" onClick={() => setMenuOpen(false)}>Nuestra historia</Link><a href={callHref} onClick={() => setMenuOpen(false)}>{validPhone ? "Llamar" : "Contacto"}</a><Link href={loginHref} onClick={() => setMenuOpen(false)}>{loginLabel}</Link></nav></div> : null}
    </header>
    <a className="landingLogo" href="#inicio" aria-label="Ir al inicio de ROSH" onClick={(event) => { event.preventDefault(); finishIntro(); window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }}><Image src={`${LANDING_ASSETS}/logo.png`} alt="ROSH" width={640} height={253} unoptimized preload /></a>
    <section className="landingScene" id="landing-scene" aria-label="Vino ROSH, un único producto">
      <Image className="landingBottle" src={`${LANDING_ASSETS}/bottle.png`} alt="Botella Rosh, vino de uvas sin alcohol" width={570} height={810} sizes="(max-width: 820px) 80vw, 50vw" unoptimized preload />
      <div className="landingStage"><GrapeMedia media={media} /></div>
    </section>
    <div className="landingNightTransition" aria-hidden="true" /><PourLanding product={product ?? null} userId={userId} />
    <span className="landingSrOnly" role="status" aria-live="polite">Carrito, {count} {count === 1 ? "unidad" : "unidades"}</span>
  </main>;
}

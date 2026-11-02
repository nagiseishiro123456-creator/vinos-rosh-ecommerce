"use client";

import { LogIn, Menu, Phone, ShoppingCart, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent, type RefObject } from "react";
import { useAccountCart, useCartPanel } from "./cart-provider";
import { BrandLogo } from "./brand-logo";
import { useGuestCart } from "./guest-cart-provider";
import { SignOutButton } from "./sign-out-button";
import { PUBLIC_DESKTOP_NAVIGATION, PUBLIC_NAVIGATION } from "@/lib/public-navigation";

type SiteHeaderProps = {
  userId: string | null;
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  phone?: string | null;
  logoSlotRef?: RefObject<HTMLDivElement | null>;
};

export function SiteHeader({ userId, isAuthenticated = false, isAdmin = false, phone = null, logoSlotRef }: SiteHeaderProps) {
  const guest = useGuestCart(), account = useAccountCart(), panel = useCartPanel();
  const pathname = usePathname(), router = useRouter();
  const menu = useRef<HTMLDivElement>(null), menuButton = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false), [scrolled, setScrolled] = useState(false);
  const mismatch = userId !== panel.userId;
  useEffect(() => { if (mismatch) router.refresh(); }, [mismatch, router]);
  useEffect(() => {
    if (logoSlotRef) return; // The landing intro owns its scroll listener and adaptive surface.
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [logoSlotRef]);
  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node) && !menuButton.current?.contains(event.target as Node)) setMenuOpen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); menuButton.current?.focus(); } };
    const resize = () => { if (window.innerWidth > 1100) setMenuOpen(false); };
    window.addEventListener("pointerdown", dismiss); window.addEventListener("keydown", key); window.addEventListener("resize", resize);
    return () => { window.removeEventListener("pointerdown", dismiss); window.removeEventListener("keydown", key); window.removeEventListener("resize", resize); };
  }, [menuOpen]);
  const count = isAuthenticated ? mismatch ? 0 : account.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
    : [...guest.items, ...(guest.pending?.items ?? [])].reduce((sum, item) => sum + item.quantity, 0);
  const accountHref = isAdmin ? "/admin" : "/mi-cuenta";
  const validPhone = /^\+?\d{9,15}$/.test(phone ?? "");
  const callHref = validPhone ? `tel:${phone}` : "/contacto";
  const loginHref = isAuthenticated ? accountHref : "/iniciar-sesion";
  const loginLabel = isAuthenticated ? isAdmin ? "Administración" : "Mi cuenta" : "Iniciar sesión";
  function openCart(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); setMenuOpen(false);
    if (mismatch) { router.refresh(); return; }
    panel.openCart(event.currentTarget);
  }
  return <>
    <header className={`siteHeader landingHeader publicHeader${scrolled ? " siteHeaderScrolled" : ""}`} data-landing={logoSlotRef ? "true" : "false"}>
      <div className="landingHeaderLeft">
        {logoSlotRef ? <div ref={logoSlotRef} className="landingLogoSlot" aria-hidden="true" /> : <Link className="landingLogoSlot publicHeaderBrand" href="/#inicio" aria-label="Ir al inicio de Vinos ROSH"><BrandLogo /></Link>}
        <nav className="landingHeaderReveal landingDesktopNav" aria-label="Navegación principal"><span className="landingSeparator" aria-hidden="true" />{PUBLIC_DESKTOP_NAVIGATION.map(item => <Link key={item.href} className="landingHistory" href={item.href} aria-current={pathname === item.path ? "page" : undefined}>{item.label}</Link>)}</nav>
      </div>
      <div className="landingHeaderReveal landingHeaderRight">
        <a className="landingIcon landingDesktopIcon" href={callHref} aria-label={validPhone ? "Llamar a ROSH" : "Contactar a ROSH"}><Phone size={22} strokeWidth={1.8} aria-hidden="true" /></a>
        <Link className="landingIcon landingDesktopIcon" href={accountHref} aria-label={isAdmin ? "Administración" : "Mi cuenta"}><UserRound size={22} strokeWidth={1.8} aria-hidden="true" /></Link>
        <Link className="cartButton landingIcon landingCart" href="/carrito" aria-label={`Carrito de compras: ${count} unidades`} aria-haspopup="dialog" aria-controls="cart-drawer" aria-expanded={panel.isOpen} onClick={openCart}><ShoppingCart size={22} strokeWidth={1.8} aria-hidden="true" />{count > 0 && <span className="cartCount landingCartBadge" key={count} aria-hidden="true">{count > 9 ? "9+" : count}</span>}</Link>
        <span className="landingSeparator landingLoginSeparator" aria-hidden="true" />
        {isAuthenticated && <SignOutButton className="landingLogin landingDesktopSignOut" />}
        <Link className={`landingLogin${isAuthenticated ? " landingMobileAccount" : ""}`} href={loginHref} aria-label={loginLabel}><LogIn size={22} strokeWidth={1.8} aria-hidden="true" /><span>{loginLabel}</span></Link>
        <button ref={menuButton} className="landingIcon landingMenuButton" type="button" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen} aria-controls="public-mobile-navigation" onClick={() => setMenuOpen(open => !open)}>{menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}</button>
      </div>
      {menuOpen && <div ref={menu} className="landingMobileMenu" id="public-mobile-navigation"><nav aria-label="Navegación móvil">{PUBLIC_NAVIGATION.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.path ? "page" : undefined} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}{validPhone && <a href={callHref} onClick={() => setMenuOpen(false)}>Llamar a ROSH</a>}<Link href={loginHref} onClick={() => setMenuOpen(false)}>{loginLabel}</Link>{isAuthenticated && <SignOutButton className="publicMenuSignOut" />}</nav></div>}
    </header>
    <span className="sr-only" role="status" aria-live="polite">Carrito, {count} {count === 1 ? "unidad" : "unidades"}</span>
  </>;
}

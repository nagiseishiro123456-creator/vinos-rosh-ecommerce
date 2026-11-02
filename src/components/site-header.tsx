"use client";

import {
  Grape,
  Home,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useAccountCart, useCartPanel } from "./cart-provider";

import { BrandLogo } from "@/components/brand-logo";
import { useGuestCart } from "@/components/guest-cart-provider";
import { SignOutButton } from "@/components/sign-out-button";

type SiteHeaderProps = {
  userId: string | null;
  isAuthenticated?: boolean;
  isAdmin?: boolean;
};

export function SiteHeader({
  userId,
  isAuthenticated = false,
  isAdmin = false,
}: SiteHeaderProps) {
  const guest = useGuestCart();
  const pathname = usePathname();
  const menuButton = useRef<HTMLButtonElement>(null);
  const account = useAccountCart(); const panel = useCartPanel(); const router = useRouter();
  const ownerMismatch = userId !== panel.userId;
  useEffect(() => { if (ownerMismatch) router.refresh(); }, [ownerMismatch, router]);
  const count = isAuthenticated ? ownerMismatch ? 0 : account.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
    : [...guest.items, ...(guest.pending?.items ?? [])].reduce((sum, item) => sum + item.quantity, 0);
  function openCart(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); setMenuOpen(false);
    if (ownerMismatch) { router.refresh(); return; }
    panel.openCart(event.currentTarget);
  }
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); menuButton.current?.focus(); }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const accountHref = isAdmin ? "/admin" : "/mi-cuenta";

  return (
    <>
      <header className={`siteHeader${scrolled ? " siteHeaderScrolled" : ""}`}>
        <div className="siteHeaderInner shell">
          <Link className="siteBrand" href="/" aria-label="Ir al inicio de Vinos ROSH">
            <BrandLogo light />
          </Link>

          <nav className="desktopNav" aria-label="Navegación principal">
            <Link href="/#inicio" aria-current={pathname === "/" ? "page" : undefined}>Inicio</Link>
            <Link href="/productos" aria-current={pathname.startsWith("/productos") ? "page" : undefined}>Producto</Link>
            <Link href="/envios" aria-current={pathname === "/envios" ? "page" : undefined}>Envíos</Link>
            <Link href="/nuestra-historia" aria-current={pathname === "/nuestra-historia" ? "page" : undefined}>Nuestra historia</Link>
            <Link href="/contacto" aria-current={pathname === "/contacto" ? "page" : undefined}>Contacto</Link>
          </nav>

          <div className="headerActions">
            <Link className="iconButton desktopOnly" href="/productos" aria-label="Ver producto">
              <Search size={19} aria-hidden="true" />
            </Link>
            <Link className="iconButton desktopOnly" href={accountHref} aria-label={isAdmin ? "Administración" : "Mi cuenta"}>
              <UserRound size={19} aria-hidden="true" />
            </Link>
            <Link className="cartButton" href="/carrito" aria-haspopup="dialog" aria-controls="cart-drawer" aria-expanded={panel.isOpen} onClick={openCart} aria-label={`Carrito de compras: ${count} productos`}>
              <ShoppingBag size={19} aria-hidden="true" />
              {count > 0 ? <span className="cartCount" aria-hidden="true">{count}</span> : null}
            </Link>
            {isAuthenticated ? (
              <SignOutButton className="headerLogin desktopOnly" />
            ) : (
              <Link className="headerLogin desktopOnly" href="/iniciar-sesion">Iniciar sesión</Link>
            )}
            <button
              ref={menuButton}
              className="mobileMenuButton"
              type="button"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <X size={23} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav id="mobile-navigation" className="mobileNav" aria-label="Navegación móvil">
            <Link href="/#inicio" onClick={() => setMenuOpen(false)}>Inicio</Link>
            <Link href="/productos" onClick={() => setMenuOpen(false)}>Ver producto</Link>
            <Link href="/envios" onClick={() => setMenuOpen(false)}>Cobertura y tarifas de envío</Link>
            <Link href="/nuestra-historia" onClick={() => setMenuOpen(false)}>Nuestra historia</Link>
            <Link href="/contacto" onClick={() => setMenuOpen(false)}>Contacto</Link>
            {isAdmin ? <Link href="/admin" onClick={() => setMenuOpen(false)}>Administración</Link> : null}
            <Link href="/mi-cuenta" onClick={() => setMenuOpen(false)}>Mi cuenta</Link>
            {isAuthenticated ? <SignOutButton className="mobileSignOut" /> : <Link href="/iniciar-sesion" onClick={() => setMenuOpen(false)}>Iniciar sesión</Link>}
          </nav>
        ) : null}
      </header>

      <nav className="mobileBottomNav" aria-label="Accesos rápidos">
        <Link href="/">
          <Home size={20} aria-hidden="true" />
          <span>Inicio</span>
        </Link>
        <Link href="/productos">
          <Grape size={20} aria-hidden="true" />
          <span>Producto</span>
        </Link>
        <Link className="mobileBottomCart" href="/carrito" aria-haspopup="dialog" aria-controls="cart-drawer" aria-expanded={panel.isOpen} onClick={openCart}>
          <span className="mobileBottomCartIcon">
            <ShoppingBag size={21} aria-hidden="true" />
            {count > 0 ? <small>{count}</small> : null}
          </span>
          <span>Carrito</span>
        </Link>
        <Link href={isAuthenticated ? accountHref : "/iniciar-sesion"}>
          <UserRound size={20} aria-hidden="true" />
          <span>{isAuthenticated ? (isAdmin ? "Admin" : "Cuenta") : "Ingresar"}</span>
        </Link>
      </nav>
    </>
  );
}

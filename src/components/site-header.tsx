"use client";

import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type SiteHeaderProps = {
  cartCount?: number;
  isAuthenticated?: boolean;
  isAdmin?: boolean;
};

export function SiteHeader({
  cartCount = 0,
  isAuthenticated = false,
  isAdmin = false,
}: SiteHeaderProps) {
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
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className={`siteHeader${scrolled ? " siteHeaderScrolled" : ""}`}>
      <div className="siteHeaderInner shell">
        <Link className="siteBrand" href="/" aria-label="Ir al inicio de Vinos ROSH">
          <span>VINOS</span>
          <strong>ROSH</strong>
        </Link>

        <nav className="desktopNav" aria-label="Navegación principal">
          <Link href="/#inicio">Inicio</Link>
          <Link href="/productos">Productos</Link>
          <Link href="/#historia">Nuestra historia</Link>
          <Link href="/#contacto">Contacto</Link>
        </nav>

        <div className="headerActions">
          <Link className="iconButton desktopOnly" href="/productos" aria-label="Buscar productos">
            <Search size={19} aria-hidden="true" />
          </Link>
          <Link className="iconButton desktopOnly" href={isAdmin ? "/admin" : "/mi-cuenta"} aria-label={isAdmin ? "Administración" : "Mi cuenta"}>
            <UserRound size={19} aria-hidden="true" />
          </Link>
          <Link className="cartButton" href="/carrito" aria-label={`Carrito de compras: ${cartCount} productos`}>
            <ShoppingBag size={19} aria-hidden="true" />
            {cartCount > 0 ? <span className="cartCount" aria-hidden="true">{cartCount}</span> : null}
          </Link>
          <Link className="headerLogin desktopOnly" href={isAuthenticated ? (isAdmin ? "/admin" : "/mi-cuenta") : "/iniciar-sesion"}>
            {isAuthenticated ? (isAdmin ? "Administrar" : "Mi cuenta") : "Iniciar sesión"}
          </Link>
          <button
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
          <Link href="/productos" onClick={() => setMenuOpen(false)}>Buscar y ver productos</Link>
          <Link href="/#historia" onClick={() => setMenuOpen(false)}>Nuestra historia</Link>
          <Link href="/#contacto" onClick={() => setMenuOpen(false)}>Contacto</Link>
          {isAdmin ? <Link href="/admin" onClick={() => setMenuOpen(false)}>Administración</Link> : null}
          <Link href="/mi-cuenta" onClick={() => setMenuOpen(false)}>Mi cuenta</Link>
          {!isAuthenticated ? <Link href="/iniciar-sesion" onClick={() => setMenuOpen(false)}>Iniciar sesión</Link> : null}
        </nav>
      ) : null}
    </header>
  );
}

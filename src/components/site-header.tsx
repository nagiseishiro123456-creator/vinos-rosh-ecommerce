"use client";

import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`siteHeader${scrolled ? " siteHeaderScrolled" : ""}`}>
      <div className="siteHeaderInner shell">
        <Link className="siteBrand" href="/" aria-label="Ir al inicio de Vinos ROSH">
          <span>VINOS</span>
          <strong>ROSH</strong>
        </Link>

        <nav className="desktopNav" aria-label="Navegación principal">
          <Link href="/#inicio">Inicio</Link>
          <Link href="/#productos">Productos</Link>
          <Link href="/#historia">Nuestra historia</Link>
          <Link href="/#contacto">Contacto</Link>
        </nav>

        <div className="headerActions">
          <button className="iconButton desktopOnly" type="button" aria-label="Buscar">
            <Search size={19} />
          </button>
          <Link className="iconButton desktopOnly" href="/mi-cuenta" aria-label="Mi cuenta">
            <UserRound size={19} />
          </Link>
          <Link className="cartButton" href="/carrito" aria-label="Carrito de compras">
            <ShoppingBag size={19} />
            <span className="cartCount" aria-label="0 productos en el carrito">0</span>
          </Link>
          <Link className="headerLogin desktopOnly" href="/iniciar-sesion">
            Iniciar sesión
          </Link>
          <button
            className="mobileMenuButton"
            type="button"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav className="mobileNav" aria-label="Navegación móvil">
          <Link href="/#inicio" onClick={() => setMenuOpen(false)}>Inicio</Link>
          <Link href="/#productos" onClick={() => setMenuOpen(false)}>Productos</Link>
          <Link href="/#historia" onClick={() => setMenuOpen(false)}>Nuestra historia</Link>
          <Link href="/#contacto" onClick={() => setMenuOpen(false)}>Contacto</Link>
          <Link href="/mi-cuenta" onClick={() => setMenuOpen(false)}>Mi cuenta</Link>
          <Link href="/iniciar-sesion" onClick={() => setMenuOpen(false)}>Iniciar sesión</Link>
        </nav>
      ) : null}
    </header>
  );
}

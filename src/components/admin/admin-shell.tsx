"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, CreditCard, DatabaseBackup, LayoutDashboard, MailCheck, Menu, MessageSquare, Package, ReceiptText, Rocket, Search, Settings2, ShoppingBag, Star, Truck, Users, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { SignOutButton } from "@/components/sign-out-button";
import { ADMIN_NAVIGATION, currentAdminItem } from "@/modules/admin/navigation";

const icons = { dashboard: LayoutDashboard, product: Package, orders: ShoppingBag, customers: Users, payments: CreditCard, settlements: ReceiptText, notifications: MailCheck, shipping: Truck, history: BookOpen, reviews: Star, contacts: MessageSquare, settings: Settings2, launch: Rocket, backup: DatabaseBackup };

export function AdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = currentAdminItem(pathname);
  const paymentsArea = active?.href === "/admin/pagos" || (active && "parent" in active && active.parent === "/admin/pagos");
  const dialog = useRef<HTMLDialogElement>(null);
  const previousOverflow = useRef<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();

  function restoreScroll() {
    if (previousOverflow.current !== null) { document.body.style.overflow = previousOverflow.current; previousOverflow.current = null; }
  }
  function closeMenu() { dialog.current?.close(); restoreScroll(); }
  function openMenu() {
    if (!dialog.current || dialog.current.open) return;
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current.showModal(); setMenuOpen(true);
  }
  useEffect(() => { dialog.current?.close(); }, [pathname]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const resize = () => { if (media.matches) dialog.current?.close(); };
    media.addEventListener("change", resize);
    return () => { media.removeEventListener("change", resize); if (previousOverflow.current !== null) document.body.style.overflow = previousOverflow.current; };
  }, []);

  function sidebar(mobile = false) {
    return <>
      <div className="adminSidebarBrand"><Link href="/admin" aria-label="Panel de administración ROSH" onClick={closeMenu}><BrandLogo /><span>Administración</span></Link>{mobile && <button type="button" className="adminIconButton" onClick={closeMenu} aria-label="Cerrar menú administrativo"><X size={20} /></button>}</div>
      <nav className="adminSidebarNav" aria-label="Sesión administrativa">{ADMIN_NAVIGATION.map(group => <div className="adminNavGroup" key={group.title}><p>{group.title}</p>{group.items.filter(item => !("parent" in item) || paymentsArea).map(item => {
        const Icon = icons[item.icon], current = active?.href === item.href;
        return <Link key={item.href} href={item.href} onClick={closeMenu} className={`adminNavItem ${"parent" in item ? "adminNavChild" : ""}`} aria-current={current ? "page" : undefined}><Icon size={19} strokeWidth={1.7} aria-hidden="true" /><span>{item.label}</span>{current && <span className="adminNavDot" aria-hidden="true" />}</Link>;
      })}</div>)}</nav>
      <div className="adminSidebarBottom"><span className="adminSidebarNote">ROSH · Gestión de la tienda</span><SignOutButton className="adminExitButton" /></div>
    </>;
  }

  return <div className="adminWorkspace">
    <a className="adminSkipLink" href="#admin-content">Saltar al contenido</a>
    <aside className="adminSidebar">{sidebar()}</aside>
    <dialog ref={dialog} id="admin-mobile-menu" className="adminMobileDialog" aria-label="Menú administrativo" onCancel={event => { event.preventDefault(); closeMenu(); }} onClose={() => { if (dialog.current?.open) return; restoreScroll(); setMenuOpen(false); }} onClick={e => { if (e.target === e.currentTarget) closeMenu(); }}><div className="adminMobilePanel">{sidebar(true)}</div></dialog>
    <div className="adminMainColumn">
      <header className="adminHeader"><div className="adminHeaderInner">
        <button className="adminIconButton adminMenuToggle" type="button" aria-label="Abrir menú administrativo" aria-controls="admin-mobile-menu" aria-expanded={menuOpen} onClick={openMenu}><Menu size={22} /></button>
        <div className="adminBreadcrumb"><span>Administración</span><span aria-hidden="true">/</span><strong>{active?.label ?? "Panel"}</strong></div>
        <form action="/admin/clientes" method="get" className="adminHeaderSearch"><Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor="admin-client-search">Buscar clientes</label><input id="admin-client-search" name="q" type="search" maxLength={80} placeholder="Buscar clientes…" /><button type="submit" aria-label="Buscar clientes en el directorio"><span>Buscar</span><ArrowUpRight size={16} aria-hidden="true" /></button></form>
        <Link href="/" className="adminStoreLink">Ver tienda <ArrowUpRight size={16} aria-hidden="true" /></Link>
        <div className="adminProfile"><span className="adminAvatar" aria-hidden="true">{initials || "AD"}</span><span><strong>{name}</strong><small>Administrador</small></span></div>
      </div></header>
      <div id="admin-content" tabIndex={-1}>{children}</div>
      <footer className="adminWorkspaceFooter"><span>ROSH · Panel de administración</span><Link href="/admin/respaldo">Respaldar información <ArrowUpRight size={13} aria-hidden="true" /></Link></footer>
    </div>
  </div>;
}

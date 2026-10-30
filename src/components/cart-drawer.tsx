'use client';

import { motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import { formatPrice } from "@/lib/money";
import { AccountCart } from "./account-cart";
import { GuestCart } from "./guest-cart";
import { useAccountCart, useCartPanel } from "./cart-provider";
import { useGuestCart } from "./guest-cart-provider";
import { useGuestCartQuote } from "./guest-cart-quote-provider";

export function CartDrawer({ open, onClose, trigger }: { open: boolean; onClose: () => void; trigger: RefObject<HTMLElement | null> }) {
  const dialog = useRef<HTMLDialogElement>(null); const title = useRef<HTMLHeadingElement>(null);
  const account = useAccountCart(); const { userId } = useCartPanel(); const guest = useGuestCart(); const quote = useGuestCartQuote();
  const initialReduced = useReducedMotion();
  const [reduced, setReduced] = useState(() => initialReduced ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(preference.matches);
    preference.addEventListener("change", change);
    return () => preference.removeEventListener("change", change);
  }, []);
  const [desktop, setDesktop] = useState(() => window.matchMedia("(min-width: 768px)").matches);
  useEffect(() => { const media = window.matchMedia("(min-width: 768px)"); const change = () => setDesktop(media.matches);
    media.addEventListener("change", change); return () => media.removeEventListener("change", change); }, []);
  useEffect(() => {
    if (!open || !dialog.current || dialog.current.open) return;
    const element = dialog.current;
    const y = window.scrollY, x = window.scrollX, path = window.location.pathname;
    const overflow = document.body.style.overflow, padding = document.body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const originalPadding = Number.parseFloat(getComputedStyle(document.body).paddingRight) || 0;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = String(originalPadding + gap) + "px";
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !element.open) return;
      const controls = Array.from(element.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]"))
        .filter((control) => control.tabIndex >= 0 && control.getClientRects().length > 0 && getComputedStyle(control).visibility !== "hidden");
      const first = controls[0], last = controls[controls.length - 1], active = document.activeElement;
      if (!first) { event.preventDefault(); title.current?.focus({ preventScroll: true }); return; }
      if (event.shiftKey && (active === first || active === title.current || !element.contains(active))) {
        event.preventDefault(); last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (active === last || !element.contains(active))) {
        event.preventDefault(); first.focus({ preventScroll: true });
      }
    };
    document.addEventListener("keydown", containFocus, true);
    // Closing/unmounting must release the native modal even if an animation is interrupted.
    const cleanup = () => {
      element.close();
      document.removeEventListener("keydown", containFocus, true);
      document.body.style.overflow = overflow; document.body.style.paddingRight = padding;
      if (window.location.pathname !== path) return;
      const target = trigger.current?.isConnected ? trigger.current : document.querySelector<HTMLElement>("main h1") ?? document.querySelector<HTMLElement>(".cartButton");
      target?.focus({ preventScroll: true }); window.scrollTo({ top: y, left: x, behavior: "instant" });
    };
    element.showModal(); title.current?.focus({ preventScroll: true });
    return cleanup;
  }, [open, trigger]);
  const mergePending = Boolean(userId && (!guest.ready || guest.items.length || guest.pending));
  const subtotal = userId ? account.status === "idle" ? account.data?.subtotal : undefined
    : guest.ready && !guest.items.length ? "0.00" : quote.quote?.subtotal;
  const canContinue = !mergePending && (userId ? account.status === "idle" && !account.pending && Boolean(account.data?.items.length)
    && !account.data?.hasInvalidItems && !account.data?.exceedsOrderLimit
    : guest.ready && Boolean(guest.items.length) && Boolean(quote.quote) && !quote.pending && !quote.error && !quote.quote?.exceedsOrderLimit && !guest.pending);
  return <dialog ref={dialog} id="cart-drawer" className="cartDialog" aria-labelledby="cart-drawer-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
      else if (event.target instanceof Element && event.target.closest("a") && event.button === 0
        && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) onClose();
    }}>
      {open ? <motion.section key="cart-panel" className="cartDrawerPanel flex h-full w-full max-w-[30rem] flex-col bg-[var(--paper)] text-[var(--ink)] shadow-2xl"
        data-reduced-motion={reduced ? "true" : "false"}
        initial={{ opacity: reduced ? 1 : .9, x: !reduced && desktop ? 20 : 0 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduced ? 0 : .16, ease: "easeOut" }}>
        <header className="cartDrawerHeader"><div><p className="eyebrow wine">ROSH · TU COMPRA</p><h2 ref={title} id="cart-drawer-title" tabIndex={-1}>Tu carrito</h2></div>
          <button className="drawerClose" type="button" aria-label="Cerrar carrito" onClick={onClose}><X size={22} aria-hidden="true" /></button></header>
        <div className="cartDrawerBody min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {mergePending ? <div className="checkoutWarningPanel"><strong>Conservamos tu selección.</strong><p>Revisa su integración con tu cuenta antes de continuar.</p>
            <Link className="button buttonDark" href="/carrito">Revisar integración</Link></div>
            : userId ? <AccountCart variant="drawer" /> : <GuestCart variant="drawer" />}
        </div>
        <footer className="cartDrawerFooter">
          <div className="summaryTotal"><span>Total parcial</span><strong>{subtotal && !mergePending ? formatPrice(subtotal) : "Por verificar"}</strong></div>
          <p className="summaryNote">Envío calculado antes del pago. Aún no reservaste stock.</p>
          {canContinue ? <Link className="button buttonPrimary fullButton" href={userId ? "/checkout" : "/iniciar-sesion?callbackUrl=/carrito"}>
            {userId ? "Continuar al checkout" : "Ingresar para continuar"}</Link>
            : <button className="button buttonDisabled fullButton" type="button" disabled>{mergePending ? "Revisa la integración para continuar" : "Verifica tu selección para continuar"}</button>}
          <div className="drawerFooterLinks"><Link className="textLink" href="/carrito">Ver carrito completo</Link>
            <button type="button" className="textLink" onClick={onClose}>Continuar comprando</button></div>
        </footer>
      </motion.section> : null}
  </dialog>;
}

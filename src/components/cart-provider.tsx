"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createAccountCartStore } from "@/modules/cart/account-store";
import type { AccountCartSnapshot } from "@/modules/cart/account-contract";

const Drawer = dynamic(() => import("./cart-drawer").then((module) => module.CartDrawer), { ssr: false });
type ContextValue = { userId: string | null; store: ReturnType<typeof createAccountCartStore>;
  isOpen: boolean; openCart: (trigger?: HTMLElement) => void; closeCart: () => void };
const Context = createContext<ContextValue | null>(null);
export function CartProvider({ userId, initial, children }: { userId: string | null; initial: AccountCartSnapshot | null; children: ReactNode }) {
  const router = useRouter(); const pathname = usePathname();
  const [store] = useState(() => createAccountCartStore(userId, initial, { onChange: () => router.refresh() }));
  const [isOpen, setOpen] = useState(false); const [activated, setActivated] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const trigger = useRef<HTMLElement | null>(null);
  const observedPath = useRef(pathname);
  useEffect(() => {
    if (observedPath.current === pathname) return;
    observedPath.current = pathname; void store.refresh();
  }, [pathname, store]);
  if (lastPath !== pathname) { setLastPath(pathname); setOpen(false); }
  useEffect(() => { store.adopt(initial); }, [store, initial]);
  const closeCart = () => setOpen(false);
  const openCart = (element?: HTMLElement) => {
    trigger.current = element ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setActivated(true); setOpen(true); void store.refresh();
  };
  return <Context.Provider value={{ userId, store, isOpen, openCart, closeCart }}>
    {children}
    {activated ? <Drawer open={isOpen} onClose={closeCart} trigger={trigger} /> : null}
  </Context.Provider>;
}
export function useCartPanel() { const value = useContext(Context); if (!value) throw new Error("CartProvider required"); return value; }
export function useAccountCart() {
  const { store, userId } = useCartPanel();
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return { ...state, userId, command: store.command, refresh: store.refresh, retry: store.retry };
}

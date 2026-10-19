"use client";

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";

import { createGuestCartStore } from "@/modules/cart/guest-store";

const GuestCartContext = createContext<ReturnType<typeof createGuestCartStore> | null>(null);

export function GuestCartProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createGuestCartStore());
  return <GuestCartContext.Provider value={store}>{children}</GuestCartContext.Provider>;
}

export function useGuestCart() {
  const store = useContext(GuestCartContext);
  if (!store) throw new Error("GuestCartProvider is required");
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return { ...snapshot, add: store.add, update: store.update, remove: store.remove,
    replace: store.replace, getSnapshot: store.getSnapshot };
}

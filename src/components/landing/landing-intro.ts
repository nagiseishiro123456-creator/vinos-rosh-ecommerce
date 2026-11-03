"use client";

import { useLayoutEffect, type RefObject } from "react";

// A full entry/reload gets its presentation. Client navigation within this document does not.
// Older sessionStorage markers must not hide the intro on later visits in the same tab.
const presentedDocuments = new WeakSet<Document>();

/** Own only this scene's data attributes. Never overwrite the cart's body scroll lock. */
export function useLandingIntro(rootRef: RefObject<HTMLElement | null>, slotRef: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    const slot = slotRef.current;
    if (!root || !slot) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let introFrame = 0;
    let layoutFrame = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function place() {
      if (!root || !slot || disposed) return;
      const width = Math.min(window.innerWidth * .72, 640);
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - width * 253 / 640) / 2;
      const target = slot.getBoundingClientRect();
      const scale = target.width / width;
      root.style.setProperty("--logo-width", `${width}px`);
      root.style.setProperty("--logo-left", `${left}px`);
      root.style.setProperty("--logo-top", `${top}px`);
      root.style.setProperty("--logo-dx", `${target.left - left}px`);
      root.style.setProperty("--logo-dy", `${target.top + (target.height - width * 253 / 640 * scale) / 2 - top}px`);
      root.style.setProperty("--logo-scale", `${scale}`);
    }
    function remember() {
      presentedDocuments.add(root!.ownerDocument);
    }
    function finish(immediate = true) {
      if (!root || disposed) return;
      cancelAnimationFrame(introFrame);
      for (const timer of timers) clearTimeout(timer);
      if (immediate) root.dataset.animate = "false";
      place();
      root.dataset.phase = "final";
      root.dataset.intro = "done";
      remember();
    }
    const schedulePlace = () => {
      cancelAnimationFrame(layoutFrame);
      layoutFrame = requestAnimationFrame(() => { place(); root?.dispatchEvent(new Event("rosh:scroll")); });
    };
    const resize = () => {
      if (root.dataset.intro === "playing") finish();
      else schedulePlace();
    };
    const preference = () => { if (reduced.matches) finish(); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape" && root.dataset.intro === "playing") finish(); };
    const skip = () => finish();
    const seen = presentedDocuments.has(root.ownerDocument);
    place();
    if (seen || reduced.matches || window.location.hash === "#comprar") finish();
    else {
      root.dataset.animate = "true";
      root.dataset.intro = "playing";
      root.dataset.phase = "boot";
      introFrame = requestAnimationFrame(() => {
        introFrame = requestAnimationFrame(() => { if (!disposed) root.dataset.phase = "logo"; });
      });
      for (const [delay, phase] of [[3000, "travel"], [4300, "bottle"], [5400, "header"]] as const) {
        timers.push(setTimeout(() => { if (!disposed) root.dataset.phase = phase; }, delay));
      }
      timers.push(setTimeout(() => finish(false), 6800));
    }
    root.addEventListener("rosh:skip-intro", skip);
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", schedulePlace, { passive: true });
    window.addEventListener("keydown", key);
    reduced.addEventListener("change", preference);
    const observer = new ResizeObserver(schedulePlace);
    observer.observe(document.body);
    observer.observe(slot);
    return () => {
      disposed = true;
      cancelAnimationFrame(introFrame);
      cancelAnimationFrame(layoutFrame);
      for (const timer of timers) clearTimeout(timer);
      root.dataset.intro = "done";
      root.dataset.phase = "final";
      observer.disconnect();
      root.removeEventListener("rosh:skip-intro", skip);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", schedulePlace);
      window.removeEventListener("keydown", key);
      reduced.removeEventListener("change", preference);
    };
  }, [rootRef, slotRef]);
}
